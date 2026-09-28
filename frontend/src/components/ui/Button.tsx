import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";
type Size    = "sm" | "md";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const VARIANT: Record<Variant, string> = {
  primary: [
    "bg-amber text-ground font-medium",
    "hover:bg-[#c07f2e]",
    "disabled:bg-[var(--c-amber-lo)] disabled:text-[var(--c-faint)]",
  ].join(" "),
  ghost: [
    "border border-[var(--c-rule-hi)] text-[var(--c-dim)]",
    "hover:border-[var(--c-amber)] hover:text-[var(--c-bone)]",
    "disabled:opacity-40",
  ].join(" "),
  danger: [
    "border border-[var(--c-synth)] text-[var(--c-synth)]",
    "hover:bg-[var(--c-synth-bg)]",
    "disabled:opacity-40",
  ].join(" "),
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[var(--t-small)]",
  md: "px-5 py-2.5 text-[var(--t-body)]",
};

export function Button({
  variant = "ghost",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center gap-2",
        "transition-colors duration-[var(--dur-fast)]",
        "disabled:cursor-not-allowed",
        "font-[var(--font-body)]",
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
