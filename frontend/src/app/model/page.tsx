"use client";

import { useEffect, useState } from "react";
import { getModelInfo } from "@/lib/api";
import type { ModelInfo } from "@/lib/types";
import { PageShell } from "@/components/layout/PageShell";

export default function ModelInfoPage() {
  const [info, setInfo] = useState<ModelInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModelInfo()
      .then(setInfo)
      .catch(() => setError("Could not load model information. Is the backend running?"));
  }, []);

  return (
    <PageShell>
      <article
        className="mx-auto px-[var(--gutter)] py-16"
        style={{ maxWidth: "var(--max-w)" }}
        aria-label="Model information and limitations"
      >
        {/* Header */}
        <header className="mb-16 border-b border-[var(--c-rule)] pb-10">
          <div
            className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.18em] uppercase text-[var(--c-amber)] mb-4"
          >
            Model & limitations
          </div>
          <h1
            className="font-[var(--font-display)] text-[var(--c-bone)] max-w-[24ch]"
            style={{ fontSize: "var(--t-h1)", lineHeight: "var(--lh-snug)" }}
          >
            What the anti-spoofing model does — and does not — tell you
          </h1>
          <p
            className="mt-4 text-[var(--c-dim)] max-w-[60ch]"
            style={{ fontSize: "var(--t-body)", lineHeight: "var(--lh-loose)" }}
          >
            Provenance, decision logic, and documented limitations for the
            anti-spoofing model used in this deployment.
          </p>
        </header>

        {error && (
          <p
            className="mb-8 border border-[var(--c-synth)]/40 bg-[var(--c-synth-bg)] px-5 py-4 font-[var(--font-mono)] text-[var(--c-synth)]"
            style={{ fontSize: "var(--t-small)" }}
          >
            {error}
          </p>
        )}

        <div className="grid lg:grid-cols-[2fr_1fr] gap-16">
          {/* Main content column */}
          <div className="space-y-12">

            {/* Runtime status */}
            {info && (
              <section aria-labelledby="runtime-status-heading">
                <h2
                  id="runtime-status-heading"
                  className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)] mb-5"
                >
                  Runtime status
                </h2>
                <div
                  className="border px-5 py-4"
                  style={{
                    borderColor: info.runtime_status === "available" ? "var(--c-human)" : "var(--c-inconc)",
                    background: info.runtime_status === "available" ? "var(--c-human-bg)" : "var(--c-inconc-bg)",
                  }}
                >
                  <div
                    className="font-[var(--font-mono)] tracking-[0.08em] uppercase mb-1"
                    style={{
                      color: info.runtime_status === "available" ? "var(--c-human)" : "var(--c-inconc)",
                      fontSize: "var(--t-small)",
                    }}
                  >
                    {info.runtime_status === "available"
                      ? "Available — real inference will run"
                      : "Unavailable in this deployment"}
                  </div>
                  {info.runtime_status === "unavailable" && info.unavailable_reason && (
                    <p
                      className="font-[var(--font-mono)] text-[var(--c-dim)] leading-relaxed mt-2"
                      style={{ fontSize: "var(--t-small)" }}
                    >
                      {info.unavailable_reason}
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Anti-spoof model provenance */}
            {info && (
              <section aria-labelledby="provenance-heading">
                <h2
                  id="provenance-heading"
                  className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)] mb-5"
                >
                  Anti-spoofing model
                </h2>
                <h3
                  className="font-[var(--font-display)] text-[var(--c-bone)] mb-4"
                  style={{ fontSize: "var(--t-h2)" }}
                >
                  {info.model_name}
                </h3>
                <dl className="border border-[var(--c-rule)] divide-y divide-[var(--c-rule)]">
                  {[
                    { label: "Source repository", value: info.source_repository, mono: true },
                    { label: "Vendored commit", value: info.vendored_commit, mono: true },
                    { label: "License", value: info.license },
                    { label: "Training / evaluation dataset", value: info.training_dataset },
                    { label: "Input sample rate", value: `${info.input_sample_rate_hz} Hz` },
                    { label: "Input fixed length", value: `${info.input_fixed_length_samples} samples` },
                  ].map(({ label, value, mono }) => (
                    <div key={label} className="px-4 py-3">
                      <dt
                        className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mb-0.5"
                      >
                        {label}
                      </dt>
                      <dd
                        className={mono ? "font-[var(--font-mono)] text-[var(--c-dim)] break-all" : "text-[var(--c-dim)]"}
                        style={{ fontSize: "var(--t-small)" }}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* Decision logic */}
            {info && (
              <section aria-labelledby="decision-heading">
                <h2
                  id="decision-heading"
                  className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)] mb-5"
                >
                  Decision logic
                </h2>
                <p
                  className="text-[var(--c-dim)] mb-4"
                  style={{ fontSize: "var(--t-body)", lineHeight: "var(--lh-loose)" }}
                >
                  {info.threshold_note}
                </p>
                <div className="border border-[var(--c-rule)] divide-y divide-[var(--c-rule)]">
                  <div className="px-4 py-3">
                    <dt className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mb-0.5">
                      Decision threshold
                    </dt>
                    <dd className="font-[var(--font-mono)] text-[var(--c-bone)]" style={{ fontSize: "var(--t-h2)" }}>
                      {info.decision_threshold}
                    </dd>
                  </div>
                  <div className="px-4 py-3">
                    <dt className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mb-1">
                      Output label mapping
                    </dt>
                    <dd className="flex flex-wrap gap-3">
                      {Object.entries(info.output_label_mapping).map(([k, v]) => (
                        <span key={k} className="font-[var(--font-mono)] text-[var(--c-dim)]" style={{ fontSize: "var(--t-small)" }}>
                          <span className="text-[var(--c-bone)]">{k}</span> → {v}
                        </span>
                      ))}
                    </dd>
                  </div>
                </div>
              </section>
            )}

            {/* ASR section */}
            <section aria-labelledby="asr-heading">
              <h2
                id="asr-heading"
                className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)] mb-5"
              >
                Speech recognition (ASR)
              </h2>
              <h3
                className="font-[var(--font-display)] text-[var(--c-bone)] mb-4"
                style={{ fontSize: "var(--t-h2)" }}
              >
                Whisper Large-v3 Turbo
              </h3>
              <div className="border border-[var(--c-rule)] divide-y divide-[var(--c-rule)]">
                {[
                  { label: "Engine", value: "faster-whisper (CTranslate2 int8)", mono: true },
                  { label: "License", value: "MIT (OpenAI / SYSTRAN / Mobius Labs)" },
                  { label: "Language support", value: "100+ languages — English, Hindi, Indian accents, Hinglish, Bengali, Tamil, Telugu, Marathi, Gujarati…" },
                  { label: "Code-switching", value: "Runs in transcribe mode — Hindi/Hinglish is preserved, not translated to English" },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="px-4 py-3">
                    <dt className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] mb-0.5">
                      {label}
                    </dt>
                    <dd
                      className={mono ? "font-[var(--font-mono)] text-[var(--c-dim)] break-all" : "text-[var(--c-dim)]"}
                      style={{ fontSize: "var(--t-small)", lineHeight: "var(--lh-loose)" }}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </div>
            </section>

            {/* Not implemented */}
            <section aria-labelledby="scope-heading">
              <h2
                id="scope-heading"
                className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)] mb-5"
              >
                Not implemented in this build
              </h2>
              <ul className="border-l border-[var(--c-rule)] space-y-4 pl-5">
                {[
                  "Speaker enrollment / voice comparison — requires a real speaker-embedding model",
                  "Challenge-response liveness with real-time prompt verification",
                  "Side-by-side comparison mode between two analyses",
                  "PDF report export",
                  "Authentication / multi-user accounts, Docker, PostgreSQL",
                ].map((item) => (
                  <li
                    key={item}
                    className="text-[var(--c-dim)]"
                    style={{ fontSize: "var(--t-small)", lineHeight: "var(--lh-loose)" }}
                  >
                    {item}
                  </li>
                ))}
              </ul>
              <p
                className="mt-4 text-[var(--c-faint)]"
                style={{ fontSize: "var(--t-micro)" }}
              >
                These are explicitly omitted rather than faked.
                See the README for what each would require to be genuine.
              </p>
            </section>
          </div>

          {/* Sidebar — limitations callout */}
          {info && (
            <aside aria-labelledby="limitations-sidebar-heading" className="lg:sticky lg:top-24 self-start">
              <h2
                id="limitations-sidebar-heading"
                className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.16em] uppercase text-[var(--c-faint)] mb-4"
              >
                Read before trusting a result
              </h2>
              <ul className="space-y-4">
                {info.limitations.map((l, i) => (
                  <li
                    key={i}
                    className="flex gap-3 border-t border-[var(--c-rule)] pt-4 first:border-0 first:pt-0"
                  >
                    <span
                      className="font-[var(--font-mono)] text-[var(--c-amber)] shrink-0 mt-0.5"
                      style={{ fontSize: "var(--t-small)" }}
                      aria-hidden="true"
                    >
                      !
                    </span>
                    <p
                      className="text-[var(--c-dim)]"
                      style={{ fontSize: "var(--t-small)", lineHeight: "var(--lh-loose)" }}
                    >
                      {l}
                    </p>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </article>
    </PageShell>
  );
}
