"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getAnalysis, updateAnalysis, API_BASE_URL, ApiError } from "@/lib/api";
import type { AnalysisDetail } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { Panel, Metric } from "@/components/Panel";
import { AssessmentBadge } from "@/components/AssessmentBadge";
import { ProcessingTimeline } from "@/components/ProcessingTimeline";
import { WaveformView } from "@/components/WaveformView";
import { SpectrogramView } from "@/components/SpectrogramView";
import { PitchChart, EnergyChart } from "@/components/Charts";
import { AudioPlayer } from "@/components/AudioPlayer";

const ASSESSMENT_EXPLANATION: Record<string, string> = {
  likely_human:
    "The anti-spoofing model's posterior probability favored genuine human speech for this clip, above the decision threshold.",
  suspicious_inconclusive:
    "The anti-spoofing model's output was close to the decision threshold. This is not a confident result in either direction.",
  likely_synthetic:
    "The anti-spoofing model's posterior probability favored spoofed/synthetic speech for this clip, above the decision threshold.",
  unavailable:
    "No anti-spoofing model inference could be run for this analysis, so no authenticity assessment is available. The signal-level measurements below were still computed from the real audio and may still be useful context.",
};

const NEXT_ACTION: Record<string, string> = {
  likely_human: "No strong spoof indicators were found. Standard verification practices still apply for any high-impact decision.",
  suspicious_inconclusive: "Treat this result as inconclusive. Seek independent verification before relying on this audio for any decision.",
  likely_synthetic: "Treat this audio with caution. Do not rely on it alone for identity verification or any high-impact decision; escalate for human review.",
  unavailable: "No model-based assessment is available. Do not treat the absence of a result as either a pass or a fail — escalate to manual review if this audio matters for a decision.",
};

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
    return () => {
      mounted = false;
    };
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
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-16">
          <p className="text-red border border-red/30 bg-red/5 px-4 py-3 text-sm">{error}</p>
          <Link href="/analyze" className="text-cyan text-sm mt-4 inline-block">
            Start a new analysis →
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!analysis) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto px-6 py-16 text-ink-dim text-sm">Loading analysis…</div>
      </AppShell>
    );
  }

  const isFailed = analysis.status === "failed";
  const antiSpoof = analysis.anti_spoof_model;

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-6">
        {/* 1. Assessment header */}
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="text-xs font-data text-ink-faint mb-2">
                ANALYSIS {analysis.id}
              </div>
              <AssessmentBadge assessment={analysis.assessment} />
            </div>
            <div className="text-right text-xs text-ink-faint font-data">
              <div>{new Date(analysis.created_at).toLocaleString()}</div>
              <div className="mt-1">
                Status:{" "}
                <span className={isFailed ? "text-red" : "text-emerald"}>
                  {analysis.status}
                </span>
              </div>
            </div>
          </div>

          {isFailed && (
            <p className="text-sm text-red border border-red/30 bg-red/5 px-4 py-3 mb-5">
              {analysis.error_message}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Metric label="Duration" value={analysis.duration_sec.toFixed(2)} unit="s" />
            <Metric label="Sample rate (original)" value={analysis.sample_rate_original || "—"} unit="Hz" />
            <Metric label="Channels" value={analysis.channels_original || "—"} />
            <Metric label="Codec" value={analysis.codec || "—"} />
          </div>

          <div className="mt-4 grid md:grid-cols-2 gap-3 text-xs font-data text-ink-faint">
            <div className="border border-hairline px-4 py-3 truncate">
              <div className="text-ink-faint mb-1">Original file SHA-256</div>
              <div className="text-ink-dim truncate">{analysis.original_file_sha256 || "—"}</div>
            </div>
            <div className="border border-hairline px-4 py-3 truncate">
              <div className="text-ink-faint mb-1">Normalized audio SHA-256</div>
              <div className="text-ink-dim truncate">{analysis.normalized_audio_sha256 || "—"}</div>
            </div>
          </div>
        </Panel>

        {!isFailed && (
          <>
            {/* Audio player */}
            <AudioPlayer
              src={`${API_BASE_URL}/api/v1/analyses/${analysis.id}/audio`}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              seekTo={seekTo}
            />

            {/* 2. Evidence and explanation */}
            <div className="grid md:grid-cols-2 gap-6">
              <Panel eyebrow="Anti-spoofing model" title="Model evidence">
                {antiSpoof.status === "ok" ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ink-dim">Model</span>
                      <span className="font-data text-ink">{antiSpoof.model_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-dim">Bonafide probability</span>
                      <span className="font-data text-ink">
                        {((antiSpoof.bonafide_probability ?? 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-dim">Spoof probability</span>
                      <span className="font-data text-ink">
                        {((antiSpoof.spoof_probability ?? 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-dim">Decision threshold</span>
                      <span className="font-data text-ink">{antiSpoof.threshold}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-ink-dim">
                    <p className="text-amber mb-2 font-medium">Model unavailable — no authenticity assessment generated.</p>
                    <p className="font-data text-xs text-ink-faint">{antiSpoof.reason}</p>
                  </div>
                )}
              </Panel>

              <Panel eyebrow="Signal-quality indicators (not model output)" title="Forensic observations">
                <div className="space-y-2 text-sm mb-3">
                  <Row label="Clipping" value={`${(analysis.forensic_indicators.clipping_ratio * 100).toFixed(2)}%`} />
                  <Row label="Silence ratio" value={`${(analysis.forensic_indicators.silence_ratio * 100).toFixed(1)}%`} />
                  <Row label="Dynamic range" value={`${analysis.forensic_indicators.dynamic_range_db.toFixed(1)} dB`} />
                  <Row label="Spectral flatness" value={analysis.forensic_indicators.spectral_flatness_mean.toFixed(4)} />
                  <Row label="Zero-crossing rate" value={analysis.forensic_indicators.zero_crossing_rate_mean.toFixed(4)} />
                  {analysis.forensic_indicators.pitch_stability_score != null && (
                    <Row label="Pitch stability (std of Δf0)" value={analysis.forensic_indicators.pitch_stability_score.toFixed(3)} />
                  )}
                </div>
                {analysis.forensic_indicators.notes.length > 0 && (
                  <ul className="space-y-1.5 text-xs text-ink-faint border-t border-hairline pt-3">
                    {analysis.forensic_indicators.notes.map((note, i) => (
                      <li key={i}>— {note}</li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel eyebrow="Summary" title="What this means &amp; recommended next action">
              <p className="text-sm text-ink-dim mb-4 leading-relaxed">
                {ASSESSMENT_EXPLANATION[analysis.assessment] ?? ASSESSMENT_EXPLANATION.unavailable}
              </p>
              <p className="text-sm text-ink border-t border-hairline pt-4">
                <span className="text-ink-faint">Recommended next action: </span>
                {NEXT_ACTION[analysis.assessment] ?? NEXT_ACTION.unavailable}
              </p>
            </Panel>

            {/* 3. Real audio visualizations */}
            <Panel eyebrow="Time domain" title="Waveform">
              <WaveformView
                waveform={analysis.features.waveform}
                vadSegments={analysis.features.vad_segments}
                durationSec={analysis.duration_sec}
                currentTime={currentTime}
                onSeek={setSeekTo}
              />
            </Panel>

            <div className="grid md:grid-cols-2 gap-6">
              <Panel eyebrow="Frequency domain" title="Mel spectrogram">
                <SpectrogramView spectrogram={analysis.features.spectrogram} />
              </Panel>
              <Panel
                eyebrow={`Voiced ${((analysis.features.pitch.voiced_fraction) * 100).toFixed(0)}% · mean ${
                  analysis.features.pitch.mean_f0 != null ? analysis.features.pitch.mean_f0.toFixed(1) + " Hz" : "—"
                }`}
                title="Pitch (f0) contour"
              >
                <PitchChart pitch={analysis.features.pitch} />
              </Panel>
            </div>

            <Panel eyebrow="Loudness" title="RMS energy over time">
              <EnergyChart energy={analysis.features.energy} />
            </Panel>

            {/* Processing timeline */}
            <Panel eyebrow="Pipeline" title="Processing timeline">
              <ProcessingTimeline steps={analysis.processing_steps} />
            </Panel>
          </>
        )}

        {/* Case management */}
        <Panel eyebrow="Case management" title="Notes &amp; labeling">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-faint block mb-1">Case label</label>
              <input
                value={caseLabel}
                onChange={(e) => setCaseLabel(e.target.value)}
                placeholder="e.g. Case #2026-014"
                className="w-full bg-void border border-hairline px-3 py-2 text-sm text-ink focus:border-cyan/60"
              />
            </div>
            <div>
              <label className="text-xs text-ink-faint block mb-1">Analyst notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add context for this analysis…"
                className="w-full bg-void border border-hairline px-3 py-2 text-sm text-ink focus:border-cyan/60"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="px-4 py-2 border border-hairline-bright text-sm text-ink hover:border-cyan/60 disabled:opacity-50 transition-colors"
            >
              {savingNotes ? "Saving…" : "Save"}
            </button>
          </div>
        </Panel>

        <p className="text-xs text-ink-faint text-center pt-4">
          Comparison mode, speaker verification, liveness challenge, and PDF export are not implemented in
          this build — see the <Link href="/model" className="text-cyan">Model &amp; Limitations</Link> page for what is and isn&apos;t available.
        </p>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-dim">{label}</span>
      <span className="font-data text-ink">{value}</span>
    </div>
  );
}
