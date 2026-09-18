"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { deleteAnalysis, listAnalyses } from "@/lib/api";
import type { AnalysisSummary } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { Panel } from "@/components/Panel";
import { AssessmentBadge } from "@/components/AssessmentBadge";

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
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setError("Could not load analysis history. Is the backend running?");
      });
    return () => {
      active = false;
    };
  }, [statusFilter, assessmentFilter, committedQuery, refreshToken]);

  function reload() {
    setCommittedQuery(queryInput);
    setRefreshToken((t) => t + 1);
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this analysis and its stored audio? This cannot be undone.")) {
      return;
    }
    await deleteAnalysis(id);
    setItems((prev) => prev?.filter((a) => a.id !== id) ?? null);
  }

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-6">
          <div className="text-xs font-data text-cyan mb-2">Case management</div>
          <h1 className="text-2xl font-semibold text-ink">Analysis history</h1>
        </div>

        <Panel className="mb-6">
          <div className="flex flex-wrap gap-3">
            <input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && reload()}
              placeholder="Search filename, notes, case label…"
              className="flex-1 min-w-[200px] bg-void border border-hairline px-3 py-2 text-sm text-ink focus:border-cyan/60"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-void border border-hairline px-3 py-2 text-sm text-ink"
            >
              <option value="">All statuses</option>
              <option value="complete">Complete</option>
              <option value="failed">Failed</option>
            </select>
            <select
              value={assessmentFilter}
              onChange={(e) => setAssessmentFilter(e.target.value)}
              className="bg-void border border-hairline px-3 py-2 text-sm text-ink"
            >
              <option value="">All assessments</option>
              <option value="likely_human">Likely human</option>
              <option value="suspicious_inconclusive">Suspicious / inconclusive</option>
              <option value="likely_synthetic">Likely synthetic</option>
              <option value="unavailable">Unavailable</option>
            </select>
            <button
              type="button"
              onClick={reload}
              className="px-4 py-2 border border-hairline-bright text-sm text-ink hover:border-cyan/60"
            >
              Search
            </button>
          </div>
        </Panel>

        {error && <p className="text-sm text-red">{error}</p>}

        {items && items.length === 0 && (
          <Panel>
            <p className="text-sm text-ink-dim text-center py-8">
              No analyses yet.{" "}
              <Link href="/analyze" className="text-cyan">Start your first analysis →</Link>
            </p>
          </Panel>
        )}

        {items && items.length > 0 && (
          <div className="border border-hairline divide-y divide-hairline">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-panel/60">
                <div className="min-w-0">
                  <Link href={`/analysis/${item.id}`} className="text-sm text-ink hover:text-cyan truncate block">
                    {item.original_filename}
                  </Link>
                  <div className="text-xs text-ink-faint font-data mt-1">
                    {new Date(item.created_at).toLocaleString()} · {item.duration_sec.toFixed(1)}s
                    {item.case_label && <> · {item.case_label}</>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <AssessmentBadge assessment={item.assessment} />
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    aria-label={`Delete analysis of ${item.original_filename}`}
                    className="text-xs text-ink-faint hover:text-red px-2 py-1"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
