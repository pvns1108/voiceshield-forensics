import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoiceShield — Audio Forensics & Anti-Spoofing Analysis",
  description:
    "Assess whether audio shows evidence consistent with human speech, synthetic speech, or replay attacks. Evidence-based, model-backed forensic analysis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-void text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
