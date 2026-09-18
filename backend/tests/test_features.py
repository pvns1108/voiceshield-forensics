from __future__ import annotations

from app.ml import features as feature_extraction


def test_analyze_audio_file_returns_real_pitch_close_to_known_tone(sample_wav_path):
    result = feature_extraction.analyze_audio_file(str(sample_wav_path))

    # The fixture generates a tone centered at 180Hz with +-15Hz vibrato.
    assert result.pitch.mean_f0 is not None
    assert 165 <= result.pitch.mean_f0 <= 195
    assert result.pitch.voiced_fraction > 0.8


def test_analyze_audio_file_duration_and_rates(sample_wav_path):
    result = feature_extraction.analyze_audio_file(
        str(sample_wav_path), sample_rate_original=22050, channels_original=1
    )
    assert 2.9 <= result.duration_sec <= 3.1
    assert result.sample_rate_original == 22050
    assert result.sample_rate_analyzed == 16000
    assert result.channels_original == 1


def test_analyze_audio_file_waveform_and_spectrogram_shapes(sample_wav_path):
    result = feature_extraction.analyze_audio_file(str(sample_wav_path))
    assert len(result.waveform.times) == len(result.waveform.amplitudes)
    assert len(result.waveform.times) > 0
    assert len(result.spectrogram.db) == len(result.spectrogram.freqs)
    assert all(len(row) == len(result.spectrogram.times) for row in result.spectrogram.db)


def test_analyze_audio_file_handles_webm_opus_container(tmp_path):
    """Regression test: libsndfile cannot natively read webm/opus (what
    browser MediaRecorder produces), so loading must go through ffmpeg
    transcoding rather than a direct soundfile/librosa.load() call."""
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

    result = feature_extraction.analyze_audio_file(str(webm_path))
    assert result.duration_sec > 0.5
    assert len(result.waveform.amplitudes) > 0


def test_analyze_silent_audio_reports_high_silence_ratio(silent_wav_path):
    result = feature_extraction.analyze_audio_file(str(silent_wav_path))
    assert result.forensic.silence_ratio > 0.9
    assert result.pitch.voiced_fraction == 0.0
    assert result.pitch.mean_f0 is None


def test_forensic_indicators_flag_clipping():
    import numpy as np
    import soundfile as sf
    import tempfile
    from pathlib import Path

    sr = 16000
    y = np.ones(sr * 1, dtype=np.float32)  # fully clipped signal
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "clipped.wav"
        sf.write(str(path), y, sr)
        result = feature_extraction.analyze_audio_file(str(path))

    assert result.forensic.clipping_ratio > 0.9
    assert any("clip" in note.lower() for note in result.forensic.notes)


def test_short_clip_adds_reliability_note():
    import numpy as np
    import soundfile as sf
    import tempfile
    from pathlib import Path

    sr = 16000
    y = (0.2 * np.sin(2 * np.pi * 220 * np.linspace(0, 1.0, sr))).astype(np.float32)
    with tempfile.TemporaryDirectory() as d:
        path = Path(d) / "short.wav"
        sf.write(str(path), y, sr)
        result = feature_extraction.analyze_audio_file(str(path))

    assert any("shorter than" in note.lower() for note in result.forensic.notes)
