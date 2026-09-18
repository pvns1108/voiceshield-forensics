from __future__ import annotations

from fastapi import APIRouter

from app.ml.anti_spoof import (
    DECISION_THRESHOLD,
    MODEL_COMMIT,
    MODEL_INPUT_SAMPLES,
    MODEL_NAME,
    MODEL_SAMPLE_RATE,
    MODEL_SOURCE,
    AntiSpoofModel,
)

router = APIRouter(prefix="/api/v1/model-info", tags=["model-info"])


@router.get("")
def model_info():
    model = AntiSpoofModel.get()
    return {
        "model_name": MODEL_NAME,
        "source_repository": MODEL_SOURCE,
        "vendored_commit": MODEL_COMMIT,
        "license": "MIT (NAVER Corp.)",
        "training_dataset": "ASVspoof 2019 Logical Access (LA)",
        "input_sample_rate_hz": MODEL_SAMPLE_RATE,
        "input_fixed_length_samples": MODEL_INPUT_SAMPLES,
        "output_label_mapping": {"0": "spoof", "1": "bonafide"},
        "decision_threshold": DECISION_THRESHOLD,
        "threshold_note": (
            "The source repository reports EER (a threshold-independent "
            "metric) rather than a calibrated operating threshold. This "
            "deployment uses the neutral 0.5 posterior-probability "
            "midpoint and labels it as such rather than implying an "
            "officially published operating point."
        ),
        "runtime_status": "available" if model.is_available() else "unavailable",
        "unavailable_reason": model.unavailable_reason(),
        "limitations": [
            "Trained/evaluated only on ASVspoof 2019 LA data; performance "
            "on newer or unseen text-to-speech and voice-conversion "
            "systems, or on different languages/accents/channels, is not "
            "characterized by this deployment.",
            "Background noise, compression (e.g. heavy MP3/AAC/M4A "
            "encoding), short clips, and clipping can all reduce "
            "reliability.",
            "The model assesses spoof-likelihood for the whole fixed-"
            "length input window; it does not localize which portion of "
            "a longer clip is suspicious.",
            "This model targets logical-access spoofing (TTS/voice "
            "conversion). It is not a dedicated replay-attack detector; "
            "see the liveness/challenge-response feature for that "
            "threat model, where implemented.",
            "A single model score is never a substitute for human "
            "review in any high-impact decision.",
        ],
    }
