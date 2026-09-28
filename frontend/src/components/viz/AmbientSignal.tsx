"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/motion";

interface Props {
  /** aria-label for screen readers */
  label?: string;
}

/**
 * AmbientSignal — decorative procedural waveform canvas for the hero.
 * CLEARLY DECORATIVE: aria-hidden, never shows analysis data.
 * Renders slow-drifting sinusoidal interference patterns.
 */
export function AmbientSignal({ label }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    function resize() {
      if (!canvas) return;
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx!.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let t = 0;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      const cx = height / 2;

      // Multiple slow-drifting sine waves — clearly not real data
      const waves = [
        { freq: 0.008, amp: 0.22, phase: 0,    speed: 0.0007, opacity: 0.35 },
        { freq: 0.013, amp: 0.12, phase: 2.1,  speed: 0.0011, opacity: 0.20 },
        { freq: 0.005, amp: 0.30, phase: 4.5,  speed: 0.0004, opacity: 0.15 },
      ];

      for (const w of waves) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(212,144,58,${w.opacity})`;
        ctx.lineWidth = 1;

        for (let x = 0; x < width; x++) {
          const y = cx + Math.sin(x * w.freq + t * w.speed * 1000 + w.phase) * cx * w.amp;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      if (!reduced) {
        t += 1;
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
      role="presentation"
      data-decorative="true"
    />
  );
}
