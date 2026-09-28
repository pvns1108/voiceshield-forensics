"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  { href: "/analyze",  label: "Analyze" },
  { href: "/history",  label: "History" },
  { href: "/model",    label: "Model" },
  { href: "/privacy",  label: "Privacy" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header
      className="border-b border-[var(--c-rule)] bg-[var(--c-ground)]/90 sticky top-0 z-40"
      style={{ backdropFilter: "blur(8px)" }}
    >
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-3 focus:bg-[var(--c-surface)] focus:border focus:border-[var(--c-amber)] focus:px-3 focus:py-1.5 focus:text-xs focus:text-[var(--c-bone)]"
      >
        Skip to content
      </a>

      <div
        className="mx-auto px-[var(--gutter)] h-14 flex items-center justify-between gap-8"
        style={{ maxWidth: "var(--max-w)" }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group"
          aria-label="VoiceShield home"
        >
          <CrosshairMark />
          <span
            className="font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.12em] uppercase text-[var(--c-bone)] group-hover:text-[var(--c-amber)] transition-colors duration-[var(--dur-fast)]"
          >
            Voice<span className="text-[var(--c-amber)]">Shield</span>
          </span>
        </Link>

        {/* Nav */}
        <nav aria-label="Primary navigation" className="flex items-center">
          <ul className="flex items-center" role="list">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={[
                      "px-4 py-2 text-[var(--t-small)] font-[var(--font-mono)] tracking-[0.06em] uppercase transition-colors duration-[var(--dur-fast)]",
                      active
                        ? "text-[var(--c-bone)]"
                        : "text-[var(--c-faint)] hover:text-[var(--c-dim)]",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="ml-5 border-l border-[var(--c-rule)] pl-5">
            <Link
              href="/analyze"
              className="px-3 py-1.5 border border-[var(--c-amber)] text-[var(--c-amber)] text-[var(--t-small)] font-[var(--font-mono)] tracking-[0.06em] uppercase hover:bg-[var(--c-amber)] hover:text-[var(--c-ground)] transition-colors duration-[var(--dur-fast)]"
            >
              New Analysis
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/** Small crosshair registration mark for the wordmark */
function CrosshairMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="4" stroke="var(--c-amber)" strokeWidth="1" />
      <line x1="9" y1="0" x2="9" y2="5" stroke="var(--c-amber)" strokeWidth="1" />
      <line x1="9" y1="13" x2="9" y2="18" stroke="var(--c-amber)" strokeWidth="1" />
      <line x1="0" y1="9" x2="5" y2="9" stroke="var(--c-amber)" strokeWidth="1" />
      <line x1="13" y1="9" x2="18" y2="9" stroke="var(--c-amber)" strokeWidth="1" />
    </svg>
  );
}
