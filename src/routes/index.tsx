import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { triageEmergency } from "@/api/triage";
import { toast } from "sonner";
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Clock,
  FileHeart,
  Loader2,
  Mic,
  MapPin,
  PhoneCall,
  Pill,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sanitas AI — Triaj medical inteligent" },
      {
        name: "description",
        content:
          "Sanitas AI: triaj medical digital prin ROeID. Descrie simptomele și primește îndrumare calmă, profesională.",
      },
    ],
  }),
  component: SanitasApp,
});

type AppState = "IDLE" | "RECORDING" | "PROCESSING" | "RESULT_MINOR" | "RESULT_CRITICAL";

type DispatcherPayload = {
  summary: string;
  vitalsRisk: string;
};

type TriageResponse = {
  severity: 1 | 2 | 3 | 4 | 5;
  uiMessage: string;
  dataForDispatcher?: DispatcherPayload;
};

type UserProfile = {
  name: string;
  cnp: string;
  age: number;
  allergies: string[];
  chronicConditions: string[];
};

const MOCK_USER: UserProfile = {
  name: "Andrei Popescu",
  cnp: "1900512123456",
  age: 35,
  allergies: ["Penicilină"],
  chronicConditions: ["Hipertensiune arterială"],
};

const CRITICAL_RESPONSE = {
  severity: 5,
  uiMessage:
    "pentru siguranța ta, este indicat ca un echipaj medical să evalueze rapid situația. Cel mai bine este să contactezi serviciul de urgență. Între timp, așează-te relaxat pe un scaun sau fotoliu.",
  dataForDispatcher: {
    summary: "Durere toracică severă, iradiere braț stâng, transpirații reci.",
    vitalsRisk: "Posibil sindrom coronarian acut",
  },
};

const MINOR_RESPONSE = {
  severity: 2,
  uiMessage:
    "Situația nu pare a fi o urgență vitală, dar ai nevoie de îngrijire. Pentru durerea descrisă, poți consulta un farmacist pentru un tratament adecvat.",
};

function SanitasApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [screen, setScreen] = useState<"AUTH" | "MAIN">("AUTH");
  const [forceCritical, setForceCritical] = useState<boolean | null>(null); // demo toggle

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setUserProfile(MOCK_USER);
    setScreen("MAIN");
    toast.success("Profil medical sincronizat cu succes", {
      description: "Datele tale ROeID sunt acum disponibile pentru echipajele medicale.",
    });
  };

  const handleGuestBypass = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setScreen("MAIN");
  };

  const [triageResponse, setTriageResponse] = useState<TriageResponse | null>(null);

  const resetToIdle = () => {
    setTriageResponse(null);
    setAppState("IDLE");
  };

  const handleProcessingComplete = async (resp: TriageResponse) => {
    setTriageResponse(resp);
    setAppState(resp.severity >= 4 ? "RESULT_CRITICAL" : "RESULT_MINOR");
  };

  // replaced above with resetToIdle that also clears triageResponse
  

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      {screen === "AUTH" ? (
        <AuthScreen onAuthenticated={handleAuthSuccess} onBypass={handleGuestBypass} />
      ) : (
        <MainScreen
          isAuthenticated={isAuthenticated}
          userProfile={userProfile}
          appState={appState}
          setAppState={setAppState}
          onProcessingComplete={(resp: TriageResponse) => {
            if (resp) handleProcessingComplete(resp);
          }}
          onReset={resetToIdle}
          forceCritical={forceCritical}
          setForceCritical={setForceCritical}
        />
      )}
    </main>
  );
}

/* -------------------- Screen 1: Auth -------------------- */

function AuthScreen({
  onAuthenticated,
  onBypass,
}: {
  onAuthenticated: () => void;
  onBypass: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [cnp, setCnp] = useState("1900512123456");
  const [password, setPassword] = useState("••••••••");
  const [sms, setSms] = useState("");

  const close = () => {
    setOpen(false);
    setTimeout(() => setStep(1), 200);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
            <Activity className="h-8 w-8 text-primary" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Sanitas AI
          </h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Acces prin ROeID
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Triaj medical inteligent. Autentifică-te pentru ca sumarul tău
            medical să fie disponibil instant echipajelor de urgență.
          </p>
        </div>

        <Card className="border-border/70 p-6 shadow-sm">
          <Button
            size="lg"
            className="h-12 w-full text-base"
            onClick={() => setOpen(true)}
          >
            <ShieldCheck className="h-5 w-5" />
            Autentificare cu ROeID
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>SAU</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            onClick={onBypass}
            className="w-full rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Ai o urgență acum? Sari peste autentificare
            <span className="block text-xs opacity-75">(Fără profil medical)</span>
          </button>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Sanitas AI · Hackathon România Digitală
        </p>
      </div>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              {step === 1 ? "Autentificare ROeID" : "Verificare 2FA"}
            </DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Introdu credențialele tale ROeID pentru a continua."
                : "Am trimis un cod SMS la numărul asociat. Introdu-l mai jos."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 ? (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="cnp">CNP / Username</Label>
                <Input
                  id="cnp"
                  value={cnp}
                  onChange={(e) => setCnp(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pwd">Parolă</Label>
                <Input
                  id="pwd"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" onClick={() => setStep(2)}>
                Continuă
                <ChevronRight />
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="sms">Cod SMS</Label>
                <Input
                  id="sms"
                  inputMode="numeric"
                  placeholder="123456"
                  value={sms}
                  onChange={(e) => setSms(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Demo: orice cod este acceptat.
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  close();
                  onAuthenticated();
                }}
              >
                <BadgeCheck />
                Verifică și autentifică-te
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------- Screen 2 + 3: Main -------------------- */

function MainScreen({
  isAuthenticated,
  userProfile,
  appState,
  setAppState,
  onProcessingComplete,
  onReset,
  forceCritical,
  setForceCritical,
}: {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  appState: AppState;
  setAppState: (s: AppState) => void;
  onProcessingComplete: (resp: TriageResponse) => void;
  onReset: () => void;
  forceCritical: boolean | null;
  setForceCritical: (v: boolean | null) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (appState === "PROCESSING") {
      timerRef.current = setTimeout(() => onProcessingComplete(), 2000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [appState, onProcessingComplete]);

  const handlePress = () => {
    if (appState === "IDLE") setAppState("RECORDING");
  };
  const handleRelease = () => {
    if (appState === "RECORDING") setAppState("PROCESSING");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-6 sm:py-10">
      <Header isAuthenticated={isAuthenticated} userProfile={userProfile} />

      <div className="mt-8 flex-1">
        {appState === "RESULT_CRITICAL" ? (
          <CriticalView userProfile={userProfile} onReset={onReset} />
        ) : appState === "RESULT_MINOR" ? (
          <MinorView onReset={onReset} />
        ) : (
          <TriggerView
            appState={appState}
            onPress={handlePress}
            onRelease={handleRelease}
            onTriage={onProcessingComplete}
            isAuthenticated={isAuthenticated}
            userProfile={userProfile}
          />
        )}
      </div>

      {(appState === "IDLE" || appState === "RECORDING") && (
        <SecondaryActions />
      )}

      <DemoToggle value={forceCritical} onChange={setForceCritical} />
    </div>
  );
}

function Header({
  isAuthenticated,
  userProfile,
}: {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
}) {
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/15">
          <Activity className="h-5 w-5 text-primary" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Sanitas AI
          </p>
          <p className="text-sm font-semibold text-foreground">
            {isAuthenticated && userProfile
              ? `Salut, ${userProfile.name.split(" ")[0]}`
              : "Mod Invitat"}
          </p>
        </div>
      </div>

      {isAuthenticated ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-medium text-[color:var(--success)] ring-1 ring-inset ring-[color:var(--success)]/20">
          <BadgeCheck className="h-3.5 w-3.5" />
          ROeID Sincronizat
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
          <UserRound className="h-3.5 w-3.5" />
          Date nesincronizate
        </span>
      )}
    </header>
  );
}

function TriggerView({
  appState,
  onPress,
  onRelease,
  onTriage,
  isAuthenticated,
  userProfile,
}: {
  appState: AppState;
  onPress: () => void;
  onRelease: () => void;
  onTriage: (resp: TriageResponse) => void;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
}) {
  const isRecording = appState === "RECORDING";
  const isProcessing = appState === "PROCESSING";

  const [mediaError, setMediaError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    if (isProcessing) return;
    setMediaError(null);

    onPress();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        try {
          const formData = new FormData();
          formData.append("audioBlob", blob);
          if (isAuthenticated && userProfile) {
            formData.append("userProfile", JSON.stringify(userProfile));
          }
          formData.append("language", "ro");

          // Trimitere directă a obiectului FormData, fără wrapper-ul { data: ... }
          const resp = (await triageEmergency(formData as any)) as any;
          onTriage(resp as TriageResponse);
        } catch (err) {
          console.error(err);
          toast.error("Nu am putut procesa audio-ul.", {
            description: "Încearcă din nou sau folosește demo.",
          });
          onTriage(null as any);
        } finally {
          // stop mic tracks
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
    } catch (e) {
      console.error(e);
      setMediaError("Microfon indisponibil sau permisiune refuzată.");
      toast.error("Microfon indisponibil", {
        description: "Verifică permisiunile microfonului și încearcă din nou.",
      });
      onRelease();
    }
  };

  const stopRecording = () => {
    if (isProcessing) return;
    onRelease();

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        {isProcessing
          ? "Te rugăm să rămâi calm"
          : isRecording
            ? "Te ascult..."
            : "Ce simți în acest moment?"}
      </p>
      <h2 className="mb-12 max-w-md text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-3xl">
        {isProcessing
          ? "Sanitas AI analizează simptomele..."
          : isRecording
            ? "Descrie liber simptomele tale"
            : "Apasă și descrie ce te deranjează"}
      </h2>

      <div className="relative">
        {isRecording && (
          <span className="pulse-ring pointer-events-none absolute inset-0 rounded-full" />
        )}
        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={() => isRecording && stopRecording()}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
          className={`relative flex h-44 w-44 items-center justify-center rounded-full text-primary-foreground shadow-xl transition-all duration-300 select-none ${
            isRecording
              ? "scale-105 bg-[color:var(--accent)] text-[color:var(--accent-foreground)]"
              : isProcessing
                ? "bg-primary/80"
                : "bg-primary hover:scale-[1.02] hover:shadow-2xl active:scale-100"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="h-12 w-12 animate-spin" strokeWidth={2} />
          ) : isRecording ? (
            <AudioWave />
          ) : (
            <Mic className="h-14 w-14" strokeWidth={1.8} />
          )}
        </button>
      </div>

      <p className="mt-10 max-w-sm text-sm leading-relaxed text-muted-foreground">
        {isProcessing
          ? "Procesăm vocea ta în siguranță. Durează câteva secunde."
          : isRecording
            ? "Eliberează butonul când ai terminat de descris."
            : "Ține apăsat și descrie simptomele. Sanitas AI te va îndruma către îngrijirea potrivită."}
      </p>
    </div>
  );
}

function AudioWave() {
  return (
    <div className="flex items-end gap-1.5">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="block w-1.5 rounded-full bg-current"
          style={{
            height: "1rem",
            animation: `wave 1s ease-in-out ${i * 0.12}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { height: 0.6rem; opacity: 0.6; }
          50% { height: 2.4rem; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SecondaryActions() {
  return (
    <div className="mt-10 grid grid-cols-2 gap-3">
      <Card className="flex items-center gap-3 border-border/70 p-4 transition-colors hover:bg-muted/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-[color:var(--secondary-foreground)]">
          <FileHeart className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Istoric Medical</p>
          <p className="truncate text-xs text-muted-foreground">
            Consultații, alergii, rețete
          </p>
        </div>
      </Card>
      <Card className="flex items-center gap-3 border-border/70 p-4 transition-colors hover:bg-muted/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[color:var(--accent)]/30 text-[color:var(--accent-foreground)]">
          <Pill className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Farmacii de gardă</p>
          <p className="truncate text-xs text-muted-foreground">Deschise acum lângă tine</p>
        </div>
      </Card>
    </div>
  );
}

/* -------------------- Result Views -------------------- */

function CriticalView({
  userProfile,
  onReset,
}: {
  userProfile: UserProfile | null;
  onReset: () => void;
}) {
  const name = userProfile?.name.split(" ")[0] ?? "Tu";

  const handleCall = () => {
    toast.success("Date transmise către 112. Apel în curs...", {
      description: "Dosarul medical și sumarul simptomelor au fost trimise dispeceratului.",
      duration: 5000,
    });
  };

  return (
    <div className="py-4">
      <button
        onClick={onReset}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Înapoi
      </button>

      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--warm)]/15 px-3 py-1 text-xs font-medium text-[color:var(--warm)] ring-1 ring-inset ring-[color:var(--warm)]/30">
        <Sparkles className="h-3.5 w-3.5" />
        Recomandare prioritară
      </div>

      <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-[1.65rem]">
        {name}, {CRITICAL_RESPONSE.uiMessage}
      </h2>

      <Card className="mt-6 border-border/70 bg-card p-5">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sumar pentru dispecerat
        </p>
        <dl className="space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Simptome</dt>
            <dd className="text-right font-medium text-foreground">
              {CRITICAL_RESPONSE.dataForDispatcher.summary}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">Suspiciune</dt>
            <dd className="text-right font-medium text-foreground">
              {CRITICAL_RESPONSE.dataForDispatcher.vitalsRisk}
            </dd>
          </div>
          {userProfile && (
            <>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Alergii</dt>
                <dd className="text-right font-medium text-foreground">
                  {userProfile.allergies.join(", ")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Afecțiuni cronice</dt>
                <dd className="text-right font-medium text-foreground">
                  {userProfile.chronicConditions.join(", ")}
                </dd>
              </div>
            </>
          )}
        </dl>
      </Card>

      <Button
        size="lg"
        onClick={handleCall}
        className="mt-6 h-14 w-full text-base"
      >
        <PhoneCall className="h-5 w-5" />
        Contactează Serviciul de Urgență (112)
      </Button>

      <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        Prin apăsare, dosarul tău medical și sumarul simptomelor vor fi
        transmise automat dispeceratului pentru a câștiga timp.
      </p>
    </div>
  );
}

function MinorView({
  onReset,
}: {
  onReset: () => void;
  triageResponse?: TriageResponse | null;
}) {
  const handleEmergency = () => {
    toast.success("Date transmise către 112. Apel în curs...", {
      description: "Te punem în legătură cu un dispecer.",
    });
  };

  return (
    <div className="py-4">
      <button
        onClick={onReset}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Înapoi
      </button>

      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)]/30 px-3 py-1 text-xs font-medium text-[color:var(--accent-foreground)] ring-1 ring-inset ring-[color:var(--accent)]/40">
        <Sparkles className="h-3.5 w-3.5" />
        Îndrumare blândă
      </div>

      <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-[1.65rem]">
        {MINOR_RESPONSE.uiMessage}
      </h2>

      <Card className="mt-6 overflow-hidden border-border/70">
        <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-secondary via-muted to-[color:var(--accent)]/25">
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="relative flex flex-col items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
              <MapPin className="h-6 w-6" />
            </div>
            <p className="mt-3 rounded-full bg-card px-3 py-1 text-xs font-medium text-foreground shadow-sm ring-1 ring-border">
              3 farmacii deschise în apropiere
            </p>
          </div>
        </div>
        <div className="divide-y divide-border">
          {[
            { name: "Farmacia Catena", dist: "320 m", hours: "Non-stop" },
            { name: "Sensiblu Centru", dist: "640 m", hours: "Până la 23:00" },
            { name: "Help Net", dist: "1.1 km", hours: "Non-stop" },
          ].map((f) => (
            <div key={f.name} className="flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{f.name}</p>
                <p className="text-xs text-muted-foreground">{f.dist} de tine</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-[color:var(--success)]">
                <Clock className="h-3.5 w-3.5" />
                {f.hours}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Button
        variant="outline"
        size="lg"
        onClick={handleEmergency}
        className="mt-6 h-12 w-full text-sm"
      >
        <PhoneCall className="h-4 w-4" />
        Mă simt totuși foarte rău. Vreau să sun la 112.
      </Button>
    </div>
  );
}

/* -------------------- Demo toggle -------------------- */

function DemoToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <div className="mt-10 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      <span>Demo:</span>
      <button
        onClick={() => onChange(null)}
        className={`rounded-full px-2 py-0.5 ring-1 transition-colors ${value === null ? "bg-primary/10 text-primary ring-primary/30" : "ring-border hover:bg-muted"}`}
      >
        Aleator
      </button>
      <button
        onClick={() => onChange(false)}
        className={`rounded-full px-2 py-0.5 ring-1 transition-colors ${value === false ? "bg-primary/10 text-primary ring-primary/30" : "ring-border hover:bg-muted"}`}
      >
        Minor
      </button>
      <button
        onClick={() => onChange(true)}
        className={`rounded-full px-2 py-0.5 ring-1 transition-colors ${value === true ? "bg-primary/10 text-primary ring-primary/30" : "ring-border hover:bg-muted"}`}
      >
        Critic
      </button>
    </div>
  );
}
