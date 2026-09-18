from __future__ import annotations

from app.ml.anti_spoof import AntiSpoofModel, ModelUnavailableError


def test_model_reports_unavailable_when_torch_missing():
    """In this environment torch is not installed, so the wrapper must
    honestly report unavailable rather than fabricate a prediction."""
    AntiSpoofModel._instance = None  # reset singleton for a clean check
    model = AntiSpoofModel.get()

    if model.is_available():
        # If a real torch install IS present in whatever environment runs
        # this test, that's fine — just confirm predict() actually works.
        import numpy as np

        result = model.predict(np.zeros(16000, dtype="float32"))
        assert result.label in ("bonafide", "spoof")
        assert 0.0 <= result.bonafide_probability <= 1.0
    else:
        assert model.unavailable_reason() is not None
        try:
            import numpy as np

            model.predict(np.zeros(16000, dtype="float32"))
            assert False, "predict() should have raised when unavailable"
        except ModelUnavailableError:
            pass
