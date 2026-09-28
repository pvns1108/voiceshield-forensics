"use client";

import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  /** Delay before reveal triggers (ms) */
  delay?: number;
  className?: string;
  as?: React.ElementType;
}

/**
 * Reveal — wraps content with an IntersectionObserver-driven fade-in.
 * Respects prefers-reduced-motion via CSS (the .reveal.visible class).
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const id = setTimeout(() => setVisible(true), delay);
          obs.disconnect();
          return () => clearTimeout(id);
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);

  return (
    <Tag
      ref={ref}
      className={["reveal", visible ? "visible" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Tag>
  );
}
