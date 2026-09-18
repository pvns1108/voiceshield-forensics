"use client";

import { useEffect, useState } from "react";
import { getModelInfo } from "@/lib/api";
import type { ModelInfo } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

export default function ModelInfoPage() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModelInfo()
      .then(setInfo)
      .catch(() => setError("Could not load model information. Is the backend running?"));
  }, []);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div>
          <div className="text-xs font-data text-cyan mb-2">Model &amp; limitations</div>
          <h1 className="text-2xl font-semibold text-ink mb-2">
            What the anti-spoofing model does — and doesn&apos;t — tell you
          </h1>
          <p className="text-sm text-ink-dim">
            Provenance, decision logic, and documented limitations for the
            anti-spoofing model this deployment uses.
          </p>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        {info && (
          <>
            <Panel eyebrow="Runtime status" title={info.runtime_status === "available" ? "Model is available in this deployment" : "Model is unavailable in this deployment"}>
              {info.runtime_status === "unavailable" ? (
                <p className="text-sm text-amber font-data">{info.unavailable_reason}</p>
              ) : (
                <p className="text-sm text-emerald">Real inference will run for submitted audio.</p>
              )}
            </Panel>

            <Panel eyebrow="Provenance" title={info.model_name}>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <Field label="Source repository" value={info.source_repository} mono />
                <Field label="Vendored commit" value={info.vendored_commit} mono />
                <Field label="License" value={info.license} />
                <Field label="Training / evaluation dataset" value={info.training_dataset} />
                <Field label="Input sample rate" value={`${info.input_sample_rate_hz} Hz`} />
                <Field label="Input fixed length" value={`${info.input_fixed_length_samples} samples`} />
              </dl>
            </Panel>

            <Panel eyebrow="Decision logic" title="How a label is produced">
              <p className="text-sm text-ink-dim mb-3">{info.threshold_note}</p>
              <div className="text-sm">
                <Field label="Decision threshold" value={String(info.decision_threshold)} />
              </div>
              <div className="mt-3 text-sm text-ink-dim">
                Output label mapping:{" "}
                {Object.entries(info.output_label_mapping).map(([k, v]) => (
                  <span key={k} className="font-data text-ink mr-3">
                    {k} → {v}
                  </span>
                ))}
              </div>
            </Panel>

            <Panel eyebrow="Read this before trusting a result" title="Documented limitations">
              <ul className="space-y-3 text-sm text-ink-dim">
                {info.limitations.map((l, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="text-amber shrink-0">!</span>
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        )}

        <Panel eyebrow="Scope of this build" title="Capabilities not implemented in this version">
          <ul className="space-y-2 text-sm text-ink-dim">
            <li>— Speaker enrollment / voice comparison (requires a real speaker-embedding model)</li>
            <li>— Challenge-response liveness with real speech-to-text verification</li>
            <li>— Side-by-side comparison mode between two analyses</li>
            <li>— PDF report export</li>
            <li>— Authentication / multi-user accounts, Docker packaging, Postgres</li>
          </ul>
          <p className="text-xs text-ink-faint mt-4">
            These are explicitly marked unavailable rather than faked, per this
            project&apos;s no-fabrication requirement — see the README for what
            each would need to become real.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint mb-1">{label}</dt>
      <dd className={mono ? "font-data text-ink text-xs break-all" : "text-ink"}>{value}</dd>
    </div>
  );
}
