"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/motion";

interface Props {
  /** Stream from getUserMedia — real mic input. Permitted because it IS the user's signal. */
  stream: MediaStream | null;
  isActive: boolean;
  height?: number;
}

/**
 * LiveWaveform — draws real-time microphone input via AnalyserNode.
 * This is REAL INPUT DATA (the user's own microphone), so it is explicitly
 * allowed to look like a waveform — it helps the user confirm the mic is live.
 */
export function LiveWaveform({ stream, isActive, height = 80 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !stream || !isActive) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set up Web Audio
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    analyserRef.current = analyser;
    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;
    source.connect(analyser);

    const bufLen = analyser.frequencyBinCount;
    const dataArr = new Uint8Array(bufLen);

    const W = canvas.offsetWidth * window.devicePixelRatio;
    const H = height * window.devicePixelRatio;
    canvas.width = W;
    canvas.height = H;

    function draw() {
      if (!ctx || !analyser) return;
      analyser.getByteTimeDomainData(dataArr);

      ctx.clearRect(0, 0, W, H);

      // Grid line
      ctx.strokeStyle = "rgba(38,36,32,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, H / 2);
      ctx.lineTo(W, H / 2);
      ctx.stroke();

      // Real mic waveform
      ctx.beginPath();
      ctx.strokeStyle = "rgba(212,144,58,0.8)";
      ctx.lineWidth = 1.5;
      const sliceWidth = W / bufLen;
      let x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v = dataArr[i] / 128 - 1;
        const y = (v * H) / 2 + H / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      if (!reduced) rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      audioCtx.close().catch(() => {});
    };
  }, [stream, isActive, height, reduced]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={height}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Live microphone input waveform"
    />
  );
}
