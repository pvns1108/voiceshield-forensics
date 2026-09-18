"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadAnalysis } from "@/lib/api";
import { ApiError } from "@/lib/api";

type Mode = "upload" | "record";

export function UploadPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("upload");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
      streamRef.current = stream;
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
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Microphone access failed:", err);
      setError(
        "Microphone access was denied or is unavailable. You can upload a file instead."
      );
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
      setError("Choose a file or make a recording first.");
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
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Upload failed. Check that the backend API is running.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const readyFile = selectedFile ?? recordedBlob;

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border border-hairline w-fit">
        <ModeButton active={mode === "upload"} onClick={() => setMode("upload")}>
          Upload file
        </ModeButton>
        <ModeButton active={mode === "record"} onClick={() => setMode("record")}>
          Record from microphone
        </ModeButton>
      </div>

      {mode === "upload" && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed p-10 text-center transition-colors ${
            dragActive ? "border-cyan bg-cyan/5" : "border-hairline-bright"
          }`}
        >
          <p className="text-ink mb-1">Drag and drop an audio file here</p>
          <p className="text-sm text-ink-faint mb-4">
            WAV, MP3, M4A, FLAC, or OGG — up to 25&nbsp;MB, 0.5–120s
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-hairline-bright text-sm text-ink hover:border-cyan/60 transition-colors"
          >
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,.mp3,.m4a,.flac,.ogg,audio/*"
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
        </div>
      )}

      {mode === "record" && (
        <div className="border border-hairline-bright p-10 text-center">
          <RecordingIndicator active={isRecording} />
          <p className="font-data text-2xl text-ink my-3">
            {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
            {String(recordSeconds % 60).padStart(2, "0")}
          </p>
          {!isRecording ? (
            <button
              type="button"
              onClick={startRecording}
              className="px-4 py-2 bg-cyan text-void text-sm font-medium hover:bg-cyan/90 transition-colors"
            >
              Start recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 bg-red text-void text-sm font-medium hover:bg-red/90 transition-colors"
            >
              Stop recording
            </button>
          )}
          <p className="text-xs text-ink-faint mt-4">
            Microphone audio is only sent to the API when you submit it below.
          </p>
        </div>
      )}

      {readyFile && (
        <div className="flex items-center justify-between border border-hairline px-4 py-3 text-sm">
          <span className="font-data text-ink-dim">
            {selectedFile ? selectedFile.name : "microphone-recording.webm"} —{" "}
            {(readyFile.size / 1024).toFixed(1)} KB
          </span>
          <button
            type="button"
            onClick={() => {
              setSelectedFile(null);
              setRecordedBlob(null);
            }}
            className="text-ink-faint hover:text-ink"
          >
            Clear
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red border border-red/30 bg-red/5 px-4 py-3">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!readyFile || submitting}
        className="w-full py-3 bg-cyan text-void font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-cyan/90 transition-colors"
      >
        {submitting ? "Uploading and analyzing…" : "Submit for analysis"}
      </button>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-4 py-2 text-sm transition-colors ${
        active ? "bg-cyan text-void" : "text-ink-dim hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function RecordingIndicator({ active }: { active: boolean }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full ${active ? "bg-red animate-pulse" : "bg-ink-faint"}`}
        aria-hidden="true"
      />
      <span className="text-xs text-ink-faint">
        {active ? "Recording" : "Idle"}
      </span>
    </div>
  );
}
