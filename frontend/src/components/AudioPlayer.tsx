"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  src: string;
  currentTime: number;
  onTimeUpdate: (t: number) => void;
  seekTo?: number | null;
}

export function AudioPlayer({ src, currentTime, onTimeUpdate, seekTo }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    if (seekTo != null && audioRef.current) {
      audioRef.current.currentTime = seekTo;
    }
  }, [seekTo]);

  function togglePlay() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
  }

  return (
    <div className="border border-hairline p-4 flex flex-col gap-3">
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
      />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="w-9 h-9 flex items-center justify-center border border-hairline-bright hover:border-cyan/60 transition-colors shrink-0"
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <div className="text-xs font-data text-ink-faint w-24 shrink-0">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="rate" className="text-xs text-ink-faint">Speed</label>
          <select
            id="rate"
            value={rate}
            onChange={(e) => {
              const r = Number(e.target.value);
              setRate(r);
              if (audioRef.current) audioRef.current.playbackRate = r;
            }}
            className="bg-panel border border-hairline text-xs text-ink px-1.5 py-1"
          >
            {[0.5, 0.75, 1, 1.25, 1.5].map((r) => (
              <option key={r} value={r}>{r}x</option>
            ))}
          </select>
          <label htmlFor="volume" className="text-xs text-ink-faint ml-2">Vol</label>
          <input
            id="volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v;
            }}
            className="w-20 accent-cyan"
          />
        </div>
      </div>
    </div>
  );
}

function formatTime(t: number): string {
  if (!isFinite(t)) return "0:00";
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--cyan)">
      <path d="M6 4l14 8-14 8V4z" />
    </svg>
  );
}
function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--cyan)">
      <rect x="5" y="4" width="5" height="16" />
      <rect x="14" y="4" width="5" height="16" />
    </svg>
  );
}
