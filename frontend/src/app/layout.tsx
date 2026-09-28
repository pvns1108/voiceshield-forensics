import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VoiceShield — Audio Forensics & Anti-Spoofing Analysis",
  description:
    "Assess whether audio shows evidence consistent with human speech, synthetic speech, or replay attacks. Evidence-based, model-backed forensic analysis.",
};

type LayoutProps = { children: React.ReactNode };

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html
      lang="en"
      className={`h-full ${dmSerif.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="min-h-full flex flex-col bg-void text-ink antialiased">
        {/* Film grain overlay — decorative, aria-hidden */}
        <div className="grain-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
