/**
 * Best-effort browser geolocation lookup with a tight timeout. Resolves to
 * null when permission denied / unavailable so the caller can still send the
 * emergency alert without coordinates.
 */
export async function getBrowserLocation(
  timeoutMs = 4000,
): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: { lat: number; lng: number } | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    try {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          finish({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          clearTimeout(timer);
          finish(null);
        },
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: timeoutMs },
      );
    } catch {
      finish(null);
    }
  });
}
