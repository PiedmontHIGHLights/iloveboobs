import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  MapPin,
  RefreshCcw,
  Stethoscope,
  Trash2,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  listDispatcherAlerts,
  clearDispatcherAlerts,
  type DispatcherAlert,
} from "@/lib/safecall-client";

export const Route = createFileRoute("/dispatcher")({
  head: () => ({
    meta: [
      { title: "SafeCall · Dispecerat 112 (demo)" },
      {
        name: "description",
        content:
          "Tablou de bord pentru dispeceratul 112. Primește alerte Cod Roșu generate de SafeCall în timp real.",
      },
    ],
  }),
  component: DispatcherPage,
});

function DispatcherPage() {
  const qc = useQueryClient();
  const alertsQuery = useQuery<DispatcherAlert[]>({
    queryKey: ["dispatcherAlerts"],
    queryFn: () => listDispatcherAlerts(),
    refetchInterval: 2000,
    refetchOnWindowFocus: true,
  });

  const clearMutation = useMutation({
    mutationFn: () => clearDispatcherAlerts(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dispatcherAlerts"] }),
  });

  const alerts = alertsQuery.data ?? [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 py-6 sm:py-10">
        <header className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Înapoi la aplicație
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["dispatcherAlerts"] })}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reîmprospătează
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearMutation.mutate()}
              disabled={clearMutation.isPending || alerts.length === 0}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Golește lista
            </Button>
          </div>
        </header>

        <section className="mt-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
            <Stethoscope className="h-7 w-7 text-destructive" strokeWidth={2.2} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Dispecerat 112 · Demo
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {alerts.length === 0
                ? "Niciun apel critic în coadă"
                : `${alerts.length} alertă${alerts.length === 1 ? "" : "e"} Cod Roșu`}
            </h1>
            <p className="text-sm text-muted-foreground">
              Polling la fiecare 2s · alertele sunt stocate în memorie pentru demo.
            </p>
          </div>
        </section>

        {alerts.length === 0 ? (
          <Card className="mt-10 flex flex-col items-center gap-3 border-dashed border-border/70 bg-muted/30 p-10 text-center">
            <Stethoscope className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Sistemul așteaptă apeluri</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Folosește comutatorul „Demo · Critic" în aplicație, sau descrie un simptom critic prin
              microfon, ca să vezi un apel sosind aici în timp real.
            </p>
          </Card>
        ) : (
          <ol className="mt-8 grid gap-4">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}

function AlertCard({ alert }: { alert: DispatcherAlert }) {
  const ageSec = Math.max(0, Math.floor((Date.now() - alert.receivedAt) / 1000));
  return (
    <li>
      <Card className="border-destructive/30 bg-destructive/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive ring-1 ring-inset ring-destructive/30">
              <AlertTriangle className="h-3.5 w-3.5" />
              Severitate {alert.severity}/5
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {ageSec < 60 ? `${ageSec}s` : `${Math.floor(ageSec / 60)}m`} în urmă
            </span>
          </div>
          {alert.location && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)}
            </span>
          )}
        </div>

        <h3 className="mt-3 text-base font-semibold text-foreground">
          {alert.summary || alert.uiMessage}
        </h3>
        {alert.vitalsRisk && (
          <p className="mt-1 text-sm text-destructive">
            Suspiciune: <strong>{alert.vitalsRisk}</strong>
          </p>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <UserRound className="h-3 w-3" />
              Pacient
            </p>
            {alert.patient ? (
              <div className="space-y-0.5 text-xs text-foreground">
                <p className="font-medium">{alert.patient.name}</p>
                <p className="text-muted-foreground">
                  CNP {alert.patient.cnp.slice(0, 4)}•••••
                  {alert.patient.cnp.slice(-2)} · {alert.patient.age} ani
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Apel în mod invitat</p>
            )}
          </div>
          <div className="rounded-lg border border-border/60 bg-background/60 p-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fișa medicală
            </p>
            {alert.patient ? (
              <div className="space-y-0.5 text-xs text-foreground">
                <p>
                  <span className="text-muted-foreground">Alergii: </span>
                  {alert.patient.allergies.join(", ") || "—"}
                </p>
                <p>
                  <span className="text-muted-foreground">Cronice: </span>
                  {alert.patient.chronicConditions.join(", ") || "—"}
                </p>
                {alert.patient.medication && alert.patient.medication.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Medicație: </span>
                    {alert.patient.medication.join(", ")}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nu există fișă ROeID.</p>
            )}
          </div>
        </div>

        {alert.transcript && (
          <p className="mt-3 rounded-md bg-background/50 p-3 text-xs italic text-muted-foreground">
            “{alert.transcript}”
          </p>
        )}
      </Card>
    </li>
  );
}
