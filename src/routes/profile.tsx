import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarClock,
  FileHeart,
  Heart,
  Phone,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { getCurrentPatient, subscribePatientStore } from "@/lib/current-patient";
import type { Patient } from "@/lib/patient-database";
import { EmergencyButton112 } from "@/components/safecall/emergency-button";
import { Disclaimers } from "@/components/safecall/disclaimers";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "SafeCall · Profilul meu medical" },
      {
        name: "description",
        content:
          "Datele tale ROeID — alergii, afecțiuni cronice, medicație — pregătite pentru dispeceratul 112.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const [patient, setPatient] = useState<Patient | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const sync = () => setPatient(getCurrentPatient());
    sync();
    const unsub = subscribePatientStore(sync);
    return () => {
      unsub();
    };
  }, []);

  if (!patient) {
    return (
      <main className="relative min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
        <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-5 py-10 text-center">
          <Card className="border-border/70 p-6">
            <UserRound className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-3 text-lg font-semibold text-foreground">
              Niciun utilizator autentificat
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pentru a vedea dosarul medical, autentifică-te cu ROeID din ecranul principal.
            </p>
            <button
              onClick={() => navigate({ to: "/" })}
              className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <ArrowLeft className="h-4 w-4" />
              Înapoi la SafeCall
            </button>
          </Card>
        </div>
      </main>
    );
  }

  const u = patient;

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-6 sm:py-10">
        <header className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Înapoi la SafeCall
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success)]/10 px-3 py-1 text-xs font-medium text-[color:var(--success)] ring-1 ring-inset ring-[color:var(--success)]/25">
            <BadgeCheck className="h-3.5 w-3.5" />
            ROeID Sincronizat
          </span>
        </header>

        <section className="mt-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <UserRound className="h-8 w-8 text-primary" strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{u.name}</h1>
            <p className="text-sm text-muted-foreground">
              CNP {maskCnp(u.cnp)} · {u.age} ani · {u.sex === "M" ? "masculin" : "feminin"} · grup
              sanguin {u.bloodType}
            </p>
            <p className="text-xs text-muted-foreground">{u.address}</p>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <Card className="border-border/70 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Phone className="h-3 w-3" /> Contact
            </p>
            <p className="text-sm text-foreground">{u.phone}</p>
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Contact de urgență
            </p>
            <p className="text-sm text-foreground">
              {u.emergencyContact.name}{" "}
              <span className="text-muted-foreground">({u.emergencyContact.relation})</span>
            </p>
            <p className="text-xs text-muted-foreground">{u.emergencyContact.phone}</p>
          </Card>
          <Card className="border-primary/20 bg-primary/5 p-4">
            <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3 w-3" /> Pregătit pentru 112
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              La long-press 112 sau apăsarea butonului „Contactează 112” din ecranul de Cod Roșu,
              datele de mai jos + locația GPS + ultima conversație cu AI ajung instant la
              dispecerat.
            </p>
          </Card>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoCard
            icon={<Heart className="h-5 w-5" />}
            title="Alergii"
            tone="warning"
            items={u.allergies}
          />
          <InfoCard
            icon={<FileHeart className="h-5 w-5" />}
            title="Afecțiuni cronice"
            tone="neutral"
            items={u.chronicConditions}
          />
          <InfoCard
            icon={<Pill className="h-5 w-5" />}
            title="Medicație curentă"
            tone="neutral"
            items={u.medication}
          />
          <InfoCard
            icon={<Stethoscope className="h-5 w-5" />}
            title="Note medicale"
            tone="neutral"
            items={u.notes ? [u.notes] : []}
          />
        </section>

        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarClock className="h-4 w-4 text-primary" />
            Istoric medical
          </h2>
          {u.medicalHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">Niciun eveniment înregistrat.</p>
          ) : (
            <ol className="space-y-2">
              {u.medicalHistory.map((ev, i) => (
                <li key={i}>
                  <Card className="flex items-start gap-3 border-border/70 p-3">
                    <span
                      className={`mt-0.5 inline-flex h-6 shrink-0 items-center justify-center rounded-full px-2 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
                        ev.type === "internare"
                          ? "bg-destructive/10 text-destructive ring-destructive/20"
                          : ev.type === "intervenție"
                            ? "bg-[color:var(--warm)]/15 text-[color:var(--warm)] ring-[color:var(--warm)]/30"
                            : "bg-secondary text-[color:var(--secondary-foreground)] ring-border"
                      }`}
                    >
                      {ev.type}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{ev.date}</p>
                      <p className="text-sm text-foreground">{ev.description}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </section>

        <Disclaimers />

        <p className="mt-10 text-center text-xs text-muted-foreground">
          SafeCall · Datele ROeID nu părăsesc dispozitivul tău decât în caz de urgență, către
          dispeceratul 112.
        </p>
      </div>

      <EmergencyButton112 patient={u} triage={null} />
    </main>
  );
}

function InfoCard({
  icon,
  title,
  items,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "neutral" | "warning";
}) {
  const ring = tone === "warning" ? "border-destructive/30 bg-destructive/5" : "border-border/70";
  const iconColor =
    tone === "warning"
      ? "bg-destructive/10 text-destructive"
      : "bg-secondary text-[color:var(--secondary-foreground)]";

  return (
    <Card className={`p-5 ${ring}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconColor}`}>
          {icon}
        </span>
        <p className="text-sm font-medium text-foreground">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Niciun item înregistrat.</p>
      ) : (
        <ul className="space-y-1.5 text-sm text-foreground">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1.5 inline-block h-1 w-1 flex-none rounded-full bg-current opacity-60" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function maskCnp(cnp: string): string {
  if (cnp.length < 7) return cnp;
  return cnp.slice(0, 4) + "•••••" + cnp.slice(-2);
}
