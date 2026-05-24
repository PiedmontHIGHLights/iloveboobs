import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { triageEmergency, TriageError, type TriageResponse } from "@/lib/safecall-client";
import { ApiKeyButton } from "@/components/safecall/api-key-dialog";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  Clock,
  FileHeart,
  Heart,
  Languages,
  Loader2,
  MapPin,
  Mic,
  PhoneCall,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
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
import { MOCK_USER, type UserProfile } from "@/lib/mock-user";
import { EmergencyButton112 } from "@/components/safecall/emergency-button";
import { Disclaimers } from "@/components/safecall/disclaimers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeCall — Triaj vocal pentru 112" },
      {
        name: "description",
        content:
          "SafeCall: asistentul vocal AI care filtrează apelurile la 112. Descrie simptomele și primește îndrumare calmă, în orice limbă.",
      },
    ],
  }),
  component: SafeCallApp,
});

type AppState = "IDLE" | "RECORDING" | "PROCESSING" | "RESULT_MINOR" | "RESULT_CRITICAL";

function SafeCallApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appState, setAppState] = useState<AppState>("IDLE");
  const [screen, setScreen] = useState<"AUTH" | "MAIN">("AUTH");
  const [forceCritical, setForceCritical] = useState<boolean | null>(null);
  const [triageResponse, setTriageResponse] = useState<TriageResponse | null>(null);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    setUserProfile(MOCK_USER);
    setScreen("MAIN");
    toast.success("Profil medical sincronizat", {
      description: "Datele tale ROeID sunt disponibile pentru echipajele medicale.",
    });
  };

  const handleGuestBypass = () => {
    setIsAuthenticated(false);
    setUserProfile(null);
    setScreen("MAIN");
  };

  const resetToIdle = () => {
    setTriageResponse(null);
    setAppState("IDLE");
  };

  const handleProcessingComplete = (resp: TriageResponse | null) => {
    if (!resp) {
      setAppState("IDLE");
      return;
    }
    setTriageResponse(resp);
    setAppState(resp.severity >= 4 ? "RESULT_CRITICAL" : "RESULT_MINOR");
  };

  return (
    <main className="relative min-h-screen bg-gradient-to-b from-background via-background to-secondary/40">
      {screen === "AUTH" ? (
        <AuthScreen onAuthenticated={handleAuthSuccess} onBypass={handleGuestBypass} />
      ) : (
        <MainScreen
          isAuthenticated={isAuthenticated}
          userProfile={userProfile}
          appState={appState}
          setAppState={setAppState}
          triageResponse={triageResponse}
          onProcessingComplete={handleProcessingComplete}
          onReset={resetToIdle}
          forceCritical={forceCritical}
          setForceCritical={setForceCritical}
        />
      )}
      {screen === "MAIN" && <EmergencyButton112 />}
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
            <ShieldCheck className="h-8 w-8 text-primary" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">SafeCall</h1>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Triaj vocal pentru 112 · România Digitală
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Autentifică-te prin ROeID pentru ca dosarul tău medical să fie transmis instant la
            dispecerat în caz de urgență reală.
          </p>
        </div>

        <Card className="border-border/70 p-6 shadow-sm">
          <Button size="lg" className="h-12 w-full text-base" onClick={() => setOpen(true)}>
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
            Sari peste — am o urgență acum
            <span className="block text-xs opacity-75">(fără preluarea fișei medicale)</span>
          </button>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          SafeCall · Cluj Hackathon 2026 · Digital Romania
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
                <Input id="cnp" value={cnp} onChange={(e) => setCnp(e.target.value)} />
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
                <p className="text-xs text-muted-foreground">Demo: orice cod este acceptat.</p>
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
  triageResponse,
  onProcessingComplete,
  onReset,
  forceCritical,
  setForceCritical,
}: {
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  appState: AppState;
  setAppState: (s: AppState) => void;
  triageResponse: TriageResponse | null;
  onProcessingComplete: (resp: TriageResponse | null) => void;
  onReset: () => void;
  forceCritical: boolean | null;
  setForceCritical: (v: boolean | null) => void;
}) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-5 py-6 sm:py-10">
      <Header isAuthenticated={isAuthenticated} userProfile={userProfile} />

      <div className="mt-8 flex-1">
        {appState === "RESULT_CRITICAL" && triageResponse ? (
          <CriticalView userProfile={userProfile} response={triageResponse} onReset={onReset} />
        ) : appState === "RESULT_MINOR" && triageResponse ? (
          <MinorView response={triageResponse} onReset={onReset} />
        ) : (
          <TriggerView
            appState={appState}
            setAppState={setAppState}
            onTriage={onProcessingComplete}
            isAuthenticated={isAuthenticated}
            userProfile={userProfile}
            forceCritical={forceCritical}
          />
        )}
      </div>

      {(appState === "IDLE" || appState === "RECORDING") && (
        <SecondaryActions isAuthenticated={isAuthenticated} />
      )}

      <Disclaimers />

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
          <ShieldCheck className="h-5 w-5 text-primary" strokeWidth={2.2} />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            SafeCall
          </p>
          <p className="text-sm font-semibold text-foreground">
            {isAuthenticated && userProfile
              ? `Salut, ${userProfile.name.split(" ")[0]}`
              : "Mod Invitat"}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {isAuthenticated ? (
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--success)]/10 px-3 py-1 text-xs font-medium text-[color:var(--success)] ring-1 ring-inset ring-[color:var(--success)]/25 transition-colors hover:bg-[color:var(--success)]/15"
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            ROeID Sincronizat
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border">
            <UserRound className="h-3.5 w-3.5" />
            Date nesincronizate
          </span>
        )}
        <ApiKeyButton />
        <Link
          to="/dispatcher"
          className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-border transition-colors hover:bg-foreground hover:text-background"
          title="Vizualizează dispeceratul (demo)"
        >
          <Stethoscope className="h-3.5 w-3.5" />
          Dispecerat
        </Link>
      </div>
    </header>
  );
}

function TriggerView({
  appState,
  setAppState,
  onTriage,
  isAuthenticated,
  userProfile,
  forceCritical,
}: {
  appState: AppState;
  setAppState: (s: AppState) => void;
  onTriage: (resp: TriageResponse | null) => void;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  forceCritical: boolean | null;
}) {
  const isRecording = appState === "RECORDING";
  const isProcessing = appState === "PROCESSING";

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const stoppedRef = useRef(false);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const sendAudio = async (blob: Blob) => {
    setAppState("PROCESSING");
    try {
      const resp = await triageEmergency({
        audioBlob: blob,
        userProfile: isAuthenticated ? userProfile : null,
        language: "ro",
        forceCritical: forceCritical === null ? "auto" : forceCritical ? "true" : "false",
      });
      onTriage(resp);
    } catch (err) {
      console.error(err);
      if (err instanceof TriageError) {
        if (err.code === "no_api_key") {
          toast.warning("Configurează cheia Gemini", {
            description:
              "Apasă pe „Configurează Gemini” în antet și lipește o cheie de la aistudio.google.com.",
            duration: 7000,
          });
        } else if (err.code === "gemini_quota") {
          toast.error("Cota Gemini este depășită", {
            description: err.message,
            duration: 8000,
          });
        } else if (err.code === "gemini_key_invalid") {
          toast.error("Cheia Gemini a fost respinsă", {
            description: err.message,
            duration: 8000,
          });
        } else if (err.code === "no_audio") {
          toast.error("Nu am primit audio", { description: err.message });
        } else {
          toast.error("AI-ul nu a răspuns", {
            description: err.message,
            duration: 7000,
          });
        }
        if (err.fallback) {
          onTriage(err.fallback);
          return;
        }
      } else {
        toast.error("Nu am putut procesa audio-ul.", {
          description:
            (err as Error)?.message ??
            "Verifică conexiunea și încearcă din nou. Pentru urgențe reale folosește butonul 112.",
        });
      }
      onTriage(null);
    }
  };

  // Demo path: forceCritical without microphone. Generates an empty blob and lets the server return the canned response.
  const runDemo = async () => {
    setAppState("PROCESSING");
    // Empty audio is fine — server falls back to forceCritical hint.
    const blob = new Blob([new Uint8Array(1)], { type: "audio/webm" });
    await sendAudio(blob);
  };

  const startRecording = async () => {
    if (isProcessing || isRecording) return;

    // Quick path for demo mode without microphone.
    if (forceCritical !== null && typeof navigator === "undefined") {
      runDemo();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stoppedRef.current = false;

      chunksRef.current = [];

      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";

      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (stoppedRef.current) return;
        stoppedRef.current = true;
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        await sendAudio(blob);
      };

      recorder.start();
      setAppState("RECORDING");
    } catch (e) {
      console.error(e);
      // Microphone unavailable — if a demo override is set, still run the demo.
      if (forceCritical !== null) {
        runDemo();
        return;
      }
      toast.error("Microfon indisponibil", {
        description:
          "Verifică permisiunile microfonului sau folosește comutatorul Demo pentru a vedea un exemplu.",
      });
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setAppState("IDLE");
    }
  };

  const handleClick = () => {
    if (isProcessing) return;
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
          ? "SafeCall analizează simptomele..."
          : isRecording
            ? "Descrie liber simptomele tale"
            : "Apasă o dată ca să vorbești, încă o dată ca să trimiți"}
      </h2>

      <div className="relative">
        {isRecording && (
          <span className="pulse-ring pointer-events-none absolute inset-0 rounded-full" />
        )}
        <button
          onClick={handleClick}
          disabled={isProcessing}
          aria-pressed={isRecording}
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
        {isProcessing ? (
          "Procesăm vocea în siguranță. Durează câteva secunde."
        ) : isRecording ? (
          "Apasă din nou când ai terminat de descris."
        ) : (
          <>
            Vorbește în <strong>orice limbă</strong> — SafeCall traduce și structurează automat
            pentru dispecerii 112.
          </>
        )}
      </p>

      {!isRecording && !isProcessing && (
        <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Languages className="h-3.5 w-3.5" />
          <span>Whisper-style speech-to-text · Gemini 2.0 triaj</span>
        </div>
      )}
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

function SecondaryActions({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <div className="mt-10 grid grid-cols-2 gap-3">
      <Link
        to={isAuthenticated ? "/profile" : "/"}
        className="block"
        onClick={(e) => {
          if (!isAuthenticated) {
            e.preventDefault();
            toast.info("Disponibil după autentificare ROeID");
          }
        }}
      >
        <Card className="flex h-full items-center gap-3 border-border/70 p-4 transition-colors hover:bg-muted/50">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-[color:var(--secondary-foreground)]">
            <FileHeart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Istoric Medical</p>
            <p className="truncate text-xs text-muted-foreground">
              {isAuthenticated ? "Alergii, medicație, afecțiuni" : "Necesită autentificare"}
            </p>
          </div>
        </Card>
      </Link>
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

function SourceBadge({ response }: { response: TriageResponse }) {
  const isAi = response.source === "gemini";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${
        isAi
          ? "bg-primary/10 text-primary ring-primary/25"
          : "bg-muted text-muted-foreground ring-border"
      }`}
      title={isAi ? `Răspuns generat de ${response.model ?? "Gemini"}` : "Răspuns demo (canned)"}
    >
      <Sparkles className="h-3 w-3" />
      {isAi ? `AI · ${response.model ?? "Gemini"}` : "Demo"}
    </span>
  );
}

function CriticalView({
  userProfile,
  response,
  onReset,
}: {
  userProfile: UserProfile | null;
  response: TriageResponse;
  onReset: () => void;
}) {
  const name = userProfile?.name.split(" ")[0] ?? "Tu";
  const dispatcher = response.dataForDispatcher;

  const handleCall = () => {
    toast.success("Date transmise către dispeceratul 112.", {
      description: "Dosarul medical, locația și sumarul AI au fost trimise. Apel inițiat.",
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/30">
          <AlertTriangle className="h-3.5 w-3.5" />
          Cod Roșu · Severitate {response.severity}/5
        </div>
        <SourceBadge response={response} />
      </div>

      <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-[1.65rem]">
        {name}, {response.uiMessage}
      </h2>

      <Card className="mt-6 border-destructive/30 bg-destructive/5 p-5">
        <p className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-destructive">
          <Stethoscope className="h-3.5 w-3.5" />
          Sumar pregătit pentru dispecerat
        </p>
        <dl className="space-y-3 text-sm">
          {dispatcher && (
            <>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Simptome</dt>
                <dd className="text-right font-medium text-foreground">{dispatcher.summary}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Suspiciune</dt>
                <dd className="text-right font-medium text-foreground">{dispatcher.vitalsRisk}</dd>
              </div>
            </>
          )}
          {userProfile && (
            <>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Pacient</dt>
                <dd className="text-right font-medium text-foreground">
                  {userProfile.name} · {userProfile.age} ani
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Alergii</dt>
                <dd className="text-right font-medium text-foreground">
                  {userProfile.allergies.join(", ") || "—"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Afecțiuni cronice</dt>
                <dd className="text-right font-medium text-foreground">
                  {userProfile.chronicConditions.join(", ") || "—"}
                </dd>
              </div>
            </>
          )}
        </dl>
      </Card>

      <Button
        size="lg"
        onClick={handleCall}
        className="mt-6 h-14 w-full bg-destructive text-base text-destructive-foreground hover:bg-destructive/90"
      >
        <PhoneCall className="h-5 w-5" />
        Contactează Serviciul de Urgență (112)
      </Button>

      <p className="mt-3 text-center text-xs leading-relaxed text-muted-foreground">
        Prin apăsare, dosarul tău medical și sumarul AI vor fi transmise automat dispeceratului
        pentru a câștiga timp.
      </p>

      {response.transcript && (
        <Card className="mt-5 border-border/70 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ce ai spus
          </p>
          <p className="text-sm leading-relaxed text-foreground">“{response.transcript}”</p>
        </Card>
      )}
    </div>
  );
}

function MinorView({ response, onReset }: { response: TriageResponse; onReset: () => void }) {
  const handleEmergency = () => {
    toast.success("Apel la 112 inițiat.", {
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

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--accent)]/30 px-3 py-1 text-xs font-medium text-[color:var(--accent-foreground)] ring-1 ring-inset ring-[color:var(--accent)]/40">
          <Sparkles className="h-3.5 w-3.5" />
          Îndrumare blândă · Severitate {response.severity}/5
        </div>
        <SourceBadge response={response} />
      </div>

      <h2 className="text-2xl font-semibold leading-snug tracking-tight text-foreground sm:text-[1.65rem]">
        {response.uiMessage}
      </h2>

      {/* Rich result cards */}
      <div className="mt-6 grid gap-3">
        <ResultCard
          title="Simptome identificate"
          icon={<Heart className="h-4 w-4" />}
          items={response.uiResult.simptome_identificate}
          tone="neutral"
        />
        <ResultCard
          title="Cauze posibile"
          icon={<Sparkles className="h-4 w-4" />}
          items={response.uiResult.cauze_posibile}
          tone="neutral"
        />
        <ResultCard
          title="Recomandări"
          icon={<Stethoscope className="h-4 w-4" />}
          items={response.uiResult.recomandari}
          tone="positive"
        />
        <ResultCard
          title="Sună 112 dacă apare"
          icon={<TriangleAlert className="h-4 w-4" />}
          items={response.uiResult.suna_112_daca_apare}
          tone="warning"
        />
      </div>

      {/* Nearby pharmacies (mock background result) */}
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

      {response.transcript && (
        <Card className="mt-5 border-border/70 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Ce ai spus
          </p>
          <p className="text-sm leading-relaxed text-foreground">“{response.transcript}”</p>
        </Card>
      )}
    </div>
  );
}

function ResultCard({
  title,
  icon,
  items,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  items: string[];
  tone: "neutral" | "positive" | "warning";
}) {
  if (!items.length) return null;
  const toneClasses =
    tone === "warning"
      ? "border-destructive/30 bg-destructive/5"
      : tone === "positive"
        ? "border-[color:var(--success)]/30 bg-[color:var(--success)]/5"
        : "border-border/70";

  const iconClasses =
    tone === "warning"
      ? "bg-destructive/10 text-destructive"
      : tone === "positive"
        ? "bg-[color:var(--success)]/10 text-[color:var(--success)]"
        : "bg-secondary text-[color:var(--secondary-foreground)]";

  return (
    <Card className={`p-4 ${toneClasses}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${iconClasses}`}>
          {icon}
        </span>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </p>
      </div>
      <ul className="space-y-1.5 text-sm text-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 inline-block h-1 w-1 flex-none rounded-full bg-current opacity-60" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
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
    <div className="mt-6 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
      <span>Demo:</span>
      <button
        onClick={() => onChange(null)}
        className={`rounded-full px-2 py-0.5 ring-1 transition-colors ${value === null ? "bg-primary/10 text-primary ring-primary/30" : "ring-border hover:bg-muted"}`}
      >
        AI
      </button>
      <button
        onClick={() => onChange(false)}
        className={`rounded-full px-2 py-0.5 ring-1 transition-colors ${value === false ? "bg-primary/10 text-primary ring-primary/30" : "ring-border hover:bg-muted"}`}
      >
        Minor
      </button>
      <button
        onClick={() => onChange(true)}
        className={`rounded-full px-2 py-0.5 ring-1 transition-colors ${value === true ? "bg-destructive/10 text-destructive ring-destructive/30" : "ring-border hover:bg-muted"}`}
      >
        Critic
      </button>
    </div>
  );
}
