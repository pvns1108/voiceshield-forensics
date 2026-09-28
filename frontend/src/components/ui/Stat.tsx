import { Label } from "./Label";

/** Oversized numeral stat */
export function Stat({
  value,
  unit,
  label,
  className = "",
}: {
  value: string | number;
  unit?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={["flex flex-col gap-1", className].join(" ")}>
      <div
        className="font-[var(--font-mono)] text-[var(--c-bone)] leading-none"
        style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
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
      <Label>{label}</Label>
    </div>
  );
}
