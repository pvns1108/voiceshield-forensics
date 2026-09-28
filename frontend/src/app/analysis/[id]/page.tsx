"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAnalysis, updateAnalysis, API_BASE_URL, ApiError } from "@/lib/api";
import type { AnalysisDetail } from "@/lib/types";
import { PageShell } from "@/components/layout/PageShell";
import { WaveformView } from "@/components/WaveformView";
import { SpectrogramView } from "@/components/SpectrogramView";
import { PitchChart, EnergyChart } from "@/components/Charts";
import { AudioPlayer } from "@/components/AudioPlayer";
import { TranscriptView } from "@/components/TranscriptView";

/* ── Assessment config ─────────────────────────────────────────────────── */
const ASSESSMENT_CFG = {
  likely_human: {
    label: "Likely Human Speech",
    color: "var(--c-human)",
    bg: "var(--c-human-bg)",
    explanation:
      "The anti-spoofing model's posterior probability favored genuine human speech for this clip, above the decision threshold.",
    action:
      "No strong spoof indicators were found. Standard verification practices still apply for any high-impact decision.",
  },
  suspicious_inconclusive: {
    label: "Suspicious / Inconclusive",
    color: "var(--c-inconc)",
    bg: "var(--c-inconc-bg)",
    explanation:
      "The anti-spoofing model output was close to the decision threshold — not a confident result in either direction.",
    action:
      "Treat this result as inconclusive. Seek independent verification before relying on this audio for any decision.",
  },
  likely_synthetic: {
    label: "Likely Synthetic or Spoofed",
    color: "var(--c-synth)",
    bg: "var(--c-synth-bg)",
    explanation:
      "The anti-spoofing model's posterior probability favored spoofed/synthetic speech for this clip, above the decision threshold.",
    action:
      "Do not rely on this audio alone for identity verification or any high-impact decision — escalate for human review.",
  },
  unavailable: {
    label: "Assessment Unavailable",
    color: "var(--c-unavail)",
    bg: "var(--c-unavail-bg)",
    explanation:
      "No anti-spoofing model inference could be run. Signal-level measurements were still computed from the real audio.",
    action:
      "Absence of a result is not a pass or a fail. Escalate to manual review if this audio matters for a decision.",
  },
  "": {
    label: "Pending",
    color: "var(--c-unavail)",
    bg: "var(--c-unavail-bg)",
    explanation: "",
    action: "",
  },
} as const;

const STEP_LABELS: Record<string, string> = {
  validating: "Validating audio",
  extracting_features: "Extracting signal features",
  hashing_normalized_audio: "Hashing normalized audio",
  transcription: "Speech recognition (ASR)",
  transcript_analysis: "Transcript scam indicator scan",
  model_inference: "Anti-spoof model inference",
  generating_report: "Generating report",
};

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function AnalysisResultPage() {
  const params = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<AnalysisDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [caseLabel, setCaseLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    let mounted = true;
    getAnalysis(params.id)
      .then((data) => {
        if (!mounted) return;
        setAnalysis(data);
        setCaseLabel(data.case_label);
        setNotes(data.notes);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof ApiError ? err.message : "Failed to load analysis.");
      });
    return () => { mounted = false; };
  }, [params.id]);

  async function handleSaveNotes() {
    if (!analysis) return;
    setSavingNotes(true);
    try {
      const updated = await updateAnalysis(analysis.id, { case_label: caseLabel, notes });
      setAnalysis(updated);
    } finally {
      setSavingNotes(false);
    }
  }

  if (error) {
    return (
      <PageShell>
        <div className="mx-auto px-[var(--gutter)] py-20 max-w-2xl">
          <p
            className="border border-[var(--c-synth)]/40 bg-[var(--c-synth-bg)] px-5 py-4 font-[var(--font-mono)] text-[var(--c-synth)]"
            style={{ fontSize: "var(--t-small)" }}
          >
            {error}
          </p>
          <Link
            href="/analyze"
            className="mt-6 inline-block font-[var(--font-mono)] text-[var(--t-small)] text-[var(--c-amber)] tracking-[0.08em] uppercase"
          >
            Start a new analysis →
          </Link>
        </div>
      </PageShell>
    );
  }

  if (!analysis) {
    return (
      <PageShell>
        <div
          className="mx-auto px-[var(--gutter)] py-20 max-w-2xl font-[var(--font-mono)] text-[var(--c-faint)]"
          style={{ fontSize: "var(--t-small)" }}
          aria-busy="true"
          aria-live="polite"
        >
          Loading analysis…
        </div>
      </PageShell>
    );
  }

  const isFailed = analysis.status === "failed";
  const assessment = (analysis.assessment || "unavailable") as keyof typeof ASSESSMENT_CFG;
  const cfg = ASSESSMENT_CFG[assessment] ?? ASSESSMENT_CFG.unavailable;
  const antiSpoof = analysis.anti_spoof_model;

  return (
    <PageShell>
      <div
        className="mx-auto px-[var(--gutter)] py-12 space-y-0"
        style={{ maxWidth: "var(--max-w)" }}
      >
        {/* ── DOSSIER HEADER ── */}
        <section
          className="border-b border-[var(--c-rule)] pb-10 mb-10"
          aria-label="Assessment header"
        >
          {/* ID + timestamp */}
          <div className="flex flex-wrap items-baseline justify-between gap-4 mb-8">
            <div
              className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)]"
            >
              Analysis &middot; {analysis.id}
            </div>
            <div
              className="font-[var(--font-mono)] text-[var(--t-micro)] text-[var(--c-faint)]"
            >
              {new Date(analysis.created_at).toLocaleString()}
            </div>
          </div>

          {/* Assessment callout — large, unambiguous */}
          <div
            className="inline-flex items-center gap-3 px-4 py-2 mb-6 border"
            style={{
              borderColor: cfg.color,
              background: cfg.bg,
            }}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: cfg.color }}
              aria-hidden="true"
            />
            <span
              className="font-[var(--font-mono)] tracking-[0.1em] uppercase"
              style={{ color: cfg.color, fontSize: "var(--t-small)" }}
            >
              {cfg.label}
            </span>
          </div>

          {isFailed && (
            <p
              className="border border-[var(--c-synth)]/40 bg-[var(--c-synth-bg)] px-4 py-3 mb-6 font-[var(--font-mono)] text-[var(--c-synth)]"
              style={{ fontSize: "var(--t-small)" }}
            >
              {analysis.error_message}
            </p>
          )}

          {/* Oversized metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-t border-[var(--c-rule)] mt-6">
            {[
              { label: "Duration", value: analysis.duration_sec.toFixed(2), unit: "s" },
              { label: "Sample rate", value: analysis.sample_rate_original || "—", unit: "Hz" },
              { label: "Channels", value: String(analysis.channels_original || "—") },
              { label: "Codec", value: analysis.codec || "—" },
            ].map((m) => (
              <div
                key={m.label}
                className="border-r border-b border-[var(--c-rule)] px-4 pt-5 pb-4 last:border-r-0"
              >
                <div
                  className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.12em] uppercase text-[var(--c-faint)] mb-2"
                >
                  {m.label}
                </div>
                <div
                  className="font-[var(--font-mono)] text-[var(--c-bone)] leading-none"
                  style={{ fontSize: "clamp(1.5rem,3vw,2.25rem)" }}
                >
                  {m.value}
                  {m.unit && (
                    <span
                      className="ml-1.5 text-[var(--c-dim)]"
                      style={{ fontSize: "var(--t-small)" }}
                    >
                      {m.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* SHA-256 hashes */}
          <div className="grid sm:grid-cols-2 gap-0 border border-[var(--c-rule)] mt-4 border-t-0">
            {[
              { label: "Original file SHA-256", value: analysis.original_file_sha256 },
              { label: "Normalized audio SHA-256", value: analysis.normalized_audio_sha256 },
            ].map((h) => (
              <div key={h.label} className="px-4 py-3 border-b border-r border-[var(--c-rule)] last:border-r-0">
                <div
                  className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mb-1"
                >
                  {h.label}
                </div>
                <div
                  className="font-[var(--font-mono)] text-[var(--c-dim)] break-all"
                  style={{ fontSize: "var(--t-micro)" }}
                >
                  {h.value || "—"}
                </div>
              </div>
            ))}
          </div>
        </section>

        {!isFailed && (
          <>
            {/* ── AUDIO PLAYER ── */}
            <section className="mb-10" aria-label="Audio playback">
              <SectionLabel>Playback</SectionLabel>
              <AudioPlayer
                src={`${API_BASE_URL}/api/v1/analyses/${analysis.id}/audio`}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                seekTo={seekTo}
              />
            </section>

            {/* ── MODEL EVIDENCE + FORENSIC INDICATORS ── */}
            <section className="border-b border-[var(--c-rule)] pb-10 mb-10" aria-label="Model evidence">
              <SectionLabel>Model evidence</SectionLabel>
              <div className="grid lg:grid-cols-2 gap-0 border border-[var(--c-rule)]">

                {/* Anti-spoof panel */}
                <div className="border-r border-[var(--c-rule)] p-6">
                  <PanelEyebrow>Anti-spoofing model (AASIST)</PanelEyebrow>
                  {antiSpoof.status === "ok" ? (
                    <div className="space-y-3">
                      {/* Probability bars */}
                      {[
                        { label: "Bonafide probability", value: antiSpoof.bonafide_probability ?? 0, color: "var(--c-human)" },
                        { label: "Spoof probability", value: antiSpoof.spoof_probability ?? 0, color: "var(--c-synth)" },
                      ].map((p) => (
                        <div key={p.label}>
                          <div className="flex justify-between mb-1">
                            <span
                              className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.08em] uppercase text-[var(--c-dim)]"
                            >
                              {p.label}
                            </span>
                            <span
                              className="font-[var(--font-mono)] text-[var(--c-bone)]"
                              style={{ fontSize: "var(--t-small)" }}
                            >
                              {(p.value * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-px bg-[var(--c-rule)] relative">
                            <div
                              className="absolute top-0 left-0 h-px transition-all duration-[var(--dur-slow)]"
                              style={{ width: `${p.value * 100}%`, background: p.color }}
                              role="meter"
                              aria-valuenow={Math.round(p.value * 100)}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-label={p.label}
                            />
                          </div>
                        </div>
                      ))}
                      <DataRow label="Decision threshold" value={String(antiSpoof.threshold)} />
                      <DataRow label="Model" value={antiSpoof.model_name || "AASIST"} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div
                        className="font-[var(--font-mono)] text-[var(--c-inconc)]"
                        style={{ fontSize: "var(--t-small)" }}
                      >
                        Model unavailable — no authenticity assessment generated.
                      </div>
                      <p
                        className="font-[var(--font-mono)] text-[var(--c-faint)] leading-relaxed"
                        style={{ fontSize: "var(--t-micro)" }}
                      >
                        {antiSpoof.reason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Forensic indicators */}
                <div className="p-6">
                  <PanelEyebrow>Signal-quality indicators (not model output)</PanelEyebrow>
                  <div className="space-y-2 mb-4">
                    <DataRow label="Clipping" value={`${(analysis.forensic_indicators.clipping_ratio * 100).toFixed(2)}%`} />
                    <DataRow label="Silence ratio" value={`${(analysis.forensic_indicators.silence_ratio * 100).toFixed(1)}%`} />
                    <DataRow label="Dynamic range" value={`${analysis.forensic_indicators.dynamic_range_db.toFixed(1)} dB`} />
                    <DataRow label="Spectral flatness" value={analysis.forensic_indicators.spectral_flatness_mean.toFixed(4)} />
                    <DataRow label="Zero-crossing rate" value={analysis.forensic_indicators.zero_crossing_rate_mean.toFixed(4)} />
                    {analysis.forensic_indicators.pitch_stability_score != null && (
                      <DataRow label="Pitch stability (std Δf0)" value={analysis.forensic_indicators.pitch_stability_score.toFixed(3)} />
                    )}
                  </div>
                  {analysis.forensic_indicators.notes.length > 0 && (
                    <ul className="space-y-1 border-t border-[var(--c-rule)] pt-3">
                      {analysis.forensic_indicators.notes.map((note, i) => (
                        <li
                          key={i}
                          className="font-[var(--font-mono)] text-[var(--c-faint)] leading-relaxed"
                          style={{ fontSize: "var(--t-micro)" }}
                        >
                          — {note}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Interpretation */}
              <div className="border border-t-0 border-[var(--c-rule)] p-6 bg-[var(--c-surface)]">
                <PanelEyebrow>Interpretation</PanelEyebrow>
                <p
                  className="text-[var(--c-dim)] mb-4"
                  style={{ fontSize: "var(--t-body)", lineHeight: "var(--lh-loose)" }}
                >
                  {cfg.explanation}
                </p>
                <div className="border-t border-[var(--c-rule)] pt-4">
                  <span
                    className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mr-2"
                  >
                    Recommended next action:
                  </span>
                  <span className="text-[var(--c-bone)]" style={{ fontSize: "var(--t-small)" }}>
                    {cfg.action}
                  </span>
                </div>
              </div>
            </section>

            {/* ── TRANSCRIPT + SPOKEN CONTENT ── */}
            <section className="border-b border-[var(--c-rule)] pb-10 mb-10" aria-label="Transcript analysis">
              <SectionLabel>Spoken content analysis</SectionLabel>
              <TranscriptView
                transcription={analysis.transcription}
                transcriptAnalysis={analysis.transcript_analysis}
                currentTime={currentTime}
                onSeek={setSeekTo}
              />
            </section>

            {/* ── WAVEFORM (dominant visual) ── */}
            <section className="border-b border-[var(--c-rule)] pb-10 mb-10" aria-label="Waveform">
              <SectionLabel>Waveform — time domain</SectionLabel>
              <div className="border border-[var(--c-rule)] bg-[var(--c-ground)] p-4">
                <WaveformView
                  waveform={analysis.features.waveform}
                  vadSegments={analysis.features.vad_segments}
                  durationSec={analysis.duration_sec}
                  currentTime={currentTime}
                  onSeek={setSeekTo}
                  height={160}
                />
              </div>
            </section>

            {/* ── SPECTROGRAM + PITCH ── */}
            <section className="border-b border-[var(--c-rule)] pb-10 mb-10" aria-label="Spectrogram and pitch">
              <SectionLabel>Frequency domain</SectionLabel>
              <div className="grid lg:grid-cols-2 gap-0 border border-[var(--c-rule)]">
                <div className="border-r border-[var(--c-rule)]">
                  <div className="border-b border-[var(--c-rule)] px-4 py-2">
                    <PanelEyebrow>Mel spectrogram</PanelEyebrow>
                  </div>
                  <div className="spec-reveal">
                    <SpectrogramView spectrogram={analysis.features.spectrogram} height={220} />
                  </div>
                </div>
                <div>
                  <div className="border-b border-[var(--c-rule)] px-4 py-2">
                    <PanelEyebrow>
                      Pitch contour (f0) &middot; voiced{" "}
                      {(analysis.features.pitch.voiced_fraction * 100).toFixed(0)}%
                      {analysis.features.pitch.mean_f0 != null && (
                        <> &middot; mean {analysis.features.pitch.mean_f0.toFixed(1)} Hz</>
                      )}
                    </PanelEyebrow>
                  </div>
                  <div className="p-4">
                    <PitchChart pitch={analysis.features.pitch} height={188} />
                  </div>
                </div>
              </div>
            </section>

            {/* ── RMS ENERGY ── */}
            <section className="border-b border-[var(--c-rule)] pb-10 mb-10" aria-label="RMS energy">
              <SectionLabel>RMS energy — loudness over time</SectionLabel>
              <div className="border border-[var(--c-rule)] bg-[var(--c-ground)] p-4">
                <EnergyChart energy={analysis.features.energy} height={100} />
              </div>
            </section>

            {/* ── PROCESSING TIMELINE ── */}
            <section className="border-b border-[var(--c-rule)] pb-10 mb-10" aria-label="Processing pipeline">
              <SectionLabel>Processing pipeline</SectionLabel>
              <div className="border border-[var(--c-rule)] divide-y divide-[var(--c-rule)]">
                {analysis.processing_steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-4 px-4 py-3 readout-step"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${step.status === "ok" ? "bg-[var(--c-human)]" : "bg-[var(--c-synth)]"}`}
                        aria-hidden="true"
                      />
                      <span
                        className="font-[var(--font-mono)] text-[var(--c-dim)]"
                        style={{ fontSize: "var(--t-small)" }}
                      >
                        {STEP_LABELS[step.step] ?? step.step}
                      </span>
                    </div>
                    <span
                      className="font-[var(--font-mono)] text-[var(--c-faint)] shrink-0"
                      style={{ fontSize: "var(--t-micro)" }}
                    >
                      {step.duration_ms.toFixed(1)} ms
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ── CASE NOTES ── */}
        <section className="border-b border-[var(--c-rule)] pb-10 mb-10" aria-label="Case management">
          <SectionLabel>Case notes</SectionLabel>
          <div className="border border-[var(--c-rule)] divide-y divide-[var(--c-rule)]">
            <div className="p-5">
              <label
                htmlFor="case-label-input"
                className="block font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mb-2"
              >
                Case label
              </label>
              <input
                id="case-label-input"
                value={caseLabel}
                onChange={(e) => setCaseLabel(e.target.value)}
                placeholder="e.g. Case #2026-014"
                className="w-full bg-[var(--c-ground)] border border-[var(--c-rule)] px-3 py-2 font-[var(--font-mono)] text-[var(--c-bone)] placeholder:text-[var(--c-faint)] focus:border-[var(--c-amber)] outline-none"
                style={{ fontSize: "var(--t-small)" }}
              />
            </div>
            <div className="p-5">
              <label
                htmlFor="analyst-notes-input"
                className="block font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mb-2"
              >
                Analyst notes
              </label>
              <textarea
                id="analyst-notes-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add context for this analysis…"
                className="w-full bg-[var(--c-ground)] border border-[var(--c-rule)] px-3 py-2 font-[var(--font-mono)] text-[var(--c-bone)] placeholder:text-[var(--c-faint)] focus:border-[var(--c-amber)] outline-none resize-y"
                style={{ fontSize: "var(--t-small)" }}
              />
            </div>
            <div className="p-5 flex justify-end">
              <button
                type="button"
                id="save-notes-btn"
                onClick={handleSaveNotes}
                disabled={savingNotes}
                className="px-5 py-2 border border-[var(--c-rule-hi)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase text-[var(--c-dim)] hover:border-[var(--c-amber)] hover:text-[var(--c-bone)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-[var(--dur-fast)]"
              >
                {savingNotes ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </section>

        {/* Not-implemented notice */}
        <p
          className="text-center font-[var(--font-mono)] text-[var(--c-faint)]"
          style={{ fontSize: "var(--t-micro)" }}
        >
          Speaker verification, liveness challenge, side-by-side comparison, and PDF export are not implemented.
          See{" "}
          <Link href="/model" className="text-[var(--c-amber)] underline underline-offset-2">
            Model & limitations
          </Link>{" "}
          for detail.
        </p>
      </div>
    </PageShell>
  );
}

/* ── Sub-components ── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)] mb-4"
    >
      {children}
    </div>
  );
}

function PanelEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.12em] uppercase text-[var(--c-faint)] mb-4"
    >
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-[var(--c-rule)] last:border-0">
      <span
        className="font-[var(--font-mono)] text-[var(--c-dim)]"
        style={{ fontSize: "var(--t-small)" }}
      >
        {label}
      </span>
      <span
        className="font-[var(--font-mono)] text-[var(--c-bone)] tabular-nums"
        style={{ fontSize: "var(--t-small)" }}
      >
        {value}
      </span>
    </div>
  );
}
