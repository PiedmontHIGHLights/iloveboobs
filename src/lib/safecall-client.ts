import type { DispatcherAlert, TriageResponse, UserProfile } from "@/api/safecall-handlers";

export type { DispatcherAlert, TriageResponse, UserProfile };

export async function triageEmergency(args: {
  audioBlob: Blob;
  userProfile?: UserProfile | null;
  language?: "ro" | "en" | "auto";
  forceCritical?: "auto" | "true" | "false";
}): Promise<TriageResponse> {
  const fd = new FormData();
  fd.append("audioBlob", args.audioBlob, "symptoms.webm");
  if (args.userProfile) fd.append("userProfile", JSON.stringify(args.userProfile));
  fd.append("language", args.language ?? "ro");
  fd.append("forceCritical", args.forceCritical ?? "auto");

  const resp = await fetch("/api/triage", {
    method: "POST",
    body: fd,
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Triage failed (${resp.status}): ${text.slice(0, 200) || "no body"}`);
  }
  try {
    return JSON.parse(text) as TriageResponse;
  } catch {
    throw new Error("Triage response was not valid JSON.");
  }
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
