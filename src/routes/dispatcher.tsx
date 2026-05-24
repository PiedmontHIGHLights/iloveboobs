import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileHeart,
  Heart,
  MapPin,
  Phone,
  Pill,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  Truck,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  clearDispatcherAlerts,
  listDispatcherAlerts,
  updateAlertStatus,
  type DispatcherAlert,
} from "@/lib/safecall-client";

export const Route = createFileRoute("/dispatcher")({
  head: () => ({
    meta: [
      { title: "SafeCall · Dispecerat 112" },
      {
        name: "description",
        content:
          "Tablou de bord pentru dispeceratul 112. Primește alerte SafeCall cu fișa medicală ROeID în timp real.",
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
    onSuccess: () => {
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["dispatcherAlerts"] });
    },
  });

  const alerts = alertsQuery.data ?? [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => alerts.find((a) => a.id === selectedId) ?? alerts[0] ?? null,
    [alerts, selectedId],
  );

  const counts = useMemo(() => {
    const pending = alerts.filter((a) => a.status === "pending").length;
    const dispatched = alerts.filter((a) => a.status === "dispatched").length;
    const resolved = alerts.filter((a) => a.status === "resolved").length;
    return { pending, dispatched, resolved };
  }, [alerts]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 ring-1 ring-destructive/20">
              <Stethoscope className="h-6 w-6 text-destructive" strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Dispecerat 112 · SafeCall
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Tablou de bord medic / dispecer
              </h1>
              <p className="text-xs text-muted-foreground">
                Polling la 2s · datele provin doar din apelurile inițiate de utilizatori prin
                butonul 112.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Vizualizare pacient
            </Link>
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

        <section className="mt-5 grid gap-3 sm:grid-cols-4">
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="În așteptare"
            value={counts.pending}
            tone="warn"
          />
          <StatCard
            icon={<Truck className="h-4 w-4" />}
            label="Echipaj trimis"
            value={counts.dispatched}
            tone="info"
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Rezolvate"
            value={counts.resolved}
            tone="ok"
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Total"
            value={alerts.length}
            tone="neutral"
          />
        </section>

        {alerts.length === 0 ? (
          <Card className="mt-8 flex flex-col items-center gap-3 border-dashed border-border/70 bg-muted/20 p-12 text-center">
            <Stethoscope className="h-10 w-10 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Sistemul așteaptă apeluri</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Niciun apel 112 nu a fost transmis prin SafeCall încă. Cere utilizatorului să țină
              apăsat butonul 112 din colț sau să apese „Contactează 112” după triajul vocal.
            </p>
          </Card>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
            <aside className="space-y-2 lg:max-h-[78vh] lg:overflow-y-auto">
              {alerts.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`block w-full rounded-xl border p-3 text-left transition-colors ${
                    (selected?.id ?? alerts[0]?.id) === a.id
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border/70 bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
                        a.severity >= 4
                          ? "bg-destructive/15 text-destructive ring-destructive/30"
                          : "bg-secondary text-[color:var(--secondary-foreground)] ring-border"
                      }`}
                    >
                      Sev {a.severity}/5
                    </span>
                    <StatusPill status={a.status} compact />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
                    {a.patient?.name ?? "Mod invitat"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.patient
                      ? `CNP ${maskCnp(a.patient.cnp)} · ${a.patient.age} ani`
                      : "ID necunoscut"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{a.summary}</p>
                  <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatAge(a.receivedAt)}
                  </p>
                </button>
              ))}
            </aside>

            <section>{selected ? <AlertDetail alert={selected} /> : null}</section>
          </div>
        )}
      </div>
    </main>
  );
}

function AlertDetail({ alert }: { alert: DispatcherAlert }) {
  const qc = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: (status: DispatcherAlert["status"]) => updateAlertStatus(alert.id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dispatcherAlerts"] }),
  });

  const p = alert.patient;

  return (
    <Card className="border-border/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                alert.severity >= 4
                  ? "bg-destructive/15 text-destructive ring-destructive/30"
                  : "bg-secondary text-[color:var(--secondary-foreground)] ring-border"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Severitate {alert.severity}/5
            </span>
            <StatusPill status={alert.status} />
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatAge(alert.receivedAt)} ·{" "}
              {new Date(alert.receivedAt).toLocaleTimeString("ro-RO")}
            </span>
          </div>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
            {alert.summary}
          </h2>
          {alert.vitalsRisk && (
            <p className="text-sm text-destructive">
              Suspiciune AI: <strong>{alert.vitalsRisk}</strong>
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            Declanșat de:{" "}
            <strong className="text-foreground">
              {alert.triggeredBy === "user_112"
                ? "buton 112 (long-press)"
                : "buton Cod Roșu din ecranul de triaj"}
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={alert.status === "dispatched" ? "default" : "outline"}
            size="sm"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate("dispatched")}
          >
            <Truck className="h-3.5 w-3.5" />
            Trimit echipaj
          </Button>
          <Button
            variant={alert.status === "resolved" ? "default" : "outline"}
            size="sm"
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate("resolved")}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Marchează rezolvat
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={updateStatus.isPending || alert.status === "pending"}
            onClick={() => updateStatus.mutate("pending")}
          >
            Redeschide
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Card className="border-border/70 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <UserRound className="h-3 w-3" />
            Pacient · ROeID
          </p>
          {p ? (
            <div className="space-y-1 text-sm">
              <p className="font-medium text-foreground">
                {p.name}{" "}
                <span className="text-muted-foreground">
                  · {p.age} ani · {p.sex === "M" ? "M" : "F"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                CNP {maskCnp(p.cnp)} · grup {p.bloodType ?? "?"}
              </p>
              {p.address && (
                <p className="text-xs text-muted-foreground">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  {p.address}
                </p>
              )}
              {p.phone && (
                <p className="text-xs text-muted-foreground">
                  <Phone className="mr-1 inline h-3 w-3" />
                  {p.phone}
                </p>
              )}
              {p.emergencyContact && (
                <p className="mt-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">Urgență:</strong> {p.emergencyContact.name} (
                  {p.emergencyContact.relation}) · {p.emergencyContact.phone}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Apel în mod invitat — nicio fișă ROeID atașată.
            </p>
          )}
        </Card>

        <Card className="border-border/70 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <MapPin className="h-3 w-3" />
            Locație
          </p>
          {alert.location ? (
            <>
              <p className="text-sm text-foreground">
                {alert.location.lat.toFixed(5)}, {alert.location.lng.toFixed(5)}
              </p>
              <a
                target="_blank"
                rel="noreferrer noopener"
                href={`https://www.openstreetmap.org/?mlat=${alert.location.lat}&mlon=${alert.location.lng}#map=16/${alert.location.lat}/${alert.location.lng}`}
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                Vezi pe hartă →
              </a>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Locația GPS nu a fost transmisă (permisiune refuzată sau indisponibilă).
            </p>
          )}
        </Card>

        {p &&
          (p.allergies.length > 0 ||
            p.chronicConditions.length > 0 ||
            (p.medication && p.medication.length > 0)) && (
            <Card className="border-border/70 p-4 md:col-span-2">
              <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <FileHeart className="h-3 w-3" />
                Fișa medicală extrasă prin ROeID
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <FieldList
                  icon={<Heart className="h-3.5 w-3.5" />}
                  label="Alergii"
                  tone="warn"
                  items={p.allergies}
                />
                <FieldList
                  icon={<FileHeart className="h-3.5 w-3.5" />}
                  label="Afecțiuni cronice"
                  tone="neutral"
                  items={p.chronicConditions}
                />
                <FieldList
                  icon={<Pill className="h-3.5 w-3.5" />}
                  label="Medicație"
                  tone="neutral"
                  items={p.medication ?? []}
                />
              </div>
              {p.notes && (
                <p className="mt-3 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> {p.notes}
                </p>
              )}
              {p.medicalHistory && p.medicalHistory.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Istoric recent
                  </p>
                  <ul className="space-y-1 text-xs text-foreground">
                    {p.medicalHistory.slice(0, 4).map((h, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="font-mono text-muted-foreground">{h.date}</span>
                        <span>
                          <strong>{h.type}:</strong> {h.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

        <Card className="border-primary/25 bg-primary/5 p-4 md:col-span-2">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" />
            Analiză AI{alert.aiModel ? ` · ${alert.aiModel}` : ""}{" "}
            {alert.aiSource === "demo" && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-normal text-muted-foreground ring-1 ring-inset ring-border">
                DEMO
              </span>
            )}
          </p>
          {alert.consideredContext && alert.consideredContext.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Context medical folosit de AI
              </p>
              <div className="flex flex-wrap gap-1.5">
                {alert.consideredContext.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center rounded-full bg-background px-2 py-0.5 text-[11px] text-foreground ring-1 ring-inset ring-primary/20"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
          {alert.aiUiResult && (
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldList
                icon={<Heart className="h-3.5 w-3.5" />}
                label="Simptome identificate"
                tone="neutral"
                items={alert.aiUiResult.simptome_identificate}
              />
              <FieldList
                icon={<Sparkles className="h-3.5 w-3.5" />}
                label="Cauze posibile"
                tone="neutral"
                items={alert.aiUiResult.cauze_posibile}
              />
              <FieldList
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Recomandări"
                tone="ok"
                items={alert.aiUiResult.recomandari}
              />
              <FieldList
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                label="Sună 112 dacă"
                tone="warn"
                items={alert.aiUiResult.suna_112_daca_apare}
              />
            </div>
          )}
          {alert.transcript && (
            <div className="mt-3 rounded-md bg-background/70 p-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Transcript audio
              </p>
              <p className="text-sm italic text-foreground">“{alert.transcript}”</p>
            </div>
          )}
        </Card>
      </div>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "warn" | "info" | "ok" | "neutral";
}) {
  const map = {
    warn: "bg-destructive/10 text-destructive ring-destructive/20",
    info: "bg-primary/10 text-primary ring-primary/20",
    ok: "bg-[color:var(--success)]/10 text-[color:var(--success)] ring-[color:var(--success)]/25",
    neutral: "bg-muted text-foreground ring-border",
  } as const;
  return (
    <Card className={`flex items-center gap-3 p-3 ring-1 ring-inset ${map[tone]}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-background/60">
        {icon}
      </span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider">{label}</p>
        <p className="text-xl font-semibold leading-none">{value}</p>
      </div>
    </Card>
  );
}

function StatusPill({
  status,
  compact = false,
}: {
  status: DispatcherAlert["status"];
  compact?: boolean;
}) {
  const map = {
    pending: {
      cls: "bg-destructive/15 text-destructive ring-destructive/30",
      label: "În așteptare",
    },
    dispatched: {
      cls: "bg-primary/10 text-primary ring-primary/30",
      label: "Echipaj trimis",
    },
    resolved: {
      cls: "bg-[color:var(--success)]/10 text-[color:var(--success)] ring-[color:var(--success)]/30",
      label: "Rezolvat",
    },
  } as const;
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${s.cls} ${compact ? "" : ""}`}
    >
      {s.label}
    </span>
  );
}

function FieldList({
  icon,
  label,
  items,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  items: string[];
  tone: "warn" | "ok" | "neutral";
}) {
  const ring =
    tone === "warn"
      ? "ring-destructive/25"
      : tone === "ok"
        ? "ring-[color:var(--success)]/25"
        : "ring-border";
  return (
    <div>
      <p
        className={`mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground`}
      >
        {icon}
        {label}
      </p>
      {items.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">—</p>
      ) : (
        <ul className={`space-y-1 rounded-md bg-background/50 p-2 ring-1 ring-inset ${ring}`}>
          {items.map((it, i) => (
            <li key={i} className="text-xs text-foreground">
              • {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function maskCnp(cnp: string): string {
  if (!cnp || cnp.length < 7) return cnp;
  return cnp.slice(0, 4) + "•••••" + cnp.slice(-2);
}

function formatAge(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s în urmă`;
  if (s < 3600) return `${Math.floor(s / 60)}m în urmă`;
  return `${Math.floor(s / 3600)}h în urmă`;
}
