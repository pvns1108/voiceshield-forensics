import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";

export default function PrivacyPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <div className="text-xs font-data text-cyan mb-2">Privacy &amp; data handling</div>
          <h1 className="text-2xl font-semibold text-ink">How VoiceShield handles your audio</h1>
        </div>

        <Panel title="What is stored">
          <ul className="space-y-2 text-sm text-ink-dim">
            <li>— The original uploaded/recorded audio file, saved under a randomly generated filename on local disk (not the original filename).</li>
            <li>— A SHA-256 hash of the original file and of the normalized (mono, 16kHz) audio used for analysis, so integrity can be independently verified.</li>
            <li>— Computed measurements: waveform samples, spectrogram, pitch contour, energy, voice-activity segments, forensic indicators, and (if available) anti-spoofing model output.</li>
            <li>— Any case label, notes, or tags you add.</li>
          </ul>
        </Panel>

        <Panel title="What is not done">
          <ul className="space-y-2 text-sm text-ink-dim">
            <li>— Audio is not sent to any third-party service or external API.</li>
            <li>— No identity, demographic, or biometric inference beyond the stated anti-spoofing assessment is performed.</li>
            <li>— No speaker profile is created unless you explicitly opt in to a (currently unimplemented) enrollment feature.</li>
          </ul>
        </Panel>

        <Panel title="Retention and deletion">
          <p className="text-sm text-ink-dim mb-3">
            This build does not run an automatic retention/cleanup job. Configure
            <code className="font-data text-ink mx-1">VOICESHIELD_RETENTION_DAYS</code>
            and schedule a periodic cleanup task appropriate to your deployment (see README).
          </p>
          <p className="text-sm text-ink-dim">
            You can permanently delete any analysis, and its stored audio file,
            from the <a href="/history" className="text-cyan">History</a> page at any time.
          </p>
        </Panel>

        <Panel title="Responsible use">
          <p className="text-sm text-ink-dim">
            Only upload or record audio you are authorized to analyze. Do not use
            this tool as the sole basis for identity verification or any
            high-impact decision — results always require human review, and any
            model-based assessment can be wrong or unavailable.
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
