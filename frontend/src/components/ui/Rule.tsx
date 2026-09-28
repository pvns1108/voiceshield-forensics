/** Hairline rule — horizontal separator */
export function Rule({ className = "" }: { className?: string }) {
  return (
    <hr
      className={["border-none border-t border-[var(--c-rule)] m-0", className].join(" ")}
      style={{ borderTopWidth: "1px", borderTopStyle: "solid" }}
    />
  );
}
