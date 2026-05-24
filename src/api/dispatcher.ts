import { createServerFn } from "@tanstack/react-start";
import type { UserProfile } from "./triage";

export type DispatcherAlert = {
  id: string;
  receivedAt: number;
  severity: number;
  uiMessage: string;
  summary: string;
  vitalsRisk: string;
  transcript?: string;
  patient: UserProfile | null;
  location?: { lat: number; lng: number };
};

/**
 * Server-only in-memory queue for the dispatcher demo.
 * Persists for the lifetime of the worker process. Good enough for a 48h
 * hackathon demo; do NOT rely on this in production.
 */
type AlertStore = { alerts: DispatcherAlert[] };
const STORE_KEY = "__safecall_dispatcher_store__";

function store(): AlertStore {
  const g = globalThis as unknown as Record<string, AlertStore | undefined>;
  if (!g[STORE_KEY]) g[STORE_KEY] = { alerts: [] };
  return g[STORE_KEY] as AlertStore;
}

export function recordDispatcherAlert(
  payload: Omit<DispatcherAlert, "id" | "receivedAt">,
): DispatcherAlert {
  const alert: DispatcherAlert = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: Date.now(),
    ...payload,
  };
  const s = store();
  s.alerts.unshift(alert);
  if (s.alerts.length > 50) s.alerts.length = 50;
  return alert;
}

export const listDispatcherAlerts = createServerFn({ method: "GET" }).handler(
  async (): Promise<DispatcherAlert[]> => {
    return store().alerts;
  },
);

export const clearDispatcherAlerts = createServerFn({
  method: "POST",
}).handler(async (): Promise<{ ok: true }> => {
  store().alerts = [];
  return { ok: true };
});
