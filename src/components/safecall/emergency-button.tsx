import { useEffect, useRef, useState } from "react";
import { PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { sendEmergencyAlert, type TriageResponse, type UserProfile } from "@/lib/safecall-client";
import { getBrowserLocation } from "@/lib/location";

/**
 * Fail-safe 112 button — fixed in the bottom-right corner.
 *
 * Per spec: must require a 1.5s long-press to avoid accidental dialing.
 * After the threshold, the button:
 *  1. Posts a structured alert to /api/dispatcher/emergency carrying the
 *     current patient (ROeID) + the last triage conversation + GPS location.
 *  2. Best-effort opens `tel:112` on devices that handle it.
 *
 * The alert is recorded server-side even if the user dismisses the system
 * dialer — that's exactly the safety net the spec requires (the doctor sees
 * the call attempt with all medical context).
 */
const LONG_PRESS_MS = 1500;

export function EmergencyButton112({
  patient,
  triage,
}: {
  patient: UserProfile | null;
  triage: TriageResponse | null;
}) {
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);
  const patientRef = useRef(patient);
  const triageRef = useRef(triage);

  useEffect(() => {
    patientRef.current = patient;
  }, [patient]);
  useEffect(() => {
    triageRef.current = triage;
  }, [triage]);

  const reset = () => {
    startedAtRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    setProgress(0);
    setArmed(false);
    firedRef.current = false;
  };

  useEffect(() => () => reset(), []);

  const tick = () => {
    if (startedAtRef.current == null) return;
    const elapsed = Date.now() - startedAtRef.current;
    const ratio = Math.min(1, elapsed / LONG_PRESS_MS);
    setProgress(ratio);
    if (ratio >= 1 && !firedRef.current) {
      firedRef.current = true;
      void fireCall();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const start = (e: React.PointerEvent | React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (firedRef.current) return;
    setArmed(true);
    startedAtRef.current = Date.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (firedRef.current) {
      setTimeout(reset, 400);
      return;
    }
    reset();
  };

  const fireCall = async () => {
    const location = await getBrowserLocation();
    const alert = await sendEmergencyAlert({
      patient: patientRef.current,
      triage: triageRef.current,
      location,
      triggeredBy: "user_112",
    });
    if (alert) {
      toast.success("Alertă transmisă la dispeceratul 112", {
        description: patientRef.current
          ? `Dosarul medical al ${patientRef.current.name.split(" ")[0]} și ultima conversație au fost trimise.`
          : "Apel 112 inițiat fără profil medical (mod invitat).",
        duration: 5000,
      });
    } else {
      toast.error("Alerta către dispecerat a eșuat", {
        description: "Verifică rețeaua. Apelul direct rămâne disponibil.",
      });
    }
    try {
      if (typeof window !== "undefined") window.location.href = "tel:112";
    } catch {
      // ignore
    }
  };

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50">
      <button
        type="button"
        aria-label="Apelează 112 (ține apăsat 1.5 secunde)"
        onPointerDown={start}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        onTouchStart={start}
        onTouchEnd={cancel}
        onTouchCancel={cancel}
        className={`pointer-events-auto relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full text-white shadow-xl ring-2 ring-white/40 transition-all duration-150 select-none ${
          armed ? "scale-105 bg-red-600" : "bg-red-600 hover:scale-105 hover:bg-red-500"
        }`}
        style={{ touchAction: "none" }}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(rgba(255,255,255,0.85) ${progress * 360}deg, transparent ${progress * 360}deg)`,
            opacity: armed ? 0.6 : 0,
            transition: "opacity 120ms ease",
          }}
        />
        <span className="absolute inset-[6px] flex items-center justify-center rounded-full bg-red-600">
          <PhoneCall className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <span className="sr-only">112</span>
      </button>
      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-red-600 drop-shadow-sm">
        Ține apăsat
      </p>
    </div>
  );
}
