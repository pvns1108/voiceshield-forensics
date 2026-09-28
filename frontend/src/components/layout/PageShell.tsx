import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

interface PageShellProps {
  children: React.ReactNode;
  /** Additional className on the <main> element */
  className?: string;
}

/** Wraps every page with the shared header, main, and footer. */
export function PageShell({ children, className = "" }: PageShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main
        id="main-content"
        className={["flex-1 page-enter", className].join(" ")}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
