"""
Anti-spoofing model inference wrapper (AASIST).

This module wraps the real, vendored AASIST implementation
(app/ml/aasist_vendor/, MIT licensed, see MODEL_PROVENANCE.md).

IMPORTANT — no fabricated results:
    If PyTorch cannot be imported/loaded in the current environment,
    `AntiSpoofModel.is_available()` returns False and
    `AntiSpoofModel.predict()` raises `ModelUnavailableError`. Callers
    MUST surface this as an explicit "unavailable" state to the user —
    never substitute a heuristic or random value in its place.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

import numpy as np

_VENDOR_DIR = Path(__file__).parent / "aasist_vendor"
_WEIGHTS_PATH = _VENDOR_DIR / "weights" / "AASIST.pth"
_CONFIG_PATH = _VENDOR_DIR / "AASIST.conf"

_MODEL_CONFIG = {
    "architecture": "AASIST",
    "nb_samp": 64600,
    "first_conv": 128,
    "filts": [70, [1, 32], [32, 32], [32, 64], [64, 64]],
    "gat_dims": [64, 32],
    "pool_ratios": [0.5, 0.7, 0.5, 0.5],
    "temperatures": [2.0, 2.0, 100.0, 100.0],
}

MODEL_NAME = "AASIST"
MODEL_COMMIT = "a04c9863f63d44471dde8a6abcb3b082b07cd1d1"
MODEL_SOURCE = "https://github.com/clovaai/aasist"
MODEL_SAMPLE_RATE = 16_000
MODEL_INPUT_SAMPLES = 64_600  # ~4.04s at 16kHz, fixed by the architecture
# Decision threshold: the source repo does not publish a fixed operating
# threshold (it reports EER, a threshold-free metric). We use the
# theoretically neutral midpoint (0.5 posterior probability) and label
# it accordingly rather than implying a calibrated, published threshold.
DECISION_THRESHOLD = 0.5


class ModelUnavailableError(RuntimeError):
    """Raised when the real model cannot be loaded/run in this environment."""


@dataclass
class AntiSpoofResult:
    bonafide_probability: float  # 0..1, from real softmax output
    spoof_probability: float
    label: str  # "bonafide" | "spoof"
    threshold: float
    model_name: str
    model_commit: str


def _import_torch():
    try:
        import torch  # noqa: F401
        import torch.nn.functional as F  # noqa: F401
    except Exception as exc:  # broad on purpose: import can fail many ways
        raise ModelUnavailableError(
            f"PyTorch could not be loaded in this environment: {exc}"
        ) from exc
    return torch, F


def _load_model_class():
    """Dynamically load the vendored, unmodified AASIST Model class."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "aasist_vendor_model", str(_VENDOR_DIR / "AASIST.py")
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)  # type: ignore[union-attr]
    return module.Model


class AntiSpoofModel:
    """Loads AASIST once and exposes real inference.

    Availability is only ever determined by whether PyTorch + the real
    checkpoint actually load — never assumed.
    """

    _instance: Optional["AntiSpoofModel"] = None

    def __init__(self):
        self._torch = None
        self._model = None
        self._unavailable_reason: Optional[str] = None
        self._try_load()

    def _try_load(self) -> None:
        try:
            torch, _ = _import_torch()
            if not _WEIGHTS_PATH.exists():
                raise ModelUnavailableError(
                    f"Checkpoint not found at {_WEIGHTS_PATH}"
                )
            ModelClass = _load_model_class()
            model = ModelClass(_MODEL_CONFIG)
            state_dict = torch.load(
                str(_WEIGHTS_PATH), map_location="cpu", weights_only=True
            )
            model.load_state_dict(state_dict)
            model.eval()
            self._torch = torch
            self._model = model
        except ModelUnavailableError as exc:
            self._unavailable_reason = str(exc)
        except Exception as exc:  # pragma: no cover - defensive
            self._unavailable_reason = (
                f"Unexpected error loading AASIST: {exc}"
            )

    def is_available(self) -> bool:
        return self._model is not None

    def unavailable_reason(self) -> Optional[str]:
        return self._unavailable_reason

    def predict(self, waveform_16k_mono: np.ndarray) -> AntiSpoofResult:
        """Run real inference on a 16kHz mono waveform (float32, [-1, 1]).

        Raises ModelUnavailableError if the model could not be loaded —
        callers must not catch this to fabricate a result.
        """
        if not self.is_available():
            raise ModelUnavailableError(
                self._unavailable_reason or "Model not loaded."
            )

        torch = self._torch
        x = _pad_or_tile(waveform_16k_mono, MODEL_INPUT_SAMPLES)
        x_tensor = torch.from_numpy(x).float().unsqueeze(0)  # (1, samples)

        with torch.no_grad():
            _, logits = self._model(x_tensor)
            probs = torch.softmax(logits, dim=-1).cpu().numpy()[0]

        spoof_p, bonafide_p = float(probs[0]), float(probs[1])
        label = "bonafide" if bonafide_p >= DECISION_THRESHOLD else "spoof"

        return AntiSpoofResult(
            bonafide_probability=bonafide_p,
            spoof_probability=spoof_p,
            label=label,
            threshold=DECISION_THRESHOLD,
            model_name=MODEL_NAME,
            model_commit=MODEL_COMMIT,
        )

    @classmethod
    def get(cls) -> "AntiSpoofModel":
        if cls._instance is None:
            cls._instance = AntiSpoofModel()
        return cls._instance


def _pad_or_tile(x: np.ndarray, target_len: int) -> np.ndarray:
    """Mirrors the source repo's own `data_utils.py: pad()` behaviour."""
    x = np.asarray(x, dtype=np.float32).flatten()
    if x.shape[0] >= target_len:
        return x[:target_len]
    num_repeats = int(target_len / x.shape[0]) + 1
    return np.tile(x, num_repeats)[:target_len]


def checkpoint_sha256() -> str:
    if not _WEIGHTS_PATH.exists():
        return ""
    h = hashlib.sha256()
    with open(_WEIGHTS_PATH, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()
