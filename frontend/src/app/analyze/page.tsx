import { PageShell } from "@/components/layout/PageShell";
import { UploadConsole } from "@/components/features/UploadConsole";

const CONSTRAINTS = [
  ["Formats", "wav · mp3 · m4a · flac · ogg · webm"],
  ["Duration", "0.5 s — 120 s"],
  ["Max size", "25 MB"],
  ["Validation", "ffprobe content check — extension not trusted alone"],
  ["Anti-spoofing", "Runs if PyTorch available; explicitly unavailable otherwise"],
  ["ASR", "Whisper Large-v3 Turbo — multilingual, Hindi/Hinglish support"],
];

export default function AnalyzePage() {
  return (
    <PageShell>
      <div
        className="mx-auto px-[var(--gutter)] py-16 grid lg:grid-cols-[1fr_320px] gap-12 items-start"
        style={{ maxWidth: "var(--max-w)" }}
      >
        {/* Left — console */}
        <div>
          <div
            className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.18em] uppercase text-[var(--c-amber)] mb-3"
          >
            Signal intake
          </div>
          <h1
            className="font-[var(--font-display)] text-[var(--c-bone)] mb-6"
            style={{ fontSize: "var(--t-h1)", lineHeight: "var(--lh-snug)" }}
          >
            Submit audio for analysis
          </h1>
          <p
            className="text-[var(--c-dim)] mb-8 max-w-[52ch]"
            style={{ fontSize: "var(--t-body)", lineHeight: "var(--lh-loose)" }}
          >
            Upload a file or record from the microphone. Processing runs
            immediately. The pipeline validates file contents, extracts signal
            features, runs ASR, then the anti-spoofing model.
          </p>

          <UploadConsole />
        </div>

        {/* Right — constraints / instrument spec */}
        <div className="lg:sticky lg:top-24">
          <div
            className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.18em] uppercase text-[var(--c-faint)] mb-4"
          >
            Instrument spec
          </div>
          <div className="border border-[var(--c-rule)] divide-y divide-[var(--c-rule)]">
            {CONSTRAINTS.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5 px-4 py-3">
                <dt
                  className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)]"
                >
                  {label}
                </dt>
                <dd
                  className="font-[var(--font-mono)] text-[var(--c-dim)]"
                  style={{ fontSize: "var(--t-small)" }}
                >
                  {value}
                </dd>
              </div>
            ))}
          </div>

          <p
            className="mt-4 text-[var(--c-faint)] leading-relaxed"
            style={{ fontSize: "var(--t-micro)" }}
          >
            Only upload audio you are authorised to analyze.
            Files are stored locally for the session and can be deleted from History.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
