from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


class ProcessingStep(BaseModel):
    step: str
    started_at: str
    duration_ms: float
    status: str
    error: Optional[str] = None


class AnalysisSummary(BaseModel):
    id: str
    original_filename: str
    status: str
    assessment: str
    duration_sec: float
    created_at: datetime
    case_label: str
    tags: list[str]

    model_config = ConfigDict(from_attributes=True)


class AnalysisDetail(BaseModel):
    id: str
    original_filename: str
    content_type: str
    file_size_bytes: int
    original_file_sha256: str
    normalized_audio_sha256: str

    duration_sec: float
    sample_rate_original: int
    sample_rate_analyzed: int
    channels_original: int
    codec: str

    status: str
    error_message: str
    processing_steps: list[dict[str, Any]]

    assessment: str
    features: dict[str, Any]
    forensic_indicators: dict[str, Any]
    anti_spoof_model: dict[str, Any]

    case_label: str
    notes: str
    tags: list[str]

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AnalysisUpdateRequest(BaseModel):
    case_label: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[list[str]] = None


class ErrorResponse(BaseModel):
    detail: str
