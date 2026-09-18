import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

export default function LandingPage() {
  return (
    <AppShell>
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 border-b border-hairline">
        <div className="max-w-3xl">
          <div className="text-xs font-data text-cyan mb-4">Audio forensics · anti-spoofing analysis</div>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight text-ink mb-6">
            Evidence, not verdicts, for suspicious audio.
          </h1>
          <p className="text-lg text-ink-dim leading-relaxed mb-8 max-w-2xl">
            VoiceShield inspects an audio sample and reports what is actually
            measurable — waveform, spectral structure, pitch behavior, and
            model-based spoof indicators — alongside a plain account of what
            it can&apos;t tell you. Every number comes from the submitted audio.
            Nothing is invented.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="px-5 py-3 bg-cyan text-void font-medium text-sm hover:bg-cyan/90 transition-colors"
            >
              Analyze audio
            </Link>
            <Link
              href="/model"
              className="px-5 py-3 border border-hairline-bright text-ink text-sm hover:border-cyan/50 transition-colors"
            >
              View model &amp; limitations
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-px bg-hairline border border-hairline">
        <Capability
          title="Real signal analysis"
          body="Waveform, mel spectrogram, pitch contour, RMS energy, and voice-activity segmentation, computed directly from your file with librosa/NumPy/SciPy — visualized, not summarized."
        />
        <Capability
          title="Model-backed, honestly reported"
          body="Anti-spoofing inference uses AASIST, an MIT-licensed, ASVspoof-trained model. If the model can't run in a given deployment, the result says so — it never guesses in its place."
        />
        <Capability
          title="Built for review, not automation"
          body="Every result explains its evidence, its limitations, and a recommended next action. Assessments require human review before any high-impact decision."
        />
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-20">
        <Panel eyebrow="Data handling" title="What happens to your audio">
          <ul className="space-y-2 text-sm text-ink-dim">
            <li>— Files are stored locally by this application for the duration of your session/history, not sent to any third party.</li>
            <li>— A SHA-256 hash is recorded for the original file and the normalized analysis audio, so integrity can be verified.</li>
            <li>— You can delete any analysis and its stored audio at any time from the History page.</li>
            <li>— Only upload audio you are authorized to analyze. See the Privacy page for full detail.</li>
          </ul>
        </Panel>
      </section>
    </AppShell>
  );
}

function Capability({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-void p-6">
      <h3 className="text-sm font-semibold text-ink mb-2">{title}</h3>
      <p className="text-sm text-ink-dim leading-relaxed">{body}</p>
    </div>
  );
}
