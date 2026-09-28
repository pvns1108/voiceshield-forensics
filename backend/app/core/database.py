from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models import analysis  # noqa: F401  (ensure models are registered)
    Base.metadata.create_all(bind=engine)
    if settings.database_url.startswith("sqlite"):
        with engine.connect() as conn:
            from sqlalchemy import text
            try:
                existing_cols = [
                    r[1] for r in conn.execute(text("PRAGMA table_info(analyses)")).fetchall()
                ]
                if "transcription" not in existing_cols:
                    conn.execute(text("ALTER TABLE analyses ADD COLUMN transcription JSON DEFAULT '{}'"))
                if "transcript_analysis" not in existing_cols:
                    conn.execute(text("ALTER TABLE analyses ADD COLUMN transcript_analysis JSON DEFAULT '{}'"))
                conn.commit()
            except Exception:
                pass

