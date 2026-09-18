"use client";

import { useMemo, useRef } from "react";
import type { WaveformSeries, VadSegment } from "@/lib/types";

interface Props {
  waveform: WaveformSeries;
  vadSegments?: VadSegment[];
  durationSec: number;
  currentTime?: number;
  onSeek?: (time: number) => void;
  height?: number;
}

export function WaveformView({
  waveform,
  vadSegments = [],
  durationSec,
  currentTime = 0,
  onSeek,
  height = 140,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 1000;
  const midY = height / 2;

  const path = useMemo(() => {
    if (waveform.amplitudes.length === 0) return "";
    const n = waveform.amplitudes.length;
    const points = waveform.amplitudes.map((amp, i) => {
      const x = (i / (n - 1)) * width;
      const y = midY - amp * (midY - 8);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M ${points.join(" L ")}`;
  }, [waveform, midY]);

  const mirrorPath = useMemo(() => {
    if (waveform.amplitudes.length === 0) return "";
    const n = waveform.amplitudes.length;
    const points = waveform.amplitudes.map((amp, i) => {
      const x = (i / (n - 1)) * width;
      const y = midY + amp * (midY - 8);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return `M ${points.join(" L ")}`;
  }, [waveform, midY]);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onSeek || !svgRef.current || durationSec <= 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, fraction)) * durationSec);
  }

  const playheadX =
    durationSec > 0 ? (currentTime / durationSec) * width : 0;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full cursor-pointer select-none"
      role="img"
      aria-label="Waveform of analyzed audio"
      onClick={handleClick}
      preserveAspectRatio="none"
    >
      {/* silence bands, computed from real VAD segments */}
      {vadSegments
        .filter((s) => s.kind === "silence" && durationSec > 0)
        .map((s, i) => (
          <rect
            key={i}
            x={(s.start / durationSec) * width}
            y={0}
            width={Math.max(0, ((s.end - s.start) / durationSec) * width)}
            height={height}
            fill="rgba(148,163,184,0.06)"
          />
        ))}

      <line x1={0} y1={midY} x2={width} y2={midY} stroke="var(--border-hairline)" strokeWidth={1} />

      <path d={path} fill="none" stroke="var(--cyan)" strokeWidth={1.25} opacity={0.9} />
      <path d={mirrorPath} fill="none" stroke="var(--cyan-dim)" strokeWidth={1} opacity={0.55} />

      {durationSec > 0 && (
        <line
          x1={playheadX}
          y1={0}
          x2={playheadX}
          y2={height}
          stroke="var(--amber)"
          strokeWidth={1.5}
        />
      )}
    </svg>
  );
}
