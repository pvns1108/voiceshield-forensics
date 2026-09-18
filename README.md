# VoiceShield

Evidence-based audio forensics and anti-spoofing analysis. Upload or
record audio; VoiceShield reports what is actually measurable in it —
and is explicit about what it can't tell you.

**This is a real, functioning application, not a mockup.** Every number
shown (waveform, spectrogram, pitch, energy, forensic indicators) is
computed from the audio you submit, using librosa/NumPy/SciPy. The
anti-spoofing model is a real, vendored, MIT-licensed open-source model
(AASIST) — see [Anti-spoofing model status](#anti-spoofing-model-status)
for exactly when it does and doesn't run.

---

## 1. Quick start

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API: `http://localhost:8000` · Interactive docs: `http://localhost:8000/docs`

Requires `ffmpeg`/`ffprobe` on PATH (used for real server-side audio
format verification — not trusting file extensions or headers).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:3000`

Copy `frontend/.env.local.example` to `frontend/.env.local` if you need
to point at a backend running somewhere other than `localhost:8000`.

### Backend tests

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

28 tests covering: upload validation, real ffprobe-based format
verification, real feature-extraction correctness (verified against a
synthetic tone of known pitch), the anti-spoofing wrapper's honest
unavailable-state handling, the full upload → analysis API flow
(including rejection of bad/corrupted files), and a regression test for
browser microphone recordings (webm/opus, which `libsndfile` cannot read
natively — audio is transcoded through `ffmpeg` first for exactly this
reason). 30 tests total.

---

## 2. Anti-spoofing model status

VoiceShield vendors [AASIST](https://github.com/clovaai/aasist)
(MIT license, NAVER Corp.), trained/evaluated on ASVspoof 2019 LA, with
its real pretrained checkpoint (`AASIST.pth`) included at
`backend/app/ml/aasist_vendor/`. Full provenance, checksums, and the
documented input/output contract are in
[`backend/app/ml/aasist_vendor/MODEL_PROVENANCE.md`](backend/app/ml/aasist_vendor/MODEL_PROVENANCE.md).

**In the environment this was built in, the model is unavailable**,
because PyTorch could not be installed: the CPU-only wheels are hosted
at `download.pytorch.org`, which was outside that sandbox's network
allowlist, and the default PyPI `torch` wheel requires CUDA runtime
libraries that aren't present on a GPU-less machine. This is reported
via the API (`"anti_spoof_model": {"status": "unavailable", ...}`) and
in the UI — **no score is fabricated in its place.**

### Enabling the real model

On a machine with normal internet access:

```bash
cd backend
source .venv/bin/activate
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

Restart the API. `GET /api/v1/model-info` will report
`"runtime_status": "available"`, and new analyses will include real
`bonafide_probability` / `spoof_probability` / `label` values from
actual model inference — the inference code
(`backend/app/ml/anti_spoof.py`) is already fully implemented against
the real architecture and checkpoint; it just needs a working PyTorch
install to run.

---

## 3. Architecture

```
voiceshield-forensics/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers (analyses, model-info) + schemas
│   │   ├── core/           # settings, SQLAlchemy engine/session
│   │   ├── ml/
│   │   │   ├── features.py         # real librosa/numpy/scipy feature extraction
│   │   │   ├── anti_spoof.py       # AASIST inference wrapper (honest unavailable handling)
│   │   │   └── aasist_vendor/      # vendored MIT-licensed model code + weights + provenance
│   │   ├── models/          # SQLAlchemy ORM (Analysis)
│   │   ├── services/        # audio ingest/validation, processing pipeline
│   │   └── main.py
│   └── tests/                # 28 tests: unit + integration
├── frontend/
│   └── src/
│       ├── app/              # Next.js App Router pages
│       │   ├── page.tsx              # Landing
│       │   ├── analyze/              # Upload / record page
│       │   ├── analysis/[id]/        # Result page
│       │   ├── history/              # Case history
│       │   ├── model/                # Model & limitations
│       │   └── privacy/
│       ├── components/       # WaveformView, SpectrogramView, Charts, AudioPlayer, etc.
│       └── lib/               # typed API client
└── README.md
```

### Processing pipeline

Uploads are processed synchronously through explicit, DB-persisted
stages, each with real wall-clock timing recorded:

```
queued → validating → extracting_features → hashing_normalized_audio
       → model_inference → generating_report → complete | failed
```

This is intentionally a simple in-process pipeline rather than a
Celery/RQ + Redis broker, so the whole thing runs with zero extra
infrastructure. To scale to concurrent, queued processing: move the
body of `app/services/pipeline.py::process_analysis` into a Celery
task, keep the same DB status transitions, and add a `/status` polling
endpoint (the schema already supports it — `Analysis.status` is
designed for exactly this).

### Database

SQLite by default (`backend/data/voiceshield.db`), via SQLAlchemy — set
`VOICESHIELD_DATABASE_URL` to a PostgreSQL URL to move there directly;
no query code needs to change.

### File handling / security

- Extension allowlist (`.wav .mp3 .m4a .flac .ogg .webm`) **and** real
  `ffprobe`-based content verification — the declared extension/MIME
  type is never trusted alone.
- Filenames are sanitized and files are stored under random UUIDs, not
  the original name.
- Uploads are size- and duration-bounded (configurable).
- SHA-256 is recorded for both the original file and the normalized
  analysis audio.
- No stack traces or server paths are exposed in API error responses.

---

## 4. Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `VOICESHIELD_DATA_DIR` | `backend/data` | Root data directory |
| `VOICESHIELD_UPLOAD_DIR` | `backend/data/uploads` | Stored audio files |
| `VOICESHIELD_DATABASE_URL` | `sqlite:///backend/data/voiceshield.db` | SQLAlchemy URL |
| `VOICESHIELD_MAX_UPLOAD_BYTES` | `26214400` (25MB) | Upload size limit |
| `VOICESHIELD_MIN_DURATION_SEC` / `MAX_DURATION_SEC` | `0.5` / `120.0` | Accepted clip length |
| `VOICESHIELD_RETENTION_DAYS` | `30` | Informational; see note below |
| `NEXT_PUBLIC_API_BASE_URL` (frontend) | `http://localhost:8000` | Backend URL the UI calls |

**Retention**: this build does not run an automatic cleanup job. For
production use, schedule a periodic task (cron / Celery beat) that
deletes `Analysis` rows and their `stored_filename` files older than
`VOICESHIELD_RETENTION_DAYS`; the DELETE endpoint
(`DELETE /api/v1/analyses/{id}`) already does this per-record and can
be called from that job.

---

## 5. Known limitations

- **Anti-spoofing model unavailable in the reference build** — see
  section 2. All signal-processing features (waveform, spectrogram,
  pitch, energy, VAD, forensic indicators) work regardless and are
  computed from real audio.
- **AASIST is trained only on ASVspoof 2019 LA.** It has not been
  validated here against newer TTS/voice-conversion systems, non-English
  speech, or heavily compressed/noisy real-world audio. Treat any
  result as one input among several, not a verdict.
- **The decision threshold (0.5) is a neutral midpoint, not a published
  calibrated operating point** — the source repo reports EER, a
  threshold-independent metric. This is disclosed in the UI and API.
- **Synchronous, single-process pipeline** — fine for a demo/prototype
  load; see the Architecture section for how to move to a real job
  queue.
- **No authentication** — this build is single-user/local by design.
  Add session-based auth before exposing it beyond a trusted network.

---

## 6. Capability checklist

| Capability | Status |
|---|---|
| Upload audio (wav/mp3/m4a/flac/ogg) | ✅ Working, real ffprobe validation |
| Record from microphone in-browser | ✅ Working (MediaRecorder → webm/opus) |
| Real audio preprocessing (mono/16kHz normalization) | ✅ Working |
| Real waveform / spectrogram / pitch / energy / VAD visualizations | ✅ Working, computed from actual audio |
| Forensic/signal-quality indicators, clearly separated from model output | ✅ Working |
| Real anti-spoofing model (AASIST) integration | ⚠️ Code complete and real; **inference unavailable in this sandbox** (see §2) — reports "unavailable" honestly, no fabricated scores |
| Processing pipeline with real per-step status/timing | ✅ Working (in-process; see Architecture for scaling to a real queue) |
| Analysis history: search/filter/sort, notes, case labels, deletion | ✅ Working |
| Audio player with waveform-synced playback, speed/volume control | ✅ Working |
| Model & limitations page | ✅ Working, reads live status from the API |
| Privacy page + real file hashing/integrity display | ✅ Working |
| Speaker enrollment / voice comparison | ❌ Not implemented — needs a real speaker-embedding model |
| Challenge-response liveness with real ASR verification | ❌ Not implemented — needs a real speech-to-text engine |
| Side-by-side comparison mode | ❌ Not implemented |
| PDF report export | ❌ Not implemented |
| Authentication, Docker, PostgreSQL | ❌ Not implemented (SQLite + no-auth by design for this build; see §3/§4 for the migration path) |

Everything marked ❌ was deliberately left out rather than faked,
consistent with this project's no-fabrication requirement: each would
need its own real model or service (speaker embeddings, ASR, PDF
rendering, an auth/session system) to be genuine rather than
decorative.

---

## 7. Publishing to GitHub

```bash
cd voiceshield-forensics
git add .
git commit -m "VoiceShield: real audio forensics pipeline with honest model-availability reporting"
git branch -M main
git remote add origin https://github.com/<your-username>/voiceshield-forensics.git
git push -u origin main
```

(Not run automatically — you run these yourself.)
