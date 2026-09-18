from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)

    # Original upload metadata
    original_filename: Mapped[str] = mapped_column(String(512))
    stored_filename: Mapped[str] = mapped_column(String(512))
    content_type: Mapped[str] = mapped_column(String(128), default="")
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)
    original_file_sha256: Mapped[str] = mapped_column(String(64), default="")
    normalized_audio_sha256: Mapped[str] = mapped_column(String(64), default="")

    # Detected/measured audio properties
    duration_sec: Mapped[float] = mapped_column(Float, default=0.0)
    sample_rate_original: Mapped[int] = mapped_column(Integer, default=0)
    sample_rate_analyzed: Mapped[int] = mapped_column(Integer, default=0)
    channels_original: Mapped[int] = mapped_column(Integer, default=0)
    codec: Mapped[str] = mapped_column(String(64), default="")

    # Processing pipeline state
    status: Mapped[str] = mapped_column(String(32), default="queued")
    # queued -> validating -> preprocessing -> extracting_features
    #        -> model_inference -> generating_report -> complete | failed
    error_message: Mapped[str] = mapped_column(Text, default="")
    processing_steps: Mapped[list] = mapped_column(JSON, default=list)
    # list of {"step": str, "started_at": iso, "duration_ms": float, "status": "ok"|"failed"}

    # Assessment
    assessment: Mapped[str] = mapped_column(String(32), default="")
    # "likely_human" | "suspicious_inconclusive" | "likely_synthetic" | "unavailable"

    # Results payloads (JSON blobs, all derived from real computation)
    features: Mapped[dict] = mapped_column(JSON, default=dict)
    forensic_indicators: Mapped[dict] = mapped_column(JSON, default=dict)
    anti_spoof_model: Mapped[dict] = mapped_column(JSON, default=dict)

    # Case management
    case_label: Mapped[str] = mapped_column(String(256), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)
