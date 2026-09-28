"use client";

import { useEffect, useState } from "react";

/** Shared easing constants — keep in sync with tokens.css */
export const ease = {
  out:    "cubic-bezier(0.16,1,0.3,1)",
  in:     "cubic-bezier(0.4,0,1,1)",
  snappy: "cubic-bezier(0.25,0,0,1)",
} as const;

export const dur = {
  fast:      120,
  mid:       240,
  slow:      400,
  cinematic: 1200,
} as const;

/** Returns true when the user prefers reduced motion */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return reduced;
}
