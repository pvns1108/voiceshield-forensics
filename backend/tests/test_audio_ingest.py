from __future__ import annotations

import pytest

from app.services import audio_ingest


def test_sanitize_filename_strips_path_and_unsafe_chars():
    assert audio_ingest.sanitize_filename("../../etc/passwd") == "passwd"
    assert audio_ingest.sanitize_filename("my file (final)!.wav") == "my_file_final_.wav"


def test_validate_upload_rejects_bad_extension():
    with pytest.raises(audio_ingest.UploadValidationError):
        audio_ingest.validate_upload("evil.exe", 1024)


def test_validate_upload_rejects_empty_file():
    with pytest.raises(audio_ingest.UploadValidationError):
        audio_ingest.validate_upload("clip.wav", 0)


def test_validate_upload_rejects_oversized_file():
    from app.core.config import settings

    with pytest.raises(audio_ingest.UploadValidationError):
        audio_ingest.validate_upload("clip.wav", settings.max_upload_bytes + 1)


def test_validate_upload_accepts_supported_extension():
    ext = audio_ingest.validate_upload("clip.wav", 1024)
    assert ext == ".wav"


def test_probe_audio_real_wav_file(sample_wav_path):
    info = audio_ingest.probe_audio(sample_wav_path)
    assert info["channels"] == 1
    assert info["sample_rate"] == 22050
    assert 2.9 <= info["duration_sec"] <= 3.1


def test_probe_audio_rejects_corrupted_file(tmp_path):
    bad_file = tmp_path / "corrupt.wav"
    bad_file.write_bytes(b"not a real wav file" * 5)
    with pytest.raises(audio_ingest.UploadValidationError):
        audio_ingest.probe_audio(bad_file)


def test_sha256_of_bytes_is_deterministic():
    a = audio_ingest.sha256_of_bytes(b"hello world")
    b = audio_ingest.sha256_of_bytes(b"hello world")
    c = audio_ingest.sha256_of_bytes(b"different")
    assert a == b
    assert a != c
    assert len(a) == 64
