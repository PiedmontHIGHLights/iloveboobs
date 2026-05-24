import type {
  DispatcherAlert,
  TriageErrorResponse,
  TriageResponse,
  UserProfile,
} from "@/api/safecall-handlers";

export type { DispatcherAlert, TriageResponse, UserProfile, TriageErrorResponse };

/** localStorage keys */
const LS_KEY = "safecall.geminiApiKey";
const LS_MODEL = "safecall.geminiModel";

export const DEFAULT_MODEL = "gemini-2.5-flash";
export const AVAILABLE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-flash-latest",
];

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(LS_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key) window.localStorage.setItem(LS_KEY, key.trim());
    else window.localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

export function getStoredModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  try {
    return window.localStorage.getItem(LS_MODEL) || DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
}

export function setStoredModel(model: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_MODEL, model);
  } catch {
    // ignore
  }
}

/** Thrown when /api/triage returned a non-2xx error body (still structured). */
export class TriageError extends Error {
  code: TriageErrorResponse["code"];
  status?: number;
  fallback?: TriageResponse;
  constructor(payload: TriageErrorResponse) {
    super(payload.message);
    this.name = "TriageError";
    this.code = payload.code;
    this.status = payload.status;
    this.fallback = payload.fallback;
  }
}

export async function triageEmergency(args: {
  audioBlob: Blob;
  userProfile?: UserProfile | null;
  language?: "ro" | "en" | "auto";
  forceCritical?: "auto" | "true" | "false";
  apiKey?: string;
  model?: string;
}): Promise<TriageResponse> {
  const fd = new FormData();
  fd.append("audioBlob", args.audioBlob, "symptoms.webm");
  if (args.userProfile) fd.append("userProfile", JSON.stringify(args.userProfile));
  fd.append("language", args.language ?? "ro");
  fd.append("forceCritical", args.forceCritical ?? "auto");
  const key = args.apiKey ?? getStoredApiKey();
  if (key) fd.append("apiKey", key);
  fd.append("model", args.model ?? getStoredModel());

  const resp = await fetch("/api/triage", {
    method: "POST",
    body: fd,
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });

  const text = await resp.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      `Triage HTTP ${resp.status}: răspunsul nu este JSON valid (${text.slice(0, 120)}).`,
    );
  }

  if (!resp.ok) {
    if (parsed && typeof parsed === "object" && (parsed as { error?: unknown }).error === true) {
      throw new TriageError(parsed as TriageErrorResponse);
    }
    throw new Error(`Triage HTTP ${resp.status}`);
  }

  return parsed as TriageResponse;
}

export async function listDispatcherAlerts(): Promise<DispatcherAlert[]> {
  const resp = await fetch("/api/dispatcher/list", {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  if (!resp.ok) return [];
  try {
    const body = (await resp.json()) as { alerts?: DispatcherAlert[] };
    return body.alerts ?? [];
  } catch {
    return [];
  }
}

export async function clearDispatcherAlerts(): Promise<void> {
  await fetch("/api/dispatcher/clear", {
    method: "POST",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
}
