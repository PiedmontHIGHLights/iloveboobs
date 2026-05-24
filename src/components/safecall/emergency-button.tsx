import { useEffect, useRef, useState } from "react";
import { PhoneCall } from "lucide-react";
import { toast } from "sonner";

/**
 * Fail-safe 112 button — fixed in the bottom-right corner.
 *
 * Per spec: must require a 1.5s long-press to avoid accidental dialing.
 * After the threshold, it triggers `tel:112` on supported devices and
 * shows a confirmation toast in any case.
 */
const LONG_PRESS_MS = 1500;

export function EmergencyButton112() {
  const [progress, setProgress] = useState(0);
  const [armed, setArmed] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

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
      fireCall();
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
      // The call fired; still clear the visual state shortly after.
      setTimeout(reset, 400);
      return;
    }
    reset();
  };

  const fireCall = () => {
    toast.success("Apel către 112 inițiat", {
      description: "În mod normal aplicația apelează direct numărul de urgență.",
      duration: 4000,
    });
    try {
      // Best-effort: open the tel: handler on mobile devices.
      if (typeof window !== "undefined") {
        window.location.href = "tel:112";
      }
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
        {/* Progress ring */}
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
