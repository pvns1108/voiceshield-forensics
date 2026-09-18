export interface ProcessingStep {
  step: string;
  started_at: string;
  duration_ms: number;
  status: "ok" | "failed";
  error?: string | null;
}

export interface WaveformSeries {
  times: number[];
  amplitudes: number[];
}

export interface SpectrogramData {
  times: number[];
  freqs: number[];
  db: number[][];
}

export interface PitchContour {
  times: number[];
  f0_hz: (number | null)[];
  voiced_fraction: number;
  mean_f0: number | null;
  std_f0: number | null;
}

export interface EnergyTimeline {
  times: number[];
  rms: number[];
}

export interface VadSegment {
  start: number;
  end: number;
  kind: "speech" | "silence";
}

export interface Features {
  waveform: WaveformSeries;
  spectrogram: SpectrogramData;
  pitch: PitchContour;
  energy: EnergyTimeline;
  vad_segments: VadSegment[];
}

export interface ForensicIndicators {
  clipping_ratio: number;
  silence_ratio: number;
  dynamic_range_db: number;
  spectral_flatness_mean: number;
  zero_crossing_rate_mean: number;
  pitch_stability_score: number | null;
  notes: string[];
}

export interface AntiSpoofModelResult {
  status: "ok" | "unavailable";
  reason?: string | null;
  model_name?: string;
  model_commit?: string;
  bonafide_probability?: number;
  spoof_probability?: number;
  label?: "bonafide" | "spoof";
  threshold?: number;
}

export type Assessment =
  | "likely_human"
  | "suspicious_inconclusive"
  | "likely_synthetic"
  | "unavailable"
  | "";

export type AnalysisStatus =
  | "queued"
  | "validating"
  | "preprocessing"
  | "extracting_features"
  | "hashing_normalized_audio"
  | "model_inference"
  | "generating_report"
  | "complete"
  | "failed";

export interface AnalysisSummary {
  id: string;
  original_filename: string;
  status: AnalysisStatus;
  assessment: Assessment;
  duration_sec: number;
  created_at: string;
  case_label: string;
  tags: string[];
}

export interface AnalysisDetail {
  id: string;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  original_file_sha256: string;
  normalized_audio_sha256: string;

  duration_sec: number;
  sample_rate_original: number;
  sample_rate_analyzed: number;
  channels_original: number;
  codec: string;

  status: AnalysisStatus;
  error_message: string;
  processing_steps: ProcessingStep[];

  assessment: Assessment;
  features: Features;
  forensic_indicators: ForensicIndicators;
  anti_spoof_model: AntiSpoofModelResult;

  case_label: string;
  notes: string;
  tags: string[];

  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  model_name: string;
  source_repository: string;
  vendored_commit: string;
  license: string;
  training_dataset: string;
  input_sample_rate_hz: number;
  input_fixed_length_samples: number;
  output_label_mapping: Record<string, string>;
  decision_threshold: number;
  threshold_note: string;
  runtime_status: "available" | "unavailable";
  unavailable_reason: string | null;
  limitations: string[];
}

export interface ApiErrorBody {
  detail: string;
}
