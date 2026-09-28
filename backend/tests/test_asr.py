from __future__ import annotations

import numpy as np
import pytest
from app.services.asr import ASRService, ModelUnavailableError, TranscriptionResult


def test_asr_service_get_info():
    service = ASRService.get()
    info = service.get_info()
    assert "service_name" in info
    assert "model_size" in info
    assert "runtime_status" in info
    assert info["engine"] == "faster-whisper (CTranslate2)"


def test_asr_empty_waveform_returns_clean_result():
    service = ASRService.get()
    if not service.is_available():
        pytest.skip("ASR model not loaded in this environment")

    empty = np.array([], dtype=np.float32)
    res = service.transcribe(empty)
    assert isinstance(res, TranscriptionResult)
    assert res.text == ""
    assert len(res.segments) == 0
    assert len(res.words) == 0


def test_asr_transcribe_synthetic_audio():
    service = ASRService.get()
    if not service.is_available():
        pytest.skip("ASR model not loaded in this environment")

    # 1 second of silence / soft noise
    sr = 16000
    audio = (np.random.randn(sr) * 0.001).astype(np.float32)
    res = service.transcribe(audio)

    assert isinstance(res, TranscriptionResult)
    d = res.to_dict()
    assert "text" in d
    assert "language" in d
    assert "segments" in d
    assert "words" in d
    assert d["status"] == "ok"


def test_asr_reports_unavailable_honestly(monkeypatch):
    monkeypatch.setattr("app.services.asr._WHISPER_AVAILABLE", False)
    service = ASRService(model_size="nonexistent")
    assert not service.is_available()
    assert service.unavailable_reason() is not None

    with pytest.raises(ModelUnavailableError):
        service.transcribe(np.zeros(16000, dtype=np.float32))

    ASRService.reset()

