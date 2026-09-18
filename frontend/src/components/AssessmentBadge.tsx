import type { Assessment } from "@/lib/types";

const CONFIG: Record<
  Assessment,
  { label: string; color: string; bg: string; border: string }
> = {
  likely_human: {
    label: "Likely Human Speech",
    color: "var(--emerald)",
    bg: "rgba(52,211,153,0.1)",
    border: "rgba(52,211,153,0.4)",
  },
  suspicious_inconclusive: {
    label: "Suspicious / Inconclusive",
    color: "var(--amber)",
    bg: "rgba(251,191,36,0.1)",
    border: "rgba(251,191,36,0.4)",
  },
  likely_synthetic: {
    label: "Likely Synthetic or Spoofed",
    color: "var(--red)",
    bg: "rgba(248,113,113,0.1)",
    border: "rgba(248,113,113,0.4)",
  },
  unavailable: {
    label: "Analysis Unavailable",
    color: "var(--ink-dim)",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.35)",
  },
  "": {
    label: "Pending",
    color: "var(--ink-dim)",
    bg: "rgba(148,163,184,0.08)",
    border: "rgba(148,163,184,0.35)",
  },
};

export function AssessmentBadge({ assessment }: { assessment: Assessment }) {
  const cfg = CONFIG[assessment] ?? CONFIG[""];
  return (
    <span
      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium border"
      style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}
