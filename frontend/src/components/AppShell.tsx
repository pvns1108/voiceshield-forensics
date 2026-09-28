import { PageShell } from "./layout/PageShell";

/**
 * AppShell — legacy alias preserved for compatibility, delegating to the redesigned PageShell.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
