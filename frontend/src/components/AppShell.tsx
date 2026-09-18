import Link from "next/link";

const NAV_ITEMS = [
  { href: "/analyze", label: "New Analysis" },
  { href: "/history", label: "History" },
  { href: "/model", label: "Model & Limitations" },
  { href: "/privacy", label: "Privacy" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-panel focus:border focus:border-cyan focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <header className="border-b border-hairline bg-panel/60 backdrop-blur supports-[backdrop-filter]:bg-panel/40 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <ShieldMark />
            <span className="text-lg font-semibold tracking-tight">
              Voice<span className="text-cyan">Shield</span>
            </span>
          </Link>
          <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-2 text-sm text-ink-dim hover:text-ink transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-hairline">
        <div className="max-w-7xl mx-auto px-6 py-6 text-xs text-ink-faint flex flex-wrap gap-x-6 gap-y-2 items-center justify-between">
          <span>VoiceShield — evidence-based audio forensics prototype.</span>
          <span>Assessments are model confidence, not certainty. Always requires human review.</span>
        </div>
      </footer>
    </div>
  );
}

function ShieldMark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2L4 5v6c0 5.2 3.4 9.7 8 11 4.6-1.3 8-5.8 8-11V5l-8-3z"
        stroke="var(--cyan)"
        strokeWidth="1.4"
        fill="rgba(34,211,238,0.08)"
      />
      <path d="M8 11.5l2.5 2.5L16 9" stroke="var(--cyan)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
