"""
Real audio feature extraction.

Every value returned here is computed directly from the submitted audio
using librosa / NumPy / SciPy. Nothing is invented, randomized, or
templated. These are signal-processing measurements, not machine-learning
"detections" — the API and frontend must present them as
"forensic / signal-quality indicators", never as model output.
"""

from __future__ import annotations

import subprocess
import tempfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import librosa
import numpy as np
import soundfile as sf

TARGET_SR = 16_000  # matches the anti-spoof model's expected input rate
WAVEFORM_DISPLAY_POINTS = 800  # downsampled points for the UI waveform chart
N_FFT = 1024
HOP_LENGTH = 256
N_MELS = 80


@dataclass
class WaveformSeries:
    times: list[float]
    amplitudes: list[float]


@dataclass
class SpectrogramData:
    times: list[float]
    freqs: list[float]
    db: list[list[float]]  # [freq][time], dB scale


@dataclass
class PitchContour:
    times: list[float]
    f0_hz: list[Optional[float]]  # None where unvoiced/unreliable
    voiced_fraction: float
    mean_f0: Optional[float]
    std_f0: Optional[float]


@dataclass
class EnergyTimeline:
    times: list[float]
    rms: list[float]


@dataclass
class VoiceActivitySegment:
    start: float
    end: float
    kind: str  # "speech" | "silence"


@dataclass
class ForensicIndicators:
    """Heuristic, signal-level observations. NOT model output."""
    clipping_ratio: float
    silence_ratio: float
    dynamic_range_db: float
    spectral_flatness_mean: float
    zero_crossing_rate_mean: float
    pitch_stability_score: Optional[float]  # lower stdev-of-derivative => more "unnaturally smooth"
    notes: list[str] = field(default_factory=list)


@dataclass
class AudioAnalysisResult:
    duration_sec: float
    sample_rate_original: int
    sample_rate_analyzed: int
    channels_original: int
    waveform: WaveformSeries
    spectrogram: SpectrogramData
    pitch: PitchContour
    energy: EnergyTimeline
    vad_segments: list[VoiceActivitySegment]
    forensic: ForensicIndicators
    normalized_waveform_16k_mono: np.ndarray  # for model inference; not serialized to API


class AudioLoadError(RuntimeError):
    pass


def load_and_normalize(file_path: str) -> np.ndarray:
    """Decode audio to mono 16kHz float32 via ffmpeg, then load with soundfile.

    We deliberately go through ffmpeg for every file (rather than relying
    on soundfile/libsndfile's own, narrower native format support) so any
    container ffprobe can already read — including webm/opus from browser
    microphone recordings — is handled consistently. Original sample rate
    and channel count are obtained separately via ffprobe
    (see app.services.audio_ingest.probe_audio) and passed in by the
    caller; this function only returns the normalized analysis waveform.
    """
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        proc = subprocess.run(
            [
                "ffmpeg", "-y", "-i", str(file_path),
                "-ac", "1", "-ar", str(TARGET_SR),
                "-f", "wav", str(tmp_path),
            ],
            capture_output=True, timeout=60,
        )
        if proc.returncode != 0 or not tmp_path.exists() or tmp_path.stat().st_size == 0:
            raise AudioLoadError(
                "Audio could not be decoded for analysis "
                "(ffmpeg failed to transcode the file)."
            )
        y, sr = sf.read(str(tmp_path), dtype="float32", always_2d=False)
        if y.ndim > 1:
            y = np.mean(y, axis=1)
        if sr != TARGET_SR:
            y = librosa.resample(y.astype(np.float32), orig_sr=sr, target_sr=TARGET_SR)
        return y.astype(np.float32)
    finally:
        tmp_path.unlink(missing_ok=True)


def _downsample_for_display(y: np.ndarray, sr: int, num_points: int) -> WaveformSeries:
    if len(y) == 0:
        return WaveformSeries(times=[], amplitudes=[])
    if len(y) <= num_points:
        idx = np.arange(len(y))
    else:
        idx = np.linspace(0, len(y) - 1, num_points).astype(int)
    times = (idx / sr).tolist()
    amps = y[idx].tolist()
    return WaveformSeries(times=[round(t, 4) for t in times], amplitudes=[round(a, 5) for a in amps])


def _compute_spectrogram(y: np.ndarray, sr: int) -> SpectrogramData:
    mel = librosa.feature.melspectrogram(
        y=y, sr=sr, n_fft=N_FFT, hop_length=HOP_LENGTH, n_mels=N_MELS
    )
    mel_db = librosa.power_to_db(mel, ref=np.max)
    times = librosa.frames_to_time(
        np.arange(mel_db.shape[1]), sr=sr, hop_length=HOP_LENGTH
    ).tolist()
    freqs = librosa.mel_frequencies(n_mels=N_MELS, fmax=sr / 2).tolist()

    # Downsample time axis for a lighter payload if very long.
    max_frames = 400
    if mel_db.shape[1] > max_frames:
        idx = np.linspace(0, mel_db.shape[1] - 1, max_frames).astype(int)
        mel_db = mel_db[:, idx]
        times = [times[i] for i in idx]

    return SpectrogramData(
        times=[round(t, 4) for t in times],
        freqs=[round(f, 1) for f in freqs],
        db=[[round(float(v), 2) for v in row] for row in mel_db],
    )


def _compute_pitch(y: np.ndarray, sr: int) -> PitchContour:
    try:
        f0, voiced_flag, _voiced_prob = librosa.pyin(
            y,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
            sr=sr,
            hop_length=HOP_LENGTH,
        )
    except Exception:
        return PitchContour(times=[], f0_hz=[], voiced_fraction=0.0, mean_f0=None, std_f0=None)

    times = librosa.frames_to_time(
        np.arange(len(f0)), sr=sr, hop_length=HOP_LENGTH
    ).tolist()

    f0_list: list[Optional[float]] = []
    for val, voiced in zip(f0, voiced_flag):
        if voiced and val is not None and not np.isnan(val):
            f0_list.append(round(float(val), 2))
        else:
            f0_list.append(None)

    voiced_values = np.array([v for v in f0_list if v is not None])
    voiced_fraction = float(len(voiced_values) / len(f0_list)) if f0_list else 0.0
    mean_f0 = float(np.mean(voiced_values)) if len(voiced_values) > 0 else None
    std_f0 = float(np.std(voiced_values)) if len(voiced_values) > 1 else None

    return PitchContour(
        times=[round(t, 4) for t in times],
        f0_hz=f0_list,
        voiced_fraction=round(voiced_fraction, 4),
        mean_f0=round(mean_f0, 2) if mean_f0 is not None else None,
        std_f0=round(std_f0, 2) if std_f0 is not None else None,
    )


def _compute_energy(y: np.ndarray, sr: int) -> EnergyTimeline:
    rms = librosa.feature.rms(y=y, hop_length=HOP_LENGTH)[0]
    times = librosa.frames_to_time(
        np.arange(len(rms)), sr=sr, hop_length=HOP_LENGTH
    ).tolist()
    return EnergyTimeline(
        times=[round(t, 4) for t in times],
        rms=[round(float(v), 5) for v in rms],
    )


def _compute_vad_segments(y: np.ndarray, sr: int) -> list[VoiceActivitySegment]:
    """Simple, transparent energy-threshold VAD (not a trained model)."""
    total_dur = len(y) / sr if sr else 0.0

    # librosa.effects.split uses top_db relative to the clip's own peak
    # amplitude. For near-silent/all-zero audio that peak is ~0, so the
    # relative threshold degenerates and the whole clip is misclassified
    # as "speech". Guard against that with an absolute floor first.
    peak_amplitude = float(np.max(np.abs(y))) if len(y) else 0.0
    if peak_amplitude < 1e-4:
        return [VoiceActivitySegment(0.0, round(total_dur, 3), "silence")] if total_dur > 0 else []

    intervals = librosa.effects.split(y, top_db=30, hop_length=HOP_LENGTH)
    segments: list[VoiceActivitySegment] = []
    prev_end = 0.0
    for start_sample, end_sample in intervals:
        start_t = start_sample / sr
        end_t = end_sample / sr
        if start_t > prev_end + 0.02:
            segments.append(VoiceActivitySegment(round(prev_end, 3), round(start_t, 3), "silence"))
        segments.append(VoiceActivitySegment(round(start_t, 3), round(end_t, 3), "speech"))
        prev_end = end_t
    if prev_end < total_dur - 0.02:
        segments.append(VoiceActivitySegment(round(prev_end, 3), round(total_dur, 3), "silence"))
    return segments


def _compute_forensic_indicators(
    y: np.ndarray, sr: int, pitch: PitchContour, vad_segments: list[VoiceActivitySegment]
) -> ForensicIndicators:
    notes: list[str] = []

    clipping_ratio = float(np.mean(np.abs(y) >= 0.99)) if len(y) else 0.0
    if clipping_ratio > 0.001:
        notes.append(
            f"{clipping_ratio * 100:.2f}% of samples are at/near full scale — "
            "possible clipping, which can affect reliability of any downstream analysis."
        )

    speech_dur = sum(s.end - s.start for s in vad_segments if s.kind == "speech")
    total_dur = len(y) / sr if sr else 0
    silence_ratio = 1.0 - (speech_dur / total_dur) if total_dur > 0 else 0.0

    if len(y) > 0:
        peak = float(np.max(np.abs(y)) + 1e-9)
        rms_overall = float(np.sqrt(np.mean(y**2)) + 1e-9)
        dynamic_range_db = float(20 * np.log10(peak / rms_overall))
    else:
        dynamic_range_db = 0.0

    flatness = librosa.feature.spectral_flatness(y=y, n_fft=N_FFT, hop_length=HOP_LENGTH)
    spectral_flatness_mean = float(np.mean(flatness)) if flatness.size else 0.0

    zcr = librosa.feature.zero_crossing_rate(y=y, hop_length=HOP_LENGTH)
    zcr_mean = float(np.mean(zcr)) if zcr.size else 0.0

    # Pitch-stability heuristic: an unnaturally flat / low-variance pitch
    # derivative CAN be associated with some synthetic speech, but is also
    # produced by monotone speakers, sustained vowels, or short clips — so
    # this is reported only as a descriptive indicator, never a verdict.
    voiced_vals = [v for v in pitch.f0_hz if v is not None]
    pitch_stability_score = None
    if len(voiced_vals) > 5:
        deriv = np.diff(np.array(voiced_vals))
        pitch_stability_score = float(np.std(deriv))
        if pitch_stability_score < 1.0:
            notes.append(
                "The voiced pitch contour is unusually smooth/stable. This can "
                "occur with synthetic speech, but also with monotone natural "
                "speech, sustained tones, or short clips — it is not conclusive "
                "on its own."
            )

    if silence_ratio > 0.6:
        notes.append(
            "More than 60% of the clip contains no detected speech energy, "
            "which reduces how much can be reliably assessed."
        )

    if total_dur < 2.0:
        notes.append(
            "Clip is shorter than 2 seconds. Very short clips reduce the "
            "reliability of pitch, energy, and spectral measurements."
        )

    return ForensicIndicators(
        clipping_ratio=round(clipping_ratio, 5),
        silence_ratio=round(max(0.0, silence_ratio), 4),
        dynamic_range_db=round(dynamic_range_db, 2),
        spectral_flatness_mean=round(spectral_flatness_mean, 5),
        zero_crossing_rate_mean=round(zcr_mean, 5),
        pitch_stability_score=round(pitch_stability_score, 4) if pitch_stability_score is not None else None,
        notes=notes,
    )


def analyze_audio_file(
    file_path: str, sample_rate_original: int = 0, channels_original: int = 0
) -> AudioAnalysisResult:
    y = load_and_normalize(file_path)
    duration = float(len(y) / TARGET_SR) if len(y) else 0.0

    waveform = _downsample_for_display(y, TARGET_SR, WAVEFORM_DISPLAY_POINTS)
    spectrogram = _compute_spectrogram(y, TARGET_SR)
    pitch = _compute_pitch(y, TARGET_SR)
    energy = _compute_energy(y, TARGET_SR)
    vad_segments = _compute_vad_segments(y, TARGET_SR)
    forensic = _compute_forensic_indicators(y, TARGET_SR, pitch, vad_segments)

    return AudioAnalysisResult(
        duration_sec=round(duration, 3),
        sample_rate_original=sample_rate_original,
        sample_rate_analyzed=TARGET_SR,
        channels_original=channels_original,
        waveform=waveform,
        spectrogram=spectrogram,
        pitch=pitch,
        energy=energy,
        vad_segments=vad_segments,
        forensic=forensic,
        normalized_waveform_16k_mono=y,
    )
