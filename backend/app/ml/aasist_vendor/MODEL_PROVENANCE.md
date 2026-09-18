# Anti-Spoofing Model Provenance

## Model: AASIST (and AASIST-L)

- **Paper**: "AASIST: Audio Anti-Spoofing using Integrated Spectro-Temporal
  Graph Attention Networks" (Jung et al., 2021) — https://arxiv.org/abs/2110.01200
- **Source repository**: https://github.com/clovaai/aasist
- **Vendored commit**: `a04c9863f63d44471dde8a6abcb3b082b07cd1d1` (2022-01-18)
- **License**: MIT (NAVER Corp.) — see `LICENSE` in this directory. Permits
  use, modification, and redistribution with attribution retained.
- **Training / evaluation dataset**: ASVspoof 2019 Logical Access (LA)
  track, as documented by the original authors.
- **Published performance (from the source repository's own README, not
  independently re-verified by this project)**:
  - `AASIST.pth`  — EER 0.83%, min t-DCF 0.0275
  - `AASIST-L.pth` — EER 0.99%, min t-DCF 0.0309 (85,306 parameters)
- **Checkpoint integrity** (SHA-256, computed by this project on the
  vendored files):
  - `AASIST.pth`: `51d2d9cf0738172f61e2a384ec50a54a55363240f67c971ed55a92435bc1a1c0`
  - `AASIST-L.pth`: `814331d088032bb4c3fa61cc014789eadeed464209dd094ab3a2dd6ffbdce27a`

## Input / output contract (from the source repository's own code)

- **Input**: mono waveform, 16 kHz sample rate, fixed length of
  `64,600` samples (~4.04 s). Shorter clips are tiled/repeated to this
  length; longer clips are truncated (`data_utils.py: pad()` in the
  source repo). This project's inference wrapper mirrors that logic.
- **Output**: 2-class logits `[spoof, bonafide]`. The source repo's own
  evaluation code (`main.py: produce_evaluation_file`) uses
  `batch_out[:, 1]` — i.e. **index 1 is the "bonafide" (genuine
  human speech) score**, and the model does not natively distinguish
  *why* something is flagged as spoof (TTS vs. voice conversion vs.
  replay).

## Current status in this deployment

**Model status: `unavailable` in this sandbox environment.**

Reason: running AASIST requires PyTorch. In this build environment:

- The CPU-only PyTorch wheels are published at `download.pytorch.org`,
  which is outside this environment's network allowlist.
- The default PyPI `torch` wheel for this Python/platform combination
  dynamically links against CUDA runtime libraries (`libcudart`,
  `libcublas`, etc.) at import time, via separate `nvidia-*` pip
  packages. Those add several GB and still fail to satisfy the dynamic
  loader in a CPU-only, GPU-less sandbox (`OSError: libcudart.so.13:
  cannot open shared object file`), and no older, non-CUDA-preloading
  torch build supports this Python version.

This is a documented environment limitation, not a fallback of
convenience. The inference wrapper (`inference.py`) is fully
implemented against the real model and weights above — in an
environment with a working CPU (or GPU) PyTorch install (e.g. install
`torch` from `https://download.pytorch.org/whl/cpu`), it will produce
genuine model output, not a placeholder. See `README.md` → "Enabling
the real anti-spoofing model" for exact setup steps.

Until then, `GET /api/v1/analyses/{id}` reports:
```json
"anti_spoof_model": {
  "status": "unavailable",
  "reason": "PyTorch could not be loaded in this environment (see docs/MODEL_PROVENANCE.md)."
}
```
and no spoof/bonafide score, confidence, or classification is invented
or displayed in its place.
