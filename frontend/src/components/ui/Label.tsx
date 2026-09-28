/** Eyebrow label — UPPERCASE, tracked, monospace */
export function Label({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "span" | "dt" | "p";
}) {
  return (
    <Tag
      className={[
        "font-[var(--font-mono)] text-[var(--t-micro)]",
        "tracking-[var(--ls-label)] uppercase text-[var(--c-faint)]",
        className,
      ].join(" ")}
    >
      {children}
    </Tag>
  );
}
