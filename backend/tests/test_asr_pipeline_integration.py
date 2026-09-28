from __future__ import annotations

import io
import pytest
from app.services.asr import TranscriptionResult, WordSegment, TranscriptionSegment


def test_model_info_asr_endpoint(client):
    resp = client.get("/api/v1/model-info/asr")
    assert resp.status_code == 200
    data = resp.json()
    assert "service_name" in data
    assert "engine" in data
    assert "runtime_status" in data


def test_model_info_main_endpoint_includes_asr(client):
    resp = client.get("/api/v1/model-info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "AASIST"
    assert "asr_model" in data
    assert data["asr_model"]["engine"] == "faster-whisper (CTranslate2)"


def test_upload_runs_asr_and_transcript_analysis(client, sample_wav_path):
    with open(sample_wav_path, "rb") as f:
        files = {"file": ("test_tone.wav", f, "audio/wav")}
        resp = client.post("/api/v1/analyses", files=files)

    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "complete"
    assert "transcription" in data
    assert "transcript_analysis" in data

    # Verify processing steps included transcription and transcript_analysis
    steps = [s["step"] for s in data["processing_steps"]]
    assert "transcription" in steps
    assert "transcript_analysis" in steps


def test_asr_failure_does_not_break_audio_analysis(client, sample_wav_path, monkeypatch):
    """Verifies architectural requirement: ASR failure must not prevent audio analysis."""
    def mock_transcribe(self, *args, **kwargs):
        raise RuntimeError("Simulated ASR engine timeout")

    monkeypatch.setattr("app.services.pipeline.ASRService.transcribe", mock_transcribe)

    with open(sample_wav_path, "rb") as f:
        files = {"file": ("isolated.wav", f, "audio/wav")}
        resp = client.post("/api/v1/analyses", files=files)

    assert resp.status_code == 201
    data = resp.json()
    # The overall analysis still completes!
    assert data["status"] == "complete"
    assert "features" in data
    assert data["features"]["waveform"] is not None
    assert data["transcription"]["status"] == "failed"
    assert "Simulated ASR engine timeout" in data["transcription"]["error"]


def test_transcript_scam_detection_integration(client, sample_wav_path, monkeypatch):
    """Verifies that when ASR returns suspicious text, transcript_analysis flags indicators."""
    mock_result = TranscriptionResult(
        text="Sir police station se bol raha hoon. Immediate digital arrest warrant hai. Transfer ₹50,000 via UPI right now or face jail.",
        language="hi",
        language_probability=0.95,
        segments=[
            TranscriptionSegment(
                id=1,
                start=0.0,
                end=3.0,
                text="Sir police station se bol raha hoon. Immediate digital arrest warrant hai. Transfer ₹50,000 via UPI right now or face jail.",
                words=[WordSegment(word="police", start=0.5, end=1.0, probability=0.98)],
            )
        ],
        words=[WordSegment(word="police", start=0.5, end=1.0, probability=0.98)],
        model_name="whisper-large-v3-turbo",
        processing_time_ms=120.0,
        status="ok",
    )

    monkeypatch.setattr("app.services.pipeline.ASRService.transcribe", lambda self, *a, **k: mock_result)

    with open(sample_wav_path, "rb") as f:
        files = {"file": ("scam_test.wav", f, "audio/wav")}
        resp = client.post("/api/v1/analyses", files=files)

    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "complete"
    assert data["transcription"]["text"] == mock_result.text

    tx_analysis = data["transcript_analysis"]
    assert tx_analysis["has_suspicious_content"] is True
    assert tx_analysis["total_indicators"] >= 2
    categories = [i["category"] for i in tx_analysis["indicators"]]
    assert "urgency_threat" in categories
    assert "payment_instruction" in categories
