import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--c-rule)] mt-auto">
      <div
        className="mx-auto px-[var(--gutter)] py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        style={{ maxWidth: "var(--max-w)" }}
      >
        <div className="space-y-1">
          <p
            className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)]"
          >
            VoiceShield — evidence-based audio forensics prototype
          </p>
          <p
            className="font-[var(--font-mono)] text-[var(--t-micro)] text-[var(--c-faint)] leading-relaxed max-w-[52ch]"
          >
            Assessments reflect model confidence, not certainty.
            Every result requires human review before any consequential decision.
          </p>
        </div>
        <nav
          aria-label="Footer navigation"
          className="flex items-center gap-5 shrink-0"
        >
          {[
            { href: "/analyze", label: "Analyze" },
            { href: "/history", label: "History" },
            { href: "/model",   label: "Model" },
            { href: "/privacy", label: "Privacy" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.08em] uppercase text-[var(--c-faint)] hover:text-[var(--c-dim)] transition-colors duration-[var(--dur-fast)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
