import { AppShell } from "@/components/AppShell";
import { UploadPanel } from "@/components/UploadPanel";
import { Panel } from "@/components/Panel";

export default function AnalyzePage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-8">
          <div className="text-xs font-data text-cyan mb-3">New analysis</div>
          <h1 className="text-2xl font-semibold text-ink mb-2">Submit audio for analysis</h1>
          <p className="text-sm text-ink-dim">
            Upload a file or record directly from your microphone. Processing
            runs immediately and typically finishes within a few seconds.
          </p>
        </div>

        <Panel className="mb-6">
          <UploadPanel />
        </Panel>

        <Panel eyebrow="Before you submit" title="What this analysis can and can't tell you">
          <ul className="space-y-2 text-sm text-ink-dim">
            <li>— Waveform, spectrogram, pitch, and energy are always computed from your actual audio.</li>
            <li>— The anti-spoofing model result depends on whether PyTorch is available in this deployment; if not, the result explicitly says &quot;unavailable&quot; rather than guessing.</li>
            <li>— Only upload audio you are authorized to analyze.</li>
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
