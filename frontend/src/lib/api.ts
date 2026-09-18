import type {
  AnalysisDetail,
  AnalysisSummary,
  ApiErrorBody,
  ModelInfo,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseErrorOrThrow(response: Response): Promise<never> {
  let detail = `Request failed with status ${response.status}.`;
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body?.detail) detail = body.detail;
  } catch {
    // ignore parse failure, use default message
  }
  throw new ApiError(detail, response.status);
}

export async function uploadAnalysis(file: File | Blob, filename?: string): Promise<AnalysisDetail> {
  const form = new FormData();
  form.append("file", file, filename ?? (file instanceof File ? file.name : "recording.webm"));

  const response = await fetch(`${API_BASE_URL}/api/v1/analyses`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function getAnalysis(id: string): Promise<AnalysisDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyses/${id}`);
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export interface ListFilters {
  status?: string;
  assessment?: string;
  q?: string;
}

export async function listAnalyses(filters: ListFilters = {}): Promise<AnalysisSummary[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.assessment) params.set("assessment", filters.assessment);
  if (filters.q) params.set("q", filters.q);

  const response = await fetch(`${API_BASE_URL}/api/v1/analyses?${params.toString()}`);
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function updateAnalysis(
  id: string,
  payload: { case_label?: string; notes?: string; tags?: string[] }
): Promise<AnalysisDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyses/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export async function deleteAnalysis(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/analyses/${id}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 204) return parseErrorOrThrow(response);
}

export async function getModelInfo(): Promise<ModelInfo> {
  const response = await fetch(`${API_BASE_URL}/api/v1/model-info`);
  if (!response.ok) return parseErrorOrThrow(response);
  return response.json();
}

export { API_BASE_URL };
