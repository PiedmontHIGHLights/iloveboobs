/**
 * Cross-route store for the currently logged-in patient + last triage.
 * Backed by localStorage so /profile, /dispatcher (in another tab), and the
 * 112 button all see the same value, and survives refreshes.
 */

import { patientById, type Patient } from "./patient-database";
import type { TriageResponse } from "@/api/safecall-handlers";

const LS_PATIENT = "safecall.currentPatientId";
const LS_LAST_TRIAGE = "safecall.lastTriage";

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) {
    try {
      l();
    } catch {
      // ignore
    }
  }
}

export function subscribePatientStore(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function getCurrentPatient(): Patient | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(LS_PATIENT);
    if (!id) return null;
    return patientById(id) ?? null;
  } catch {
    return null;
  }
}

export function setCurrentPatient(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(LS_PATIENT, id);
    else window.localStorage.removeItem(LS_PATIENT);
  } catch {
    // ignore
  }
  emit();
}

export function getLastTriage(): TriageResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_LAST_TRIAGE);
    if (!raw) return null;
    return JSON.parse(raw) as TriageResponse;
  } catch {
    return null;
  }
}

export function setLastTriage(t: TriageResponse | null): void {
  if (typeof window === "undefined") return;
  try {
    if (t) window.localStorage.setItem(LS_LAST_TRIAGE, JSON.stringify(t));
    else window.localStorage.removeItem(LS_LAST_TRIAGE);
  } catch {
    // ignore
  }
  emit();
}
