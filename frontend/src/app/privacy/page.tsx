import Link from "next/link";
import { PageShell } from "@/components/layout/PageShell";
import { Panel } from "@/components/ui/Panel";
import { Label } from "@/components/ui/Label";
import { Rule } from "@/components/ui/Rule";
import { Reveal } from "@/components/ui/Reveal";

const DATA_STORED = [
  {
    title: "Raw Signal Audio",
    body: "The original uploaded or recorded audio file is written to local storage under a cryptographically generated UUID (e.g., 4f8b9e...). The original client filename is preserved only as non-authoritative display metadata.",
  },
  {
    title: "Cryptographic Checksums",
    body: "VoiceShield computes SHA-256 digests of both the pristine ingested file and the standardized 16 kHz mono normalized stream. These hashes allow forensic examiners to verify chain-of-custody and prove bitstream integrity independently.",
  },
  {
    title: "Empirical Measurements",
    body: "Only directly extracted mathematical arrays are persisted: downsampled waveform envelopes, mel-spectrogram matrices, fundamental frequency contours (f0 via librosa pyin), RMS energy frames, and voice activity intervals.",
  },
  {
    title: "Case Metadata & Operator Notes",
    body: "Case labels, examiner tags, and manual notes added during triage are stored strictly within the local SQLite database alongside processing telemetry.",
  },
];

const GUARANTEES = [
  {
    tag: "ZERO-CLOUD",
    title: "No Third-Party Telemetry or External Inference",
    desc: "All signal processing (FFmpeg, librosa, SciPy) and neural inference (AASIST / PyTorch) execute entirely on the local host machine. Not a single audio frame or metadata packet is transmitted over the public internet.",
  },
  {
    tag: "NO-BIOMETRICS",
    title: "Zero Identity or Demographic Profiling",
    desc: "The system does not infer age, gender, race, emotion, or biometric identifiers. It evaluates acoustic artifacts associated with synthetic synthesis and vocoder reconstruction only.",
  },
  {
    tag: "NO-VOICEPRINT",
    title: "No Covert Speaker Enrollment",
    desc: "VoiceShield does not construct cross-file speaker embeddings or match voices across an index. Each analysis session is isolated.",
  },
];

export default function PrivacyPage() {
  return (
    <PageShell>
      <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 space-y-12">
        {/* Header */}
        <div>
          <Label className="text-[var(--c-amber)] mb-2">
            Chain of Custody &amp; Data Governance
          </Label>
          <h1
            className="font-[var(--font-display)] text-[var(--c-bone)] tracking-tight"
            style={{ fontSize: "var(--t-display)", lineHeight: "var(--lh-tight)" }}
          >
            Data Handling &amp; Privacy Protocol
          </h1>
          <p
            className="text-[var(--c-dim)] max-w-2xl mt-4"
            style={{ fontSize: "var(--t-lead)", lineHeight: "var(--lh-body)" }}
          >
            VoiceShield operates on a zero-cloud, verifiable-custody model. Audio
            is processed locally and never leaves your forensic hardware.
          </p>
        </div>

        <Rule />

        {/* Section 1: Storage & Custody */}
        <Reveal>
          <section className="space-y-6">
            <div>
              <Label className="mb-1 text-[var(--c-dim)]">01 / STORAGE</Label>
              <h2
                className="font-[var(--font-display)] text-[var(--c-bone)]"
                style={{ fontSize: "var(--t-h2)" }}
              >
                What Is Preserved
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--c-rule)] border border-[var(--c-rule)]">
              {DATA_STORED.map((item, idx) => (
                <div key={idx} className="bg-[var(--c-void)] p-6 space-y-2">
                  <span className="font-[var(--font-mono)] text-xs text-[var(--c-amber)]">
                    [REC-{String(idx + 1).padStart(2, "0")}]
                  </span>
                  <h3 className="font-[var(--font-display)] text-sm font-semibold text-[var(--c-bone)]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--c-dim)] leading-relaxed">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Section 2: Architectural Guarantees */}
        <Reveal delay={80}>
          <section className="space-y-6">
            <div>
              <Label className="mb-1 text-[var(--c-dim)]">02 / ARCHITECTURE</Label>
              <h2
                className="font-[var(--font-display)] text-[var(--c-bone)]"
                style={{ fontSize: "var(--t-h2)" }}
              >
                What Is Explicitly Excluded
              </h2>
            </div>

            <div className="border border-[var(--c-rule)] divide-y divide-[var(--c-rule)] bg-[var(--c-surface)]">
              {GUARANTEES.map((g, idx) => (
                <div key={idx} className="p-6 flex flex-col md:flex-row md:items-start gap-4">
                  <span className="font-[var(--font-mono)] text-[11px] px-2 py-0.5 border border-[var(--c-rule)] bg-[var(--c-void)] text-[var(--c-dim)] shrink-0 self-start">
                    {g.tag}
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-[var(--font-display)] text-sm font-medium text-[var(--c-bone)]">
                      {g.title}
                    </h3>
                    <p className="text-xs text-[var(--c-dim)] leading-relaxed">
                      {g.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Section 3: Retention & Deletion */}
        <Reveal delay={120}>
          <section className="space-y-6">
            <div>
              <Label className="mb-1 text-[var(--c-dim)]">03 / RETENTION &amp; PURGE</Label>
              <h2
                className="font-[var(--font-display)] text-[var(--c-bone)]"
                style={{ fontSize: "var(--t-h2)" }}
              >
                Retention and Immediate Purge
              </h2>
            </div>

            <Panel raised>
              <div className="space-y-4 text-xs text-[var(--c-dim)] leading-relaxed">
                <p>
                  This deployment stores analysis dossiers in the local workspace database.
                  Retention can be capped by setting the environment variable{" "}
                  <code className="font-[var(--font-mono)] text-[var(--c-bone)] px-1.5 py-0.5 bg-[var(--c-void)] border border-[var(--c-rule)]">
                    VOICESHIELD_RETENTION_DAYS
                  </code>
                  .
                </p>
                <p>
                  Operators possess complete right-to-purge authority. Deleting an entry from the{" "}
                  <Link
                    href="/history"
                    className="text-[var(--c-amber)] underline underline-offset-4 hover:text-[var(--c-bone)] transition-colors"
                  >
                    Historical Registry
                  </Link>{" "}
                  immediately wipes both the forensic database record and unlinks the audio artifact from local disk.
                </p>
              </div>
            </Panel>
          </section>
        </Reveal>

        {/* Section 4: Evidentiary Caveat */}
        <Reveal delay={160}>
          <section className="space-y-4">
            <Label className="text-[var(--c-amber)]">04 / FORENSIC &amp; LEGAL DISCLAIMER</Label>
            <div className="border border-[var(--c-rule)] p-6 bg-[var(--c-void)] border-l-2 border-l-[var(--c-amber)] space-y-2">
              <h3 className="font-[var(--font-display)] text-sm font-semibold text-[var(--c-bone)]">
                Human-in-the-Loop Requirement
              </h3>
              <p className="text-xs text-[var(--c-dim)] leading-relaxed">
                VoiceShield outputs are probabilistic indicators intended to guide qualified forensic examiners,
                journalists, and security researchers. Model confidence scores must not be used as the sole determinant in legal
                proceedings, criminal investigations, or biometric denial-of-service decisions. Always corroborate with
                contextual metadata, acoustic provenance, and corroborating witness testimony.
              </p>
            </div>
          </section>
        </Reveal>
      </div>
    </PageShell>
  );
}
