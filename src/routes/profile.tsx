import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BadgeCheck,
  FileHeart,
  Heart,
  Pill,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { MOCK_USER } from "@/lib/mock-user";
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
  const u = MOCK_USER;
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
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{u.name}</h1>
            <p className="text-sm text-muted-foreground">
              CNP {maskCnp(u.cnp)} · {u.age} ani
            </p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
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
            title="Medicație"
            tone="neutral"
            items={u.medication}
          />
          <Card className="border-primary/20 bg-primary/5 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-foreground">Pregătit pentru 112</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              În cazul unei urgențe majore, SafeCall trimite automat dispeceratului numele tău,
              CNP-ul, alergiile, afecțiunile cronice și medicația — împreună cu locația GPS și
              rezumatul vocal al simptomelor.
            </p>
          </Card>
        </section>

        <Disclaimers />

        <p className="mt-10 text-center text-xs text-muted-foreground">
          SafeCall · Datele ROeID nu părăsesc dispozitivul tău decât în caz de urgență, către
          dispeceratul 112.
        </p>
      </div>

      <EmergencyButton112 />
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
