"use client";

import { useState } from "react";
import type {
  TranscriptionResult,
  TranscriptAnalysisResult,
  TranscriptSegment,
} from "@/lib/types";
import { Panel } from "./Panel";

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  mr: "Marathi",
  gu: "Gujarati",
  ur: "Urdu",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
};

const SEVERITY_STYLES: Record<string, { badge: string; border: string; bg: string }> = {
  high: {
    badge: "text-red border-red/40 bg-red/10",
    border: "border-red/30",
    bg: "bg-red/[0.03]",
  },
  medium: {
    badge: "text-amber border-amber/40 bg-amber/10",
    border: "border-amber/30",
    bg: "bg-amber/[0.03]",
  },
  low: {
    badge: "text-cyan border-cyan/40 bg-cyan/10",
    border: "border-cyan/30",
    bg: "bg-cyan/[0.03]",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  otp_request: "OTP / Verification Code Request",
  password_request: "Credentials & Passcode Harvesting",
  urgency_threat: "Coercion, Arrest Threats & Urgency",
  impersonation: "Authority Impersonation (Police/Bank/Customs)",
  payment_instruction: "Payment / Transfer Demand",
  suspicious_instruction: "Suspicious Instruction (Remote Access/APK)",
};

interface TranscriptViewProps {
  transcription?: TranscriptionResult;
  transcriptAnalysis?: TranscriptAnalysisResult;
  currentTime?: number;
  onSeek?: (time: number) => void;
}

export function TranscriptView({
  transcription,
  transcriptAnalysis,
  currentTime = 0,
  onSeek,
}: TranscriptViewProps) {
  const [viewMode, setViewMode] = useState<"transcript" | "segments">("transcript");
  const [copied, setCopied] = useState(false);

  if (!transcription || transcription.status === "unavailable") {
    return (
      <Panel
        eyebrow="Spoken content analysis"
        title="Speech Recognition & Transcript Analysis"
      >
        <div className="border border-hairline bg-void/50 p-6 text-sm text-ink-dim space-y-2">
          <div className="flex items-center gap-2 text-amber font-medium">
            <span className="w-2 h-2 rounded-full bg-amber inline-block" />
            Speech recognition unavailable
          </div>
          <p className="text-xs text-ink-faint leading-relaxed font-data">
            {transcription?.reason ||
              "The ASR service (Whisper Large-v3 Turbo) is initializing or was not loaded for this analysis."}
          </p>
          <p className="text-xs text-ink-faint pt-2 border-t border-hairline">
            Notice: Audio signal forensics and anti-spoofing analysis operate independently and remain fully available above.
          </p>
        </div>
      </Panel>
    );
  }

  if (transcription.status === "failed") {
    return (
      <Panel eyebrow="Spoken content analysis" title="Speech Recognition & Transcript Analysis">
        <div className="border border-red/30 bg-red/5 p-5 text-sm text-red">
          <div className="font-medium mb-1">Transcription failed</div>
          <div className="text-xs font-data text-red/80">{transcription.error || "Unknown ASR processing error"}</div>
        </div>
      </Panel>
    );
  }

  const langCode = (transcription.language || "").toLowerCase();
  const langName = LANGUAGE_NAMES[langCode] || langCode.toUpperCase();
  const langConfidence =
    transcription.language_probability != null
      ? `${(transcription.language_probability * 100).toFixed(0)}%`
      : null;

  const segments = transcription.segments || [];
  const indicators = transcriptAnalysis?.indicators || [];
  const text = transcription.text || "";

  function handleCopy() {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Distinction Header Banner */}
      <div className="border border-hairline bg-void/70 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <span className="font-semibold text-cyan uppercase tracking-wider text-[10px]">
            Content Analysis vs. Voice Authenticity
          </span>
          <p className="text-ink-dim text-[11px] leading-relaxed">
            Audio authenticity (AASIST above) assesses whether the physical voice was synthetically generated.
            Spoken-content analysis evaluates what words were spoken for known scam and social engineering indicators.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto shrink-0 font-data">
          <span className="border border-hairline px-2.5 py-1 text-ink bg-panel/40">
            Language: <strong className="text-cyan">{langName}</strong>
            {langConfidence && <span className="text-ink-faint ml-1">({langConfidence})</span>}
          </span>
          <span className="border border-hairline px-2.5 py-1 text-ink bg-panel/40">
            Model: <span className="text-ink-dim">{transcription.model_name || "Whisper Large-v3 Turbo"}</span>
          </span>
        </div>
      </div>

      {/* Main Transcript Panel */}
      <Panel
        eyebrow={`Recognized ${segments.length} segment(s) · ${transcription.processing_time_ms ? (transcription.processing_time_ms / 1000).toFixed(1) + "s ASR latency" : ""}`}
        title="Spoken Transcript"
        action={
          <div className="flex items-center gap-2 text-xs">
            <div className="border border-hairline flex">
              <button
                type="button"
                onClick={() => setViewMode("transcript")}
                className={`px-3 py-1 font-data transition-colors ${
                  viewMode === "transcript"
                    ? "bg-cyan/15 text-cyan border-r border-cyan/40"
                    : "text-ink-dim hover:text-ink border-r border-hairline"
                }`}
              >
                Full Text
              </button>
              <button
                type="button"
                onClick={() => setViewMode("segments")}
                className={`px-3 py-1 font-data transition-colors ${
                  viewMode === "segments"
                    ? "bg-cyan/15 text-cyan"
                    : "text-ink-dim hover:text-ink"
                }`}
              >
                Timed Segments
              </button>
            </div>
            {text && (
              <button
                type="button"
                onClick={handleCopy}
                className="border border-hairline px-2.5 py-1 text-ink-dim hover:text-ink hover:border-hairline-bright transition-colors font-data"
              >
                {copied ? "Copied ✓" : "Copy"}
              </button>
            )}
          </div>
        }
      >
        {!text ? (
          <div className="py-8 text-center text-sm text-ink-faint">
            No spoken dialogue or audible speech was transcribed from this audio clip.
          </div>
        ) : viewMode === "transcript" ? (
          <div className="bg-void/40 border border-hairline p-5 rounded-none font-sans text-sm text-ink leading-relaxed whitespace-pre-wrap selection:bg-cyan/30">
            {text}
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {segments.map((seg) => {
              const isActive = currentTime >= seg.start && currentTime <= seg.end;
              return (
                <div
                  key={seg.id}
                  onClick={() => onSeek?.(seg.start)}
                  className={`p-3 border text-xs cursor-pointer transition-all ${
                    isActive
                      ? "border-cyan/70 bg-cyan/10 text-ink shadow-sm"
                      : "border-hairline bg-void/30 text-ink-dim hover:border-hairline-bright hover:text-ink"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 font-data text-[10px]">
                    <span className={isActive ? "text-cyan font-bold" : "text-ink-faint"}>
                      [{seg.start.toFixed(2)}s – {seg.end.toFixed(2)}s]
                    </span>
                    {isActive && (
                      <span className="text-cyan uppercase text-[9px] tracking-wider animate-pulse">
                        Playing
                      </span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{seg.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {/* Transcript-based Scam Indicators Panel */}
      <Panel
        eyebrow="Heuristic pattern matching"
        title="Spoken Content Scam &amp; Social Engineering Indicators"
      >
        <div className="space-y-4">
          {/* Summary Box */}
          <div className="text-xs text-ink-dim border-b border-hairline pb-3">
            <p className="leading-relaxed">
              {transcriptAnalysis?.summary ||
                "No suspicious patterns identified in transcript."}
            </p>
            <p className="text-[11px] text-ink-faint mt-1 italic">
              {transcriptAnalysis?.disclaimer ||
                "Rule-based heuristic observations only — absence of indicators is not proof of authenticity, and detected phrases do not prove fraud."}
            </p>
          </div>

          {indicators.length === 0 ? (
            <div className="p-4 border border-hairline bg-void/30 text-xs text-ink-dim flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald shrink-0" />
              <span>
                No explicit financial requests, OTP solicitations, or coercion keywords matched the baseline rule set.
              </span>
            </div>
          ) : (
            <div className="grid gap-3">
              {indicators.map((ind, i) => {
                const style = SEVERITY_STYLES[ind.severity] || SEVERITY_STYLES.low;
                const catLabel = CATEGORY_LABELS[ind.category] || ind.category;
                return (
                  <div
                    key={i}
                    className={`border ${style.border} ${style.bg} p-3.5 text-xs transition-colors`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`uppercase text-[10px] font-bold font-data px-2 py-0.5 border ${style.badge}`}
                        >
                          {ind.severity}
                        </span>
                        <span className="font-semibold text-ink text-xs">{catLabel}</span>
                      </div>
                      <span className="font-data text-[11px] text-ink-dim bg-panel px-2 py-0.5 border border-hairline">
                        Matched: &quot;<strong className="text-ink">{ind.matched_text}</strong>&quot;
                      </span>
                    </div>
                    <p className="text-ink-dim text-[11px] leading-relaxed mt-1">
                      {ind.note}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
