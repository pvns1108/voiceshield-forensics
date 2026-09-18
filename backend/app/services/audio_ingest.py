from __future__ import annotations

import hashlib
import json
import re
import subprocess
import uuid
from pathlib import Path

from app.core.config import settings


class UploadValidationError(ValueError):
    """Raised for any user-correctable upload problem; safe to show to the user."""


_SAFE_NAME_RE = re.compile(r"[^A-Za-z0-9_.-]+")


def sanitize_filename(name: str) -> str:
    name = Path(name).name  # strip any directory components
    name = _SAFE_NAME_RE.sub("_", name)
    return name[-200:] or "upload"


def sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def sha256_of_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def probe_audio(path: Path) -> dict:
    """Real server-side format verification via ffprobe (not trusting the
    client-supplied extension or Content-Type header).
    """
    try:
        proc = subprocess.run(
            [
                "ffprobe", "-v", "error", "-print_format", "json",
                "-show_format", "-show_streams", str(path),
            ],
            capture_output=True, text=True, timeout=30,
        )
    except FileNotFoundError as exc:
        raise UploadValidationError("Server audio-inspection tool unavailable.") from exc

    if proc.returncode != 0:
        raise UploadValidationError(
            "File could not be read as a valid audio file. It may be "
            "corrupted or in an unsupported format."
        )

    try:
        info = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        raise UploadValidationError("File could not be inspected as audio.") from exc

    audio_streams = [s for s in info.get("streams", []) if s.get("codec_type") == "audio"]
    if not audio_streams:
        raise UploadValidationError("No audio stream was found in the uploaded file.")

    stream = audio_streams[0]
    fmt = info.get("format", {})
    return {
        "codec": stream.get("codec_name", "unknown"),
        "duration_sec": float(fmt.get("duration", stream.get("duration", 0.0)) or 0.0),
        "sample_rate": int(stream.get("sample_rate", 0) or 0),
        "channels": int(stream.get("channels", 0) or 0),
        "bit_rate": int(fmt.get("bit_rate", 0) or 0),
        "format_name": fmt.get("format_name", ""),
    }


def validate_upload(filename: str, size_bytes: int) -> str:
    """Basic pre-checks before the file is even fully processed."""
    ext = Path(filename).suffix.lower()
    if ext not in settings.allowed_extensions:
        raise UploadValidationError(
            f"Unsupported file extension '{ext}'. Allowed: "
            f"{', '.join(settings.allowed_extensions)}."
        )
    if size_bytes <= 0:
        raise UploadValidationError("Uploaded file is empty.")
    if size_bytes > settings.max_upload_bytes:
        max_mb = settings.max_upload_bytes / (1024 * 1024)
        raise UploadValidationError(f"File exceeds the {max_mb:.0f} MB size limit.")
    return ext


def store_upload(raw_bytes: bytes, original_filename: str) -> tuple[Path, str]:
    """Writes the uploaded bytes to disk under a random, safe filename.

    Returns (stored_path, stored_filename).
    """
    ext = Path(sanitize_filename(original_filename)).suffix.lower()
    stored_filename = f"{uuid.uuid4().hex}{ext}"
    stored_path = settings.upload_dir / stored_filename
    with open(stored_path, "wb") as f:
        f.write(raw_bytes)
    return stored_path, stored_filename


def delete_upload(stored_filename: str) -> None:
    path = settings.upload_dir / stored_filename
    if path.exists():
        path.unlink()
