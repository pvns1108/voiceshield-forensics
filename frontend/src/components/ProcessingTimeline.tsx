import type { ProcessingStep } from "@/lib/types";

const STEP_LABELS: Record<string, string> = {
  queued: "Queued",
  validating: "Validating audio",
  preprocessing: "Preprocessing",
  extracting_features: "Extracting features",
  hashing_normalized_audio: "Hashing normalized audio",
  model_inference: "Anti-spoof model inference",
  generating_report: "Generating report",
};

export function ProcessingTimeline({ steps }: { steps: ProcessingStep[] }) {
  if (!steps.length) {
    return <p className="text-sm text-ink-faint font-data">No processing steps recorded.</p>;
  }
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3 py-2 border-b border-hairline last:border-0">
          <span
            className={`mt-1 w-2 h-2 shrink-0 rounded-full ${
              step.status === "ok" ? "bg-emerald" : "bg-red"
            }`}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-ink">{STEP_LABELS[step.step] ?? step.step}</span>
              <span className="text-xs font-data text-ink-faint shrink-0">
                {step.duration_ms.toFixed(1)} ms
              </span>
            </div>
            {step.error && (
              <p className="text-xs text-red mt-1 font-data">{step.error}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
