"use client";

import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Reveal } from "@/components/ui/Reveal";
import dynamic from "next/dynamic";

// Lazy-load the ambient canvas so it doesn't block initial render
const AmbientSignal = dynamic(
  () => import("@/components/viz/AmbientSignal").then((m) => m.AmbientSignal),
  { ssr: false }
);

/* ---- Step data ---- */
const STEPS = [
  {
    n: "01",
    title: "Ingest",
    body: "Upload a file or record from the microphone. File contents are verified with ffprobe — the declared extension is never trusted alone. Supported: wav, mp3, m4a, flac, ogg, webm.",
  },
  {
    n: "02",
    title: "Measure",
    body: "Audio is normalized to mono/16kHz, then real signal-processing features are extracted with librosa, NumPy, and SciPy: waveform, mel spectrogram, pitch contour (f0), RMS energy, and voice-activity segments.",
  },
  {
    n: "03",
    title: "Model",
    body: "If PyTorch is available, the vendored AASIST model (MIT license, trained on ASVspoof 2019 LA) runs genuine inference and returns a bonafide/spoof probability. If not, the result says so — no score is fabricated in its place.",
  },
  {
    n: "04",
    title: "Report",
    body: "All measurements, model output, and spoken-content indicators are assembled and persisted. Nothing is invented. Wording reflects what is actually measurable, with explicit limitations.",
  },
];

/* ---- Limitations ---- */
const LIMITATIONS = [
  "AASIST is trained on ASVspoof 2019 LA. It has not been validated on newer TTS systems, non-English speech, or compressed real-world audio.",
  "The decision threshold (0.5) is a neutral midpoint, not a calibrated operating point. The source repo reports EER.",
  "No speaker verification, liveness challenge, or side-by-side comparison — these would require real speaker-embedding models.",
  "This is a single-user local prototype. No authentication, no multi-user accounts.",
];

export default function LandingPage() {
  return (
    <PageShell>
      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden border-b border-[var(--c-rule)]"
        style={{ minHeight: "92vh" }}
      >
        {/* Decorative ambient canvas — NOT analysis data */}
        <div
          className="absolute inset-0 opacity-30"
          aria-hidden="true"
        >
          <AmbientSignal />
        </div>

        {/* Decorative scan line */}
        <div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="scan-sweep absolute left-0 right-0 h-[1px] bg-[var(--c-amber)] opacity-10"
          />
        </div>

        {/* Registration marks at corners */}
        <div
          className="absolute top-8 left-[var(--gutter)] w-8 h-8 border-t border-l border-[var(--c-rule-hi)]"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-8 right-[var(--gutter)] w-8 h-8 border-b border-r border-[var(--c-rule-hi)]"
          aria-hidden="true"
        />

        <div
          className="relative mx-auto px-[var(--gutter)] flex flex-col justify-end pb-24"
          style={{ maxWidth: "var(--max-w)", minHeight: "92vh" }}
        >
          {/* Eyebrow */}
          <div
            className="hero-line font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.18em] uppercase text-[var(--c-amber)] mb-6"
          >
            Audio forensics — anti-spoofing analysis
          </div>

          {/* Headline */}
          <h1
            className="font-[var(--font-display)] leading-[1.05] text-[var(--c-bone)] max-w-[16ch]"
            style={{ fontSize: "var(--t-hero)", letterSpacing: "var(--ls-hero)" }}
          >
            <span className="hero-line block">Measure&shy;ments,</span>
            <span className="hero-line block" style={{ animationDelay: "160ms" }}>
              not ver&shy;dicts.
            </span>
          </h1>

          {/* Subtext */}
          <p
            className="hero-line mt-8 text-[var(--c-dim)] max-w-[52ch]"
            style={{ fontSize: "var(--t-body)", lineHeight: "var(--lh-loose)", animationDelay: "320ms" }}
          >
            VoiceShield reports what is actually measurable in submitted audio —
            waveform, spectral structure, pitch, and anti-spoofing model output —
            alongside an honest account of what it cannot tell you.
            Every number comes from the file. Nothing is invented.
          </p>

          {/* CTA row */}
          <div
            className="hero-line mt-10 flex flex-wrap items-center gap-4"
            style={{ animationDelay: "440ms" }}
          >
            <Link
              href="/analyze"
              className="px-6 py-3 bg-[var(--c-amber)] text-[var(--c-ground)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase hover:bg-[#c07f2e] transition-colors duration-[var(--dur-fast)]"
            >
              Begin analysis
            </Link>
            <Link
              href="/model"
              className="px-6 py-3 border border-[var(--c-rule-hi)] text-[var(--c-dim)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase hover:border-[var(--c-amber)] hover:text-[var(--c-bone)] transition-colors duration-[var(--dur-fast)]"
            >
              Model & limitations
            </Link>
          </div>

          {/* Scroll hint */}
          <div
            className="hero-line absolute bottom-8 left-[var(--gutter)] flex items-center gap-3"
            style={{ animationDelay: "600ms" }}
            aria-hidden="true"
          >
            <div className="w-px h-8 bg-[var(--c-rule-hi)]" />
            <span className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.12em] uppercase text-[var(--c-faint)]">
              Scroll
            </span>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <section
        className="mx-auto px-[var(--gutter)] py-24 border-b border-[var(--c-rule)]"
        style={{ maxWidth: "var(--max-w)" }}
        aria-labelledby="how-it-works-heading"
      >
        <Reveal>
          <h2
            id="how-it-works-heading"
            className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.18em] uppercase text-[var(--c-faint)] mb-16"
          >
            How it works
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-2 gap-0 border-l border-[var(--c-rule)]">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 80}>
              <div
                className="border-b border-r border-[var(--c-rule)] px-8 py-10"
              >
                <div
                  className="font-[var(--font-mono)] text-[clamp(3rem,6vw,5rem)] text-[var(--c-rule-hi)] leading-none mb-6 select-none"
                  aria-hidden="true"
                >
                  {step.n}
                </div>
                <h3
                  className="font-[var(--font-display)] text-[var(--c-bone)] mb-3"
                  style={{ fontSize: "var(--t-h2)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[var(--c-dim)]"
                  style={{ fontSize: "var(--t-small)", lineHeight: "var(--lh-loose)" }}
                >
                  {step.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── LIMITATIONS ──────────────────────────────────────────────────────── */}
      <section
        className="mx-auto px-[var(--gutter)] py-24 border-b border-[var(--c-rule)]"
        style={{ maxWidth: "var(--max-w)" }}
        aria-labelledby="limitations-heading"
      >
        <Reveal>
          <div className="grid md:grid-cols-[1fr_2fr] gap-16">
            <div>
              <h2
                id="limitations-heading"
                className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.18em] uppercase text-[var(--c-faint)] mb-4"
              >
                Known limitations
              </h2>
              <p
                className="text-[var(--c-dim)]"
                style={{ fontSize: "var(--t-small)", lineHeight: "var(--lh-loose)" }}
              >
                Read these before drawing conclusions from a result.
              </p>
            </div>
            <ul className="space-y-6" role="list">
              {LIMITATIONS.map((lim, i) => (
                <Reveal key={i} delay={i * 60}>
                  <li className="flex gap-4 border-t border-[var(--c-rule)] pt-6 first:border-0 first:pt-0">
                    <span
                      className="font-[var(--font-mono)] text-[var(--c-amber)] text-[var(--t-micro)] mt-0.5 shrink-0"
                      aria-hidden="true"
                    >
                      !
                    </span>
                    <p
                      className="text-[var(--c-dim)]"
                      style={{ fontSize: "var(--t-small)", lineHeight: "var(--lh-loose)" }}
                    >
                      {lim}
                    </p>
                  </li>
                </Reveal>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ── QUIET CTA ────────────────────────────────────────────────────────── */}
      <section
        className="mx-auto px-[var(--gutter)] py-24"
        style={{ maxWidth: "var(--max-w)" }}
      >
        <Reveal>
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 border-t border-[var(--c-rule)] pt-16">
            <div>
              <p
                className="font-[var(--font-display)] text-[var(--c-bone)] leading-snug max-w-[28ch]"
                style={{ fontSize: "var(--t-h1)" }}
              >
                Submit audio. Read the measurements.
              </p>
            </div>
            <Link
              href="/analyze"
              className="shrink-0 px-6 py-3 border border-[var(--c-amber)] text-[var(--c-amber)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase hover:bg-[var(--c-amber)] hover:text-[var(--c-ground)] transition-colors duration-[var(--dur-fast)]"
            >
              Begin analysis
            </Link>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
