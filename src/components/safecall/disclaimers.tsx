import { Info, PhoneCall, ShieldCheck } from "lucide-react";

/**
 * Always-visible disclaimers required by the SafeCall spec (gemini.md §3).
 */
export function Disclaimers() {
  return (
    <div className="mt-10 grid gap-2 sm:grid-cols-2">
      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-primary" />
        <p>
          <strong className="text-foreground">
            ID-ul tău digital, alergiile și medicația sunt deja pregătite.
          </strong>{" "}
          Dacă AI-ul detectează o urgență reală, le transmite la 112 împreună cu fișa, în mai puțin
          de o secundă.
        </p>
      </div>
      <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-[11px] leading-relaxed text-muted-foreground">
        <PhoneCall className="mt-0.5 h-3.5 w-3.5 flex-none text-red-600" />
        <p>
          <strong className="text-foreground">
            SafeCall nu blochează niciodată un apel la 112.
          </strong>{" "}
          Poți suna direct oricând din colțul ecranului.
        </p>
      </div>
    </div>
  );
}

export function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
      <Info className="h-3 w-3" />
      {children}
    </div>
  );
}
