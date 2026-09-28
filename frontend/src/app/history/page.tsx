"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteAnalysis, listAnalyses } from "@/lib/api";
import type { AnalysisSummary } from "@/lib/types";
import { PageShell } from "@/components/layout/PageShell";

const ASSESSMENT_LABELS: Record<string, string> = {
  likely_human: "Human",
  suspicious_inconclusive: "Inconc.",
  likely_synthetic: "Synth.",
  unavailable: "N/A",
  "": "Pending",
};

const ASSESSMENT_COLORS: Record<string, string> = {
  likely_human: "var(--c-human)",
  suspicious_inconclusive: "var(--c-inconc)",
  likely_synthetic: "var(--c-synth)",
  unavailable: "var(--c-unavail)",
  "": "var(--c-unavail)",
};

export default function HistoryPage() {
  const [items, setItems] = useState<AnalysisSummary[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState("");
  const [queryInput, setQueryInput] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    listAnalyses({
      status: statusFilter || undefined,
      assessment: assessmentFilter || undefined,
      q: committedQuery || undefined,
    })
      .then((data) => { if (active) setItems(data); })
      .catch(() => { if (active) setError("Could not load analysis history. Is the backend running?"); });
    return () => { active = false; };
  }, [statusFilter, assessmentFilter, committedQuery, refreshToken]);

  function reload() {
    setCommittedQuery(queryInput);
    setRefreshToken((t) => t + 1);
  }

  async function handleDelete(id: string, filename: string) {
    if (!confirm(`Permanently delete analysis of ${filename} and its stored audio? This cannot be undone.`)) return;
    await deleteAnalysis(id);
    setItems((prev) => prev?.filter((a) => a.id !== id) ?? null);
  }

  return (
    <PageShell>
      <div
        className="mx-auto px-[var(--gutter)] py-16"
        style={{ maxWidth: "var(--max-w)" }}
      >
        {/* Header */}
        <div className="mb-10 border-b border-[var(--c-rule)] pb-8">
          <div
            className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.18em] uppercase text-[var(--c-amber)] mb-3"
          >
            Case management
          </div>
          <h1
            className="font-[var(--font-display)] text-[var(--c-bone)]"
            style={{ fontSize: "var(--t-h1)", lineHeight: "var(--lh-tight)" }}
          >
            Analysis history
          </h1>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <input
            id="history-search"
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search filename, notes, case label…"
            aria-label="Search analyses"
            className="flex-1 min-w-[200px] bg-[var(--c-ground)] border border-[var(--c-rule)] px-3 py-2 font-[var(--font-mono)] text-[var(--c-bone)] placeholder:text-[var(--c-faint)] focus:border-[var(--c-amber)] outline-none"
            style={{ fontSize: "var(--t-small)" }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="bg-[var(--c-ground)] border border-[var(--c-rule)] px-3 py-2 font-[var(--font-mono)] text-[var(--c-dim)] focus:border-[var(--c-amber)] outline-none"
            style={{ fontSize: "var(--t-small)" }}
          >
            <option value="">All statuses</option>
            <option value="complete">Complete</option>
            <option value="failed">Failed</option>
          </select>
          <select
            value={assessmentFilter}
            onChange={(e) => setAssessmentFilter(e.target.value)}
            aria-label="Filter by assessment"
            className="bg-[var(--c-ground)] border border-[var(--c-rule)] px-3 py-2 font-[var(--font-mono)] text-[var(--c-dim)] focus:border-[var(--c-amber)] outline-none"
            style={{ fontSize: "var(--t-small)" }}
          >
            <option value="">All assessments</option>
            <option value="likely_human">Likely human</option>
            <option value="suspicious_inconclusive">Suspicious / inconclusive</option>
            <option value="likely_synthetic">Likely synthetic</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <button
            type="button"
            id="history-search-btn"
            onClick={reload}
            className="px-4 py-2 border border-[var(--c-rule-hi)] font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase text-[var(--c-dim)] hover:border-[var(--c-amber)] hover:text-[var(--c-bone)] transition-colors duration-[var(--dur-fast)]"
          >
            Search
          </button>
        </div>

        {error && (
          <p
            className="mb-6 border border-[var(--c-synth)]/40 bg-[var(--c-synth-bg)] px-4 py-3 font-[var(--font-mono)] text-[var(--c-synth)]"
            style={{ fontSize: "var(--t-small)" }}
          >
            {error}
          </p>
        )}

        {/* Table */}
        {items && items.length === 0 && (
          <div className="border border-[var(--c-rule)] px-8 py-16 text-center">
            <p
              className="font-[var(--font-mono)] text-[var(--c-faint)] mb-4"
              style={{ fontSize: "var(--t-small)" }}
            >
              No analyses yet.
            </p>
            <Link
              href="/analyze"
              className="font-[var(--font-mono)] text-[var(--t-small)] tracking-[0.08em] uppercase text-[var(--c-amber)]"
            >
              Begin your first analysis →
            </Link>
          </div>
        )}

        {items && items.length > 0 && (
          <div className="border border-[var(--c-rule)]" role="table" aria-label="Analysis history">
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-[var(--c-rule)] bg-[var(--c-surface)]"
              role="row"
            >
              {["Filename", "Created", "Duration", "Assessment", ""].map((h) => (
                <div
                  key={h}
                  className="px-4 py-2.5 font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.1em] uppercase text-[var(--c-faint)] border-r border-[var(--c-rule)] last:border-r-0"
                  role="columnheader"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-0 border-b border-[var(--c-rule)] last:border-b-0 hover:bg-[var(--c-surface)] transition-colors duration-[var(--dur-fast)]"
                role="row"
              >
                <div className="px-4 py-3 border-r border-[var(--c-rule)] min-w-0" role="cell">
                  <Link
                    href={`/analysis/${item.id}`}
                    className="block truncate font-[var(--font-mono)] text-[var(--c-bone)] hover:text-[var(--c-amber)] transition-colors duration-[var(--dur-fast)]"
                    style={{ fontSize: "var(--t-small)" }}
                  >
                    {item.original_filename}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="font-[var(--font-mono)] text-[var(--c-faint)]"
                      style={{ fontSize: "var(--t-micro)" }}
                    >
                      {item.id.slice(0, 8)}
                    </span>
                    {item.case_label && (
                      <>
                        <span className="text-[var(--c-rule-hi)]" aria-hidden="true">·</span>
                        <span
                          className="font-[var(--font-mono)] text-[var(--c-faint)]"
                          style={{ fontSize: "var(--t-micro)" }}
                        >
                          {item.case_label}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 border-r border-[var(--c-rule)] whitespace-nowrap" role="cell">
                  <span
                    className="font-[var(--font-mono)] text-[var(--c-dim)]"
                    style={{ fontSize: "var(--t-small)" }}
                  >
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="px-4 py-3 border-r border-[var(--c-rule)] whitespace-nowrap" role="cell">
                  <span
                    className="font-[var(--font-mono)] text-[var(--c-dim)] tabular-nums"
                    style={{ fontSize: "var(--t-small)" }}
                  >
                    {item.duration_sec.toFixed(1)}s
                  </span>
                </div>
                <div className="px-4 py-3 border-r border-[var(--c-rule)] whitespace-nowrap" role="cell">
                  <span
                    className="inline-flex items-center gap-1.5 font-[var(--font-mono)]"
                    style={{ fontSize: "var(--t-small)" }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: ASSESSMENT_COLORS[item.assessment] }}
                      aria-hidden="true"
                    />
                    <span style={{ color: ASSESSMENT_COLORS[item.assessment] }}>
                      {ASSESSMENT_LABELS[item.assessment] ?? "—"}
                    </span>
                  </span>
                </div>
                <div className="px-4 py-3" role="cell">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.original_filename)}
                    aria-label={`Delete analysis of ${item.original_filename}`}
                    className="font-[var(--font-mono)] text-[var(--t-micro)] tracking-[0.08em] uppercase text-[var(--c-faint)] hover:text-[var(--c-synth)] transition-colors duration-[var(--dur-fast)]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
