from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.api.schemas import AnalysisDetail, AnalysisSummary, AnalysisUpdateRequest
from app.core.config import settings
from app.core.database import get_db
from app.models.analysis import Analysis
from app.services import audio_ingest
from app.services.pipeline import process_analysis

router = APIRouter(prefix="/api/v1/analyses", tags=["analyses"])


@router.post("", response_model=AnalysisDetail, status_code=201)
async def create_analysis(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    original_name = file.filename or "upload"
    raw_bytes = await file.read()

    try:
        audio_ingest.validate_upload(original_name, len(raw_bytes))
    except audio_ingest.UploadValidationError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    stored_path, stored_filename = audio_ingest.store_upload(raw_bytes, original_name)
    file_hash = audio_ingest.sha256_of_bytes(raw_bytes)
    print(stored_path)

    analysis = Analysis(
        original_filename=audio_ingest.sanitize_filename(original_name),
        stored_filename=stored_filename,
        content_type=file.content_type or "",
        file_size_bytes=len(raw_bytes),
        original_file_sha256=file_hash,
        status="queued",
        processing_steps=[],
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Synchronous processing for this build (see pipeline.py docstring).
    process_analysis(analysis.id, db)
    db.refresh(analysis)

    if analysis.status == "failed":
        # Clean up the stored file for rejected uploads; keep the DB
        # record so the user sees why it failed.
        audio_ingest.delete_upload(analysis.stored_filename)

    return analysis


@router.get("", response_model=list[AnalysisSummary])
def list_analyses(
    db: Session = Depends(get_db),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    assessment: Optional[str] = Query(default=None),
    q: Optional[str] = Query(default=None, description="Search filename/notes/tags"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
):
    query = db.query(Analysis)
    if status_filter:
        query = query.filter(Analysis.status == status_filter)
    if assessment:
        query = query.filter(Analysis.assessment == assessment)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (Analysis.original_filename.ilike(like))
            | (Analysis.notes.ilike(like))
            | (Analysis.case_label.ilike(like))
        )
    query = query.order_by(desc(Analysis.created_at)).offset(offset).limit(limit)
    return query.all()


@router.get("/{analysis_id}", response_model=AnalysisDetail)
def get_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return analysis


@router.get("/{analysis_id}/audio")
def get_analysis_audio(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    audio_path = settings.upload_dir / analysis.stored_filename
    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Stored audio not found (it may have been deleted).")
    return FileResponse(str(audio_path), media_type=analysis.content_type or "application/octet-stream")


@router.patch("/{analysis_id}", response_model=AnalysisDetail)
def update_analysis(
    analysis_id: str, payload: AnalysisUpdateRequest, db: Session = Depends(get_db)
):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    if payload.case_label is not None:
        analysis.case_label = payload.case_label
    if payload.notes is not None:
        analysis.notes = payload.notes
    if payload.tags is not None:
        analysis.tags = payload.tags
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis


@router.delete("/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.get(Analysis, analysis_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    audio_ingest.delete_upload(analysis.stored_filename)
    db.delete(analysis)
    db.commit()
    return None
