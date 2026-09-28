"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAnalysis, ApiError } from "@/lib/api";
import dynamic from "next/dynamic";

const LiveWaveform = dynamic(
  () => import("@/components/viz/LiveWaveform").then((m) => m.LiveWaveform),
  { ssr: false }
);

type Mode = "upload" | "record";

const CONSTRAINTS = [
  "wav · mp3 · m4a · flac · ogg · webm",
  "0.5 — 120 seconds",
  "Max 25 MB",
  "Contents verified with ffprobe, not just extension",
];

export function UploadConsole() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setSelectedFile(files[0]);
    setRecordedBlob(null);
    setError(null);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    onFiles(e.dataTransfer.files);
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        setSelectedFile(null);
        stream.getTracks().forEach((t) => t.stop());
        setMicStream(null);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone access was denied or unavailable. You can upload a file instead.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function handleSubmit() {
    const fileToSend = selectedFile ?? recordedBlob;
    if (!fileToSend) {
      setError("Select a file or record from the microphone first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const filename =
        selectedFile?.name ?? `recording-${new Date().toISOString()}.webm`;
      const result = await uploadAnalysis(fileToSend, filename);
      router.push(`/analysis/${result.id}`);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Upload failed. Verify the backend API is running on port 8000."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const readyFile = selectedFile ?? recordedBlob;
  const mm = String(Math.floor(recordSeconds / 60)).padStart(2, "0");
  const ss = String(recordSeconds % 60).padStart(2, "0");

  return (
    <div className="border border-[var(--c-rule)]">
      {/* Mode tabs */}
      <div className="flex border-b border-[var(--c-rule)]">
        {(["upload", "record"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            aria-pressed={mode === m}
            className={[
              "flex-1 py-3 font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.12em] uppercase transition-colors duration-[var(--dur-fast)] border-r border-[var(--c-rule)] last:border-r-0",
              mode === m
                ? "bg-[var(--c-surface)] text-[var(--c-bone)]"
                : "text-[var(--c-faint)] hover:text-[var(--c-dim)]",
            ].join(" ")}
          >
            {m === "upload" ? "File upload" : "Microphone"}
          </button>
        ))}
      </div>

      {/* Upload area */}
      {mode === "upload" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={[
            "relative px-8 py-16 flex flex-col items-center justify-center gap-4 text-center transition-colors duration-[var(--dur-fast)] cursor-pointer",
            dragActive
              ? "bg-[var(--c-amber-dim)] border-[var(--c-amber)]"
              : "bg-[var(--c-ground)] hover:bg-[var(--c-surface)]",
          ].join(" ")}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Click to select an audio file, or drag and drop"
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        >
          {/* Registration marks */}
          <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[var(--c-rule-hi)]" aria-hidden="true" />
          <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[var(--c-rule-hi)]" aria-hidden="true" />

          <div
            className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.12em] uppercase text-[var(--c-amber)] mb-1"
          >
            Drop audio file here
          </div>
          <p className="text-[var(--c-dim)]" style={{ fontSize: "var(--t-small)" }}>
            or click to browse
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.flac,.ogg,.webm,audio/*"
            className="sr-only"
            onChange={(e) => onFiles(e.target.files)}
            aria-label="Audio file input"
          />
        </div>
      )}

      {/* Record area */}
      {mode === "record" && (
        <div className="px-8 py-12 flex flex-col items-center gap-5">
          {/* Live waveform from mic — real input signal */}
          <div className="w-full border border-[var(--c-rule)] bg-[var(--c-ground)] overflow-hidden">
            <div
              className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.12em] uppercase text-[var(--c-faint)] px-3 py-1.5 border-b border-[var(--c-rule)]"
            >
              Live mic input {isRecording ? "— recording" : "— idle"}
            </div>
            <div className="px-2 py-2">
              <LiveWaveform stream={micStream} isActive={isRecording} height={72} />
            </div>
          </div>

          {/* Timer */}
          <div
            className="font-[var(--font-mono)] text-[var(--c-bone)] tabular-nums"
            style={{ fontSize: "clamp(2rem,5vw,3.5rem)" }}
            aria-live="polite"
            aria-label={`Recording time: ${mm} minutes ${ss} seconds`}
          >
            {mm}:{ss}
          </div>

          {/* Record / stop button */}
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-6 py-3 bg-[var(--c-amber)] text-[var(--c-ground)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase hover:bg-[#c07f2e] transition-colors duration-[var(--dur-fast)]"
            >
              Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-3 bg-[var(--c-synth)] text-[var(--c-bone)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase hover:bg-[#7a2e2e] transition-colors duration-[var(--dur-fast)]"
            >
              <span className="inline-block w-2 h-2 bg-[var(--c-bone)] rounded-full mr-2 animate-pulse" aria-hidden="true" />
              Stop recording
            </button>
          )}
          <p className="text-[var(--c-faint)] text-center" style={{ fontSize: "var(--t-micro)" }}>
            Audio is only sent to the API when you submit below.
          </p>
        </div>
      )}

      {/* Selected file bar */}
      {readyFile && (
        <div className="border-t border-[var(--c-rule)] px-5 py-3 flex items-center justify-between gap-4 bg-[var(--c-surface)]">
          <span className="font-[var(--font-mono)] text-[var(--c-dim)]" style={{ fontSize: "var(--t-small)" }}>
            {selectedFile ? selectedFile.name : "microphone-recording.webm"}
            <span className="text-[var(--c-faint)] ml-2">
              {(readyFile.size / 1024).toFixed(1)} KB
            </span>
          </span>
          <button
            type="button"
            onClick={() => { setSelectedFile(null); setRecordedBlob(null); }}
            className="text-[var(--c-faint)] hover:text-[var(--c-dim)] font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.08em] uppercase"
            aria-label="Clear selected file"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="border-t border-[var(--c-synth)]/40 px-5 py-3 bg-[var(--c-synth-bg)] font-[var(--font-mono)] text-[var(--c-synth)]"
          style={{ fontSize: "var(--t-small)" }}
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <div className="border-t border-[var(--c-rule)] p-5">
        <button
          type="button"
          id="submit-analysis-btn"
          onClick={handleSubmit}
          disabled={!readyFile || submitting}
          className="w-full py-3 bg-[var(--c-amber)] text-[var(--c-ground)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase hover:bg-[#c07f2e] transition-colors duration-[var(--dur-fast)] disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {submitting ? "Uploading — analyzing…" : "Submit for analysis"}
        </button>
      </div>
    </div>
  );
}
