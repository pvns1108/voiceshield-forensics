import type { ReactNode } from "react";
import { Label } from "./Label";
import { Rule } from "./Rule";

/**
 * Panel — hairline-bordered section. Not a card.
 * By default renders no background; pass `raised` for a subtle surface.
 */
export function Panel({
  eyebrow,
  title,
  action,
  children,
  raised = false,
  className = "",
  id,
}: {
  eyebrow?: string;
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  raised?: boolean;
  className?: string;
  id?: string;
}) {
  const hasHeader = !!(eyebrow || title || action);
  return (
    <section
      id={id}
      className={[
        "border border-[var(--c-rule)]",
        raised ? "bg-[var(--c-surface)]" : "",
        className,
      ].join(" ")}
    >
      {hasHeader && (
        <>
          <div className="flex items-start justify-between gap-4 px-5 py-4">
            <div className="min-w-0">
              {eyebrow && <Label className="mb-1">{eyebrow}</Label>}
              {title && (
                <h3
                  className="text-[var(--c-bone)] font-[var(--font-display)]"
                  style={{ fontSize: "var(--t-h2)", lineHeight: "var(--lh-snug)" }}
                >
                  {title}
                </h3>
              )}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
          <Rule />
        </>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** Compact metric for the analysis header */
export function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <div className="border-t border-[var(--c-rule)] pt-4">
      <Label className="mb-1.5">{label}</Label>
      <div
        className="font-[var(--font-mono)] text-[var(--c-bone)]"
        style={{ fontSize: "var(--t-h2)" }}
      >
        {value}
        {unit && (
          <span
            className="text-[var(--c-dim)] ml-1"
            style={{ fontSize: "var(--t-small)" }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
