"""
Automatic Speech Recognition service using faster-whisper (CTranslate2).

This module provides a real speech-to-text transcription service
that runs on the actual uploaded audio. It is designed to be
independent from the existing anti-spoofing pipeline.

If faster-whisper cannot be imported/loaded in the current
environment, ASRService.is_available() returns False and
ASRService.transcribe() raises ModelUnavailableError. Callers
MUST surface this as an explicit "unavailable" state to the user —
never substitute a heuristic or random value in its place.
"""

from __future__ import annotations

import os
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

try:
    from faster_whisper import WhisperModel
    _WHISPER_AVAILABLE = True
    _WHISPER_IMPORT_ERROR = None
except Exception as e:
    _WHISPER_AVAILABLE = False
    _WHISPER_IMPORT_ERROR = e

try:
    import torch
    _CUDA_AVAILABLE = torch.cuda.is_available()
except Exception:
    _CUDA_AVAILABLE = False

_MODEL_DIR = Path(__file__).resolve().parent.parent / "ml" / "whisper_models"

_DEFAULT_MODEL = os.getenv("VOICESHIELD_ASR_MODEL", "large-v3-turbo")

_MODEL_CONFIGS: Dict[str, Dict[str, str]] = {
    "large-v3-turbo": {
        "model_size_or_path": "large-v3-turbo",
        "description": "Whisper Large-v3 Turbo - fast multilingual ASR with 100+ languages including Hindi, Indian English, and Hinglish code-switching",
        "languages": "100+ languages (English, Hindi, Indian accents, Hinglish, Bengali, Tamil, Telugu, Marathi, Gujarati, etc.)",
        "license": "MIT (OpenAI / SYSTRAN / Mobius Labs)",
    },
    "base": {
        "model_size_or_path": "base",
        "description": "Whisper Base - lightweight multilingual baseline",
        "languages": "Multilingual baseline (testing / low-memory)",
        "license": "MIT (OpenAI / SYSTRAN)",
    },
    "tiny": {
        "model_size_or_path": "tiny",
        "description": "Whisper Tiny - fastest minimal model for quick verification",
        "languages": "Multilingual baseline (fast testing)",
        "license": "MIT (OpenAI / SYSTRAN)",
    },
}


@dataclass
class WordSegment:
    """A single word with timing and confidence information."""
    word: str
    start: float
    end: float
    probability: float

    def to_dict(self) -> dict[str, Any]:
        return {
            "word": self.word,
            "start": round(self.start, 3),
            "end": round(self.end, 3),
            "probability": round(self.probability, 4) if self.probability is not None else None,
        }


@dataclass
class TranscriptionSegment:
    """A sentence or phrase level transcription segment."""
    id: int
    start: float
    end: float
    text: str
    words: List[WordSegment] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "start": round(self.start, 2),
            "end": round(self.end, 2),
            "text": self.text,
            "words": [w.to_dict() for w in self.words],
        }


@dataclass
class TranscriptionResult:
    """Structured result of speech-to-text transcription."""
    text: str
    language: str
    language_probability: float
    segments: List[TranscriptionSegment]
    words: List[WordSegment]
    model_name: str
    processing_time_ms: float
    status: str = "ok"
    error: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "text": self.text,
            "language": self.language,
            "language_probability": round(self.language_probability, 4) if self.language_probability is not None else None,
            "model_name": self.model_name,
            "processing_time_ms": round(self.processing_time_ms, 2),
            "segments": [s.to_dict() for s in self.segments],
            "words": [w.to_dict() for w in self.words],
            "error": self.error,
        }


class ModelUnavailableError(RuntimeError):
    """Raised when the ASR model cannot be loaded/run in this environment."""


class ASRService:
    """Loads faster-whisper model once and exposes real transcription inference.

    Availability is only ever determined by whether faster-whisper + the model
    actually load — never assumed.
    """

    _instance: Optional["ASRService"] = None

    def __init__(
        self,
        model_size: Optional[str] = None,
        device: Optional[str] = None,
        compute_type: Optional[str] = None,
    ):
        self.model_size = model_size or _DEFAULT_MODEL
        if device is None:
            self.device = "cuda" if _CUDA_AVAILABLE else "cpu"
        else:
            self.device = device

        if compute_type is None:
            self.compute_type = "float16" if self.device == "cuda" else "int8"
        else:
            self.compute_type = compute_type

        self._model: Optional[WhisperModel] = None
        self._unavailable_reason: Optional[str] = None
        self._try_load()

    def _try_load(self) -> None:
        """Attempt to load the Whisper model."""
        if not _WHISPER_AVAILABLE:
            self._unavailable_reason = (
                f"faster-whisper could not be loaded in this environment: {_WHISPER_IMPORT_ERROR}"
            )
            return

        try:
            # First check if local model directory exists with model.bin
            local_bin = _MODEL_DIR / "model.bin"
            part_file = _MODEL_DIR / "model.bin.part"

            if self.model_size == "large-v3-turbo" and local_bin.exists() and local_bin.stat().st_size > 1_500_000_000:
                # Load directly from our verified local weights directory
                self._model = WhisperModel(
                    model_size_or_path=str(_MODEL_DIR),
                    device=self.device,
                    compute_type=self.compute_type,
                    local_files_only=True,
                )
                self._unavailable_reason = None
                return

            if self.model_size == "large-v3-turbo" and part_file.exists() and not local_bin.exists():
                self._unavailable_reason = (
                    "Whisper large-v3-turbo weights are currently downloading. "
                    "Service will be ready once download completes."
                )
                return

            # Otherwise load by model size or name (faster-whisper will use its cache or download)
            model_id = self.model_size
            if model_id in _MODEL_CONFIGS:
                model_id = _MODEL_CONFIGS[model_id]["model_size_or_path"]

            self._model = WhisperModel(
                model_size_or_path=model_id,
                device=self.device,
                compute_type=self.compute_type,
            )
            self._unavailable_reason = None
        except Exception as exc:
            self._unavailable_reason = (
                f"Unexpected error loading Whisper model ({self.model_size}): {exc}"
            )

    def is_available(self) -> bool:
        """Return True if the ASR model is loaded and ready for inference."""
        return self._model is not None

    def unavailable_reason(self) -> Optional[str]:
        """Return reason why model is unavailable, if any."""
        return self._unavailable_reason

    def reload(self, model_size: Optional[str] = None) -> bool:
        """Attempt reloading the model (useful after background download finishes)."""
        if model_size is not None:
            self.model_size = model_size
        self._model = None
        self._unavailable_reason = None
        self._try_load()
        return self.is_available()

    def transcribe(
        self,
        waveform_16k_mono: np.ndarray,
        language: Optional[str] = None,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResult:
        """Transcribe a 16kHz mono waveform (float32, normalized in [-1, 1]).

        Args:
            waveform_16k_mono: Audio waveform as numpy array (float32, 16kHz mono).
            language: Optional ISO language code to force (e.g., "en", "hi").
                     If None, language is detected automatically.
            initial_prompt: Optional prompt to guide vocabulary or code-switching.

        Returns:
            TranscriptionResult containing text, language, segments, word timestamps.

        Raises:
            ModelUnavailableError: If the model could not be loaded.
        """
        if not self.is_available():
            # Try reloading once in case the model just finished downloading
            if not self.reload():
                raise ModelUnavailableError(
                    self._unavailable_reason or "ASR model not loaded."
                )

        # Handle empty audio
        if waveform_16k_mono is None or len(waveform_16k_mono) == 0:
            return TranscriptionResult(
                text="",
                language="unknown",
                language_probability=0.0,
                segments=[],
                words=[],
                model_name=f"whisper-{self.model_size}",
                processing_time_ms=0.0,
            )

        # Ensure float32 array
        audio = np.asarray(waveform_16k_mono, dtype=np.float32)

        start_time = time.perf_counter()

        # Run faster-whisper transcription
        # Note: task="transcribe" ensures Hindi/Hinglish is NOT translated to English!
        raw_segments, info = self._model.transcribe(
            audio,
            language=language,
            initial_prompt=initial_prompt,
            task="transcribe",
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=400),
        )

        all_segments: List[TranscriptionSegment] = []
        all_words: List[WordSegment] = []
        full_text_parts: List[str] = []

        for seg in raw_segments:
            seg_text = seg.text.strip()
            if not seg_text:
                continue

            full_text_parts.append(seg_text)
            seg_words: List[WordSegment] = []

            if hasattr(seg, "words") and seg.words:
                for w in seg.words:
                    word_obj = WordSegment(
                        word=w.word.strip(),
                        start=float(w.start),
                        end=float(w.end),
                        probability=float(getattr(w, "probability", 1.0)),
                    )
                    seg_words.append(word_obj)
                    all_words.append(word_obj)
            else:
                word_obj = WordSegment(
                    word=seg_text,
                    start=float(seg.start),
                    end=float(seg.end),
                    probability=float(getattr(seg, "avg_logprob", 0.0)),
                )
                seg_words.append(word_obj)
                all_words.append(word_obj)

            all_segments.append(
                TranscriptionSegment(
                    id=len(all_segments) + 1,
                    start=float(seg.start),
                    end=float(seg.end),
                    text=seg_text,
                    words=seg_words,
                )
            )

        full_text = " ".join(full_text_parts).strip()
        processing_time_ms = (time.perf_counter() - start_time) * 1000

        detected_lang = getattr(info, "language", language or "unknown")
        lang_prob = float(getattr(info, "language_probability", 1.0 if language else 0.0))

        return TranscriptionResult(
            text=full_text,
            language=detected_lang,
            language_probability=lang_prob,
            segments=all_segments,
            words=all_words,
            model_name=f"whisper-{self.model_size}",
            processing_time_ms=processing_time_ms,
        )

    def get_info(self) -> dict[str, Any]:
        """Return metadata about the ASR service and model configuration."""
        cfg = _MODEL_CONFIGS.get(self.model_size, {})
        return {
            "service_name": "VoiceShield ASR Service",
            "model_size": self.model_size,
            "engine": "faster-whisper (CTranslate2)",
            "device": self.device,
            "compute_type": self.compute_type,
            "runtime_status": "available" if self.is_available() else "unavailable",
            "unavailable_reason": self.unavailable_reason(),
            "description": cfg.get("description", "Multilingual ASR model"),
            "languages_supported": cfg.get("languages", "100+ languages"),
            "license": cfg.get("license", "MIT"),
            "supports_word_timestamps": True,
            "preserves_code_switching": True,
        }

    @classmethod
    def get(cls, model_size: Optional[str] = None, device: Optional[str] = None) -> "ASRService":
        """Get or create the singleton ASR service instance."""
        target_model = model_size or _DEFAULT_MODEL
        if cls._instance is None:
            cls._instance = ASRService(model_size=target_model, device=device)
        elif model_size is not None and cls._instance.model_size != model_size:
            cls._instance = ASRService(model_size=model_size, device=device)
        return cls._instance

    @classmethod
    def reset(cls) -> None:
        """Reset singleton instance (useful in testing)."""
        cls._instance = None