export function Panel({
  title,
  eyebrow,
  action,
  children,
  className = "",
}: {
  title?: string;
  eyebrow?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-hairline bg-panel/60 ${className}`}>
      {(title || eyebrow) && (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 border-b border-hairline">
          <div>
            {eyebrow && (
              <div className="text-[11px] text-ink-faint font-data mb-0.5">{eyebrow}</div>
            )}
            {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          </div>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="border border-hairline px-4 py-3">
      <div className="text-[11px] text-ink-faint mb-1">{label}</div>
      <div className="text-xl font-data text-ink">
        {value}
        {unit && <span className="text-sm text-ink-dim ml-1">{unit}</span>}
      </div>
    </div>
  );
}
