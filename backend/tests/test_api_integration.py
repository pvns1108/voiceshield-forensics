from __future__ import annotations


def test_health_check(client):
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_upload_valid_audio_produces_complete_analysis(client, sample_wav_path):
    with open(sample_wav_path, "rb") as f:
        resp = client.post(
            "/api/v1/analyses",
            files={"file": ("sample.wav", f, "audio/wav")},
        )
    assert resp.status_code == 201
    data = resp.json()

    assert data["status"] == "complete"
    assert data["duration_sec"] > 0
    assert data["sample_rate_analyzed"] == 16000
    assert data["original_file_sha256"]
    assert data["normalized_audio_sha256"]
    assert "waveform" in data["features"]
    assert "spectrogram" in data["features"]
    assert "pitch" in data["features"]
    # Model is not available in the test/sandbox environment, so the
    # overall assessment must be honestly "unavailable" -- never guessed.
    assert data["anti_spoof_model"]["status"] in ("ok", "unavailable")
    if data["anti_spoof_model"]["status"] == "unavailable":
        assert data["assessment"] == "unavailable"

    steps = [s["step"] for s in data["processing_steps"]]
    assert "validating" in steps
    assert "extracting_features" in steps
    assert "model_inference" in steps
    assert "generating_report" in steps


def test_upload_rejects_disallowed_extension(client, tmp_path):
    bad_file = tmp_path / "malware.exe"
    bad_file.write_bytes(b"not audio")
    with open(bad_file, "rb") as f:
        resp = client.post(
            "/api/v1/analyses",
            files={"file": ("malware.exe", f, "application/octet-stream")},
        )
    assert resp.status_code == 422
    assert "extension" in resp.json()["detail"].lower()


def test_upload_rejects_empty_file(client, tmp_path):
    empty_file = tmp_path / "empty.wav"
    empty_file.write_bytes(b"")
    with open(empty_file, "rb") as f:
        resp = client.post(
            "/api/v1/analyses",
            files={"file": ("empty.wav", f, "audio/wav")},
        )
    assert resp.status_code == 422


def test_upload_corrupted_wav_marks_analysis_failed(client, tmp_path):
    corrupt_file = tmp_path / "corrupt.wav"
    corrupt_file.write_bytes(b"this is not a real wav file" * 10)
    with open(corrupt_file, "rb") as f:
        resp = client.post(
            "/api/v1/analyses",
            files={"file": ("corrupt.wav", f, "audio/wav")},
        )
    # Upload itself succeeds (creates a record); processing fails cleanly.
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "failed"
    assert data["assessment"] == "unavailable"
    assert data["error_message"]


def test_get_analysis_detail_after_upload(client, sample_wav_path):
    with open(sample_wav_path, "rb") as f:
        created = client.post(
            "/api/v1/analyses", files={"file": ("sample.wav", f, "audio/wav")}
        ).json()

    resp = client.get(f"/api/v1/analyses/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_upload_webm_microphone_recording_succeeds(client, tmp_path):
    """Regression test for the real bug found in manual testing: webm/opus
    (what browser MediaRecorder produces) failed because libsndfile can't
    read it directly; fixed by transcoding through ffmpeg first."""
    import subprocess

    import numpy as np
    import soundfile as sf

    sr = 16000
    y = (0.2 * np.sin(2 * np.pi * 220 * np.linspace(0, 1.0, sr))).astype(np.float32)
    wav_path = tmp_path / "source.wav"
    webm_path = tmp_path / "recording.webm"
    sf.write(str(wav_path), y, sr)
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(wav_path), str(webm_path)],
        capture_output=True, check=True,
    )

    with open(webm_path, "rb") as f:
        resp = client.post(
            "/api/v1/analyses",
            files={"file": ("recording.webm", f, "audio/webm")},
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "complete"
    assert data["duration_sec"] > 0.5


def test_get_nonexistent_analysis_returns_404(client):
    resp = client.get("/api/v1/analyses/does-not-exist")
    assert resp.status_code == 404


def test_history_list_and_filters(client, sample_wav_path):
    with open(sample_wav_path, "rb") as f:
        client.post("/api/v1/analyses", files={"file": ("sample.wav", f, "audio/wav")})

    resp = client.get("/api/v1/analyses")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) == 1
    assert items[0]["original_filename"] == "sample.wav"

    resp_filtered = client.get("/api/v1/analyses", params={"status": "complete"})
    assert len(resp_filtered.json()) == 1

    resp_no_match = client.get("/api/v1/analyses", params={"status": "failed"})
    assert len(resp_no_match.json()) == 0


def test_update_case_label_and_notes(client, sample_wav_path):
    with open(sample_wav_path, "rb") as f:
        created = client.post(
            "/api/v1/analyses", files={"file": ("sample.wav", f, "audio/wav")}
        ).json()

    resp = client.patch(
        f"/api/v1/analyses/{created['id']}",
        json={"case_label": "Case #42", "notes": "Follow up needed", "tags": ["urgent"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["case_label"] == "Case #42"
    assert data["notes"] == "Follow up needed"
    assert data["tags"] == ["urgent"]


def test_delete_analysis(client, sample_wav_path):
    with open(sample_wav_path, "rb") as f:
        created = client.post(
            "/api/v1/analyses", files={"file": ("sample.wav", f, "audio/wav")}
        ).json()

    resp = client.delete(f"/api/v1/analyses/{created['id']}")
    assert resp.status_code == 204

    resp_get = client.get(f"/api/v1/analyses/{created['id']}")
    assert resp_get.status_code == 404


def test_get_analysis_audio_returns_stored_file(client, sample_wav_path):
    with open(sample_wav_path, "rb") as f:
        created = client.post(
            "/api/v1/analyses", files={"file": ("sample.wav", f, "audio/wav")}
        ).json()

    resp = client.get(f"/api/v1/analyses/{created['id']}/audio")
    assert resp.status_code == 200
    assert len(resp.content) > 0


def test_get_analysis_audio_404_for_unknown_id(client):
    resp = client.get("/api/v1/analyses/does-not-exist/audio")
    assert resp.status_code == 404


def test_model_info_endpoint_reports_honest_status(client):
    resp = client.get("/api/v1/model-info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "AASIST"
    assert data["runtime_status"] in ("available", "unavailable")
    if data["runtime_status"] == "unavailable":
        assert data["unavailable_reason"]
