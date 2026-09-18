from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf
from fastapi.testclient import TestClient


@pytest.fixture()
def temp_env(monkeypatch, tmp_path):
    """Isolate each test's DB and upload directory."""
    data_dir = tmp_path / "data"
    upload_dir = data_dir / "uploads"
    upload_dir.mkdir(parents=True)

    monkeypatch.setenv("VOICESHIELD_DATA_DIR", str(data_dir))
    monkeypatch.setenv("VOICESHIELD_UPLOAD_DIR", str(upload_dir))
    monkeypatch.setenv("VOICESHIELD_DATABASE_URL", f"sqlite:///{data_dir / 'test.db'}")

    # Modules cache settings/engine at import time, so we must import
    # fresh, after env vars are set, for each test.
    import sys
    for mod_name in list(sys.modules):
        if mod_name.startswith("app."):
            del sys.modules[mod_name]
    if "app" in sys.modules:
        del sys.modules["app"]

    from app.main import app
    from app.core.database import init_db

    init_db()
    yield app

    shutil.rmtree(data_dir, ignore_errors=True)


@pytest.fixture()
def client(temp_env):
    return TestClient(temp_env)


@pytest.fixture()
def sample_wav_path(tmp_path) -> Path:
    sr = 22050
    duration = 3.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    f0 = 180 + 15 * np.sin(2 * np.pi * 1.5 * t)
    phase = 2 * np.pi * np.cumsum(f0) / sr
    y = 0.3 * np.sin(phase) + 0.01 * np.random.randn(len(t))
    path = tmp_path / "sample.wav"
    sf.write(str(path), y.astype(np.float32), sr)
    return path


@pytest.fixture()
def silent_wav_path(tmp_path) -> Path:
    sr = 16000
    y = np.zeros(int(sr * 1.0), dtype=np.float32)
    path = tmp_path / "silence.wav"
    sf.write(str(path), y, sr)
    return path
