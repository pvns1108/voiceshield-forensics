"""
VoiceShield backend.

A real audio-forensics pipeline: genuine signal-processing feature
extraction (waveform, spectrogram, pitch, energy, VAD) computed from the
actual submitted audio, plus a real, vendored open-source anti-spoofing
model (AASIST, MIT licensed) that is used for genuine inference whenever
PyTorch is available in the running environment. If it is not available,
this API reports that explicitly rather than fabricating a result — see
app/ml/aasist_vendor/MODEL_PROVENANCE.md.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import analyses, model_info
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="VoiceShield API",
    description=(
        "Audio forensics and anti-spoofing analysis API. Real "
        "signal-processing features; real (or explicitly unavailable) "
        "anti-spoofing model inference. No fabricated results."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_allow_origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok", "service": "voiceshield-api"}


app.include_router(analyses.router)
app.include_router(model_info.router)
