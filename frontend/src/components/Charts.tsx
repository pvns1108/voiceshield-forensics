"use client";

import { useMemo } from "react";
import type { EnergyTimeline, PitchContour } from "@/lib/types";

interface PitchProps {
  pitch: PitchContour;
  height?: number;
}

export function PitchChart({ pitch, height = 140 }: PitchProps) {
  const width = 1000;
  const values = pitch.f0_hz.filter((v): v is number => v !== null);
  const minF0 = values.length ? Math.min(...values) * 0.9 : 0;
  const maxF0 = values.length ? Math.max(...values) * 1.1 : 1;

  const segments = useMemo(() => {
    // Break the path at nulls (unvoiced regions) so we don't draw fake
    // interpolated pitch across silence/unvoiced audio.
    const n = pitch.f0_hz.length;
    const paths: string[] = [];
    let current: string[] = [];
    for (let i = 0; i < n; i++) {
      const v = pitch.f0_hz[i];
      if (v === null) {
        if (current.length > 1) paths.push(`M ${current.join(" L ")}`);
        current = [];
        continue;
      }
      const x = (i / (n - 1 || 1)) * width;
      const y = height - ((v - minF0) / (maxF0 - minF0 || 1)) * (height - 16) - 8;
      current.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    if (current.length > 1) paths.push(`M ${current.join(" L ")}`);
    return paths;
  }, [pitch, minF0, maxF0, height]);

  if (values.length === 0) {
    return (
      <div className="flex items-center justify-center h-[140px] text-ink-faint text-sm font-data">
        No reliable voiced pitch detected in this clip.
      </div>
    );
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="Pitch contour over time">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={0} y1={height * f} x2={width} y2={height * f} stroke="var(--border-hairline)" strokeWidth={1} />
      ))}
      {segments.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="var(--violet)" strokeWidth={1.5} />
      ))}
    </svg>
  );
}

interface EnergyProps {
  energy: EnergyTimeline;
  height?: number;
}

export function EnergyChart({ energy, height = 100 }: EnergyProps) {
  const width = 1000;
  const max = Math.max(...energy.rms, 1e-6);

  const path = useMemo(() => {
    const n = energy.rms.length;
    if (n === 0) return "";
    const top = energy.rms.map((v, i) => {
      const x = (i / (n - 1 || 1)) * width;
      const y = height - (v / max) * (height - 8);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const bottomReversed = [...top].reverse().map((p) => {
      const [x] = p.split(",");
      return `${x},${height}`;
    });
    return `M ${top.join(" L ")} L ${bottomReversed.join(" L ")} Z`;
  }, [energy, max, height]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label="RMS energy over time">
      <path d={path} fill="rgba(34,211,238,0.18)" stroke="var(--cyan)" strokeWidth={1} />
    </svg>
  );
}
