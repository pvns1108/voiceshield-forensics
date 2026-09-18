from __future__ import annotations

import time
from dataclasses import asdict
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml import features as feature_extraction
from app.ml.anti_spoof import AntiSpoofModel, ModelUnavailableError
from app.models.analysis import Analysis
from app.services.audio_ingest import UploadValidationError, probe_audio, sha256_of_file


class _StepTimer:
    def __init__(self, analysis: Analysis, db: Session):
        self.analysis = analysis
        self.db = db

    def run(self, step_name: str, fn, *args, **kwargs):
        self.analysis.status = step_name
        started = time.monotonic()
        started_at = datetime.now(timezone.utc).isoformat()
        try:
            result = fn(*args, **kwargs)
            duration_ms = (time.monotonic() - started) * 1000
            self.analysis.processing_steps = [
                *self.analysis.processing_steps,
                {
                    "step": step_name,
                    "started_at": started_at,
                    "duration_ms": round(duration_ms, 2),
                    "status": "ok",
                },
            ]
            self.db.add(self.analysis)
            self.db.commit()
            return result
        except Exception as exc:
            duration_ms = (time.monotonic() - started) * 1000
            self.analysis.processing_steps = [
                *self.analysis.processing_steps,
                {
                    "step": step_name,
                    "started_at": started_at,
                    "duration_ms": round(duration_ms, 2),
                    "status": "failed",
                    "error": str(exc),
                },
            ]
            self.db.add(self.analysis)
            self.db.commit()
            raise


def _classify_assessment(anti_spoof: dict) -> str:
    """Only ever derived from real model output. Never guesses from heuristics."""
    if anti_spoof.get("status") != "ok":
        return "unavailable"

    bonafide_p = anti_spoof["bonafide_probability"]
    threshold = anti_spoof["threshold"]
    margin = abs(bonafide_p - threshold)

    if margin < 0.15:
        return "suspicious_inconclusive"
    return "likely_human" if bonafide_p >= threshold else "likely_synthetic"


def process_analysis(analysis_id: str, db: Session) -> None:
    """Runs the full pipeline synchronously, updating DB status at each stage.

    This is intentionally a simple, transparent, in-process pipeline
    (no external broker/queue) so the demo runs anywhere without
    additional infrastructure. See README for how to swap in Celery/RQ
    for production-scale concurrent processing.
    """
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        return

    timer = _StepTimer(analysis, db)
    stored_path = settings.upload_dir / analysis.stored_filename
    print(analysis.stored_filename)

    try:
        # 1. Validate real file contents (not just extension/header)
        probe = timer.run("validating", probe_audio, stored_path)
        analysis.codec = probe["codec"]
        if probe["duration_sec"] < settings.min_duration_sec:
            raise UploadValidationError(
                f"Audio is too short ({probe['duration_sec']:.2f}s). "
                f"Minimum is {settings.min_duration_sec}s."
            )
        if probe["duration_sec"] > settings.max_duration_sec:
            raise UploadValidationError(
                f"Audio is too long ({probe['duration_sec']:.1f}s). "
                f"Maximum is {settings.max_duration_sec}s."
            )

        # 2. Preprocess: normalize to mono/16kHz for consistent analysis
        result = timer.run(
            "extracting_features",
            feature_extraction.analyze_audio_file,
            str(stored_path),
            probe["sample_rate"],
            probe["channels"],
        )

        analysis.duration_sec = result.duration_sec
        analysis.sample_rate_original = result.sample_rate_original
        analysis.sample_rate_analyzed = result.sample_rate_analyzed
        analysis.channels_original = result.channels_original
        analysis.normalized_audio_sha256 = timer.run(
            "hashing_normalized_audio",
            lambda: __import__("hashlib").sha256(
                result.normalized_waveform_16k_mono.tobytes()
            ).hexdigest(),
        )

        analysis.features = {
            "waveform": asdict(result.waveform),
            "spectrogram": asdict(result.spectrogram),
            "pitch": asdict(result.pitch),
            "energy": asdict(result.energy),
            "vad_segments": [asdict(s) for s in result.vad_segments],
        }
        analysis.forensic_indicators = asdict(result.forensic)

        # 3. Real anti-spoofing model inference (or honest unavailable state)
        def run_model_inference():
            model = AntiSpoofModel.get()
            if not model.is_available():
                return {
                    "status": "unavailable",
                    "reason": model.unavailable_reason(),
                    "model_name": "AASIST",
                }
            prediction = model.predict(result.normalized_waveform_16k_mono)
            print(prediction)
            return {
                "status": "ok",
                "model_name": prediction.model_name,
                "model_commit": prediction.model_commit,
                "bonafide_probability": round(prediction.bonafide_probability, 4),
                "spoof_probability": round(prediction.spoof_probability, 4),
                "label": prediction.label,
                "threshold": prediction.threshold,
            }

        anti_spoof_result = timer.run("model_inference", run_model_inference)
        analysis.anti_spoof_model = anti_spoof_result

        # 4. Assessment + report generation (still just aggregation of the
        #    real results above — no new invented data)
        def generate_report():
            analysis.assessment = _classify_assessment(anti_spoof_result)
            return True

        timer.run("generating_report", generate_report)

        analysis.status = "complete"
        analysis.error_message = ""
        db.add(analysis)
        db.commit()

    except UploadValidationError as exc:
        analysis.status = "failed"
        analysis.error_message = str(exc)
        analysis.assessment = "unavailable"
        db.add(analysis)
        db.commit()
    except Exception as exc:  # pragma: no cover - defensive catch-all
        analysis.status = "failed"
        analysis.error_message = f"Unexpected processing error: {exc}"
        analysis.assessment = "unavailable"
        db.add(analysis)
        db.commit()
