"use client";

import { useEffect, useRef } from "react";
import type { SpectrogramData } from "@/lib/types";

interface Props {
  spectrogram: SpectrogramData;
  height?: number;
}

// Simple cyan/violet perceptual-ish ramp for dB values (min..max normalized per-clip).
function colorForValue(norm: number): [number, number, number] {
  // norm in [0,1]. Low -> near-void, mid -> violet, high -> cyan/white.
  const stops: [number, [number, number, number]][] = [
    [0.0, [5, 7, 12]],
    [0.35, [43, 24, 92]],
    [0.65, [124, 58, 237]],
    [0.85, [34, 211, 238]],
    [1.0, [224, 255, 255]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i];
    const [p1, c1] = stops[i + 1];
    if (norm >= p0 && norm <= p1) {
      const t = (norm - p0) / (p1 - p0 || 1);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
    }
  }
  return stops[stops.length - 1][1];
}

export function SpectrogramView({ spectrogram, height = 220 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { db, freqs, times } = spectrogram;
    if (!db.length || !times.length) return;

    const nFreqs = db.length;
    const nTimes = times.length;
    canvas.width = nTimes;
    canvas.height = nFreqs;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let min = Infinity;
    let max = -Infinity;
    for (const row of db) {
      for (const v of row) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    const range = max - min || 1;

    const imageData = ctx.createImageData(nTimes, nFreqs);
    for (let f = 0; f < nFreqs; f++) {
      // flip vertically so low freq is at the bottom
      const destRow = nFreqs - 1 - f;
      for (let t = 0; t < nTimes; t++) {
        const norm = (db[f][t] - min) / range;
        const [r, g, b] = colorForValue(norm);
        const idx = (destRow * nTimes + t) * 4;
        imageData.data[idx] = r;
        imageData.data[idx + 1] = g;
        imageData.data[idx + 2] = b;
        imageData.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    void freqs;
  }, [spectrogram]);

  return (
    <div className="relative w-full" style={{ height }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: "pixelated" }}
        role="img"
        aria-label="Mel spectrogram computed from the analyzed audio"
      />
    </div>
  );
}
