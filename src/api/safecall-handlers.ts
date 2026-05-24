/**
 * Plain HTTP handlers for SafeCall's API surface.
 *
 * Intentionally implemented WITHOUT TanStack Start server functions so the
 * client → server contract is just `fetch("/api/...")` with regular JSON. This
 * avoids the seroval serialization layer entirely and keeps URLs stable across
 * dev/prod and across Vite optimize-deps cache invalidations.
 */

export type Severity = 1 | 2 | 3 | 4 | 5;

export type UserProfile = {
  name: string;
  cnp: string;
  age: number;
  allergies: string[];
  chronicConditions: string[];
  medication?: string[];
};

export type DispatcherPayload = {
  summary: string;
  vitalsRisk: string;
};

export type PatientUiResult = {
  simptome_identificate: string[];
  cauze_posibile: string[];
  recomandari: string[];
  suna_112_daca_apare: string[];
};

export type TriageSource = "gemini" | "demo";

export type TriageResponse = {
  severity: Severity;
  uiMessage: string;
  uiResult: PatientUiResult;
  dataForDispatcher?: DispatcherPayload;
  transcript?: string;
  /** Which path produced this response. */
  source: TriageSource;
  /** Model id used (when source = gemini). */
  model?: string;
};

export type TriageErrorResponse = {
  error: true;
  code:
    | "no_audio"
    | "no_api_key"
    | "gemini_quota"
    | "gemini_key_invalid"
    | "gemini_other"
    | "gemini_empty"
    | "internal";
  status?: number;
  message: string;
  /** When set, the client can still show the canned demo cards. */
  fallback?: TriageResponse;
};

export type DispatcherAlert = {
  id: string;
  receivedAt: number;
  severity: number;
  uiMessage: string;
  summary: string;
  vitalsRisk: string;
  transcript?: string;
  patient: UserProfile | null;
  location?: { lat: number; lng: number };
};

const STORE_KEY = "__safecall_dispatcher_store__";

type AlertStore = { alerts: DispatcherAlert[] };

function store(): AlertStore {
  const g = globalThis as unknown as Record<string, AlertStore | undefined>;
  if (!g[STORE_KEY]) g[STORE_KEY] = { alerts: [] };
  return g[STORE_KEY] as AlertStore;
}

function recordAlert(payload: Omit<DispatcherAlert, "id" | "receivedAt">): DispatcherAlert {
  const alert: DispatcherAlert = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: Date.now(),
    ...payload,
  };
  const s = store();
  s.alerts.unshift(alert);
  if (s.alerts.length > 50) s.alerts.length = 50;
  return alert;
}

/* ---------- Env / key resolution ---------- */

function getGeminiKey(env: unknown, override?: string | null): string | undefined {
  if (override && override.trim().length > 10) return override.trim();
  if (env && typeof env === "object") {
    const fromEnv =
      (env as Record<string, unknown>).GEMINI_API_KEY ??
      (env as Record<string, unknown>).VITE_GEMINI_API_KEY;
    if (typeof fromEnv === "string" && fromEnv) return fromEnv;
  }
  const proc = (globalThis as { process?: { env?: Record<string, string> } }).process;
  if (proc?.env?.GEMINI_API_KEY) return proc.env.GEMINI_API_KEY;
  try {
    const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
    if (meta?.VITE_GEMINI_API_KEY) return meta.VITE_GEMINI_API_KEY;
    if (meta?.GEMINI_API_KEY) return meta.GEMINI_API_KEY;
  } catch {
    // import.meta not available in some runtimes
  }
  return undefined;
}

/**
 * Default model. Gemini 2.5 Flash supports audio understanding + structured
 * output and is available on the free tier (with daily/RPM quotas).
 */
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  return typeof btoa !== "undefined"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}

function parseUserProfile(raw: unknown): UserProfile | null {
  if (!raw) return null;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return null;
    const x = obj as Record<string, unknown>;
    return {
      name: String(x.name ?? ""),
      cnp: String(x.cnp ?? ""),
      age: Number(x.age ?? 0),
      allergies: Array.isArray(x.allergies) ? x.allergies.map(String) : [],
      chronicConditions: Array.isArray(x.chronicConditions) ? x.chronicConditions.map(String) : [],
      medication: Array.isArray(x.medication) ? x.medication.map(String) : [],
    };
  } catch {
    return null;
  }
}

function clampSeverity(v: unknown): Severity {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return 2;
  if (n <= 1) return 1;
  if (n >= 5) return 5;
  return n as Severity;
}

function arrOfStr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

/* ---------- Triage ---------- */

function errorResponse(
  code: TriageErrorResponse["code"],
  message: string,
  status: number,
  fallback?: TriageResponse,
): Response {
  const body: TriageErrorResponse = { error: true, code, status, message, fallback };
  return jsonResponse(body, status);
}

async function handleTriage(request: Request, env: unknown): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    console.error("Triage: failed to parse FormData:", err);
    return errorResponse("internal", "Cererea nu a putut fi citită (FormData invalid).", 400);
  }

  const blob = form.get("audioBlob");
  if (!(blob instanceof Blob) || blob.size === 0) {
    return errorResponse(
      "no_audio",
      "Nu am primit nicio înregistrare audio. Apasă butonul mic, vorbește, apoi apasă din nou pentru a trimite.",
      400,
    );
  }

  const userProfile = parseUserProfile(form.get("userProfile"));
  const language = (form.get("language") as string) ?? "ro";
  const forceCriticalRaw = (form.get("forceCritical") as string | null) ?? "auto";
  const forceCritical: "auto" | "true" | "false" =
    forceCriticalRaw === "true" || forceCriticalRaw === "false" ? forceCriticalRaw : "auto";
  const apiKeyOverride = (form.get("apiKey") as string | null) ?? undefined;
  const modelOverride = (form.get("model") as string | null)?.trim() || DEFAULT_GEMINI_MODEL;

  // Demo toggles short-circuit to a canned response — useful for live demos
  // when there is no API key, no network, or no microphone.
  if (forceCritical === "true" || forceCritical === "false") {
    return jsonResponse(demoFallback(forceCritical, userProfile));
  }

  const apiKey = getGeminiKey(env, apiKeyOverride);
  if (!apiKey) {
    return errorResponse(
      "no_api_key",
      "Lipsește cheia Gemini. Apasă butonul „Configurează Gemini” și lipește o cheie validă (gratuită la aistudio.google.com).",
      401,
      demoFallback("false", userProfile),
    );
  }

  let audioBase64: string;
  try {
    audioBase64 = await blobToBase64(blob);
  } catch (err) {
    console.error("Triage: blob -> base64 failed:", err);
    return errorResponse("internal", "Nu am putut codifica audio-ul pentru AI.", 500);
  }
  const mimeType = blob.type || "audio/webm";

  const allergies = userProfile?.allergies?.join(", ") || "necunoscute";
  const chronic = userProfile?.chronicConditions?.join(", ") || "necunoscute";
  const medication = userProfile?.medication?.join(", ") || "necunoscute";
  const age = userProfile?.age ?? "necunoscută";

  const systemPrompt = `Ești SafeCall — un asistent vocal de triaj medical pentru România. Vorbești CALM, profesionist, fără diagnostice ferme.

Reguli STRICTE:
- Detectează limba din audio și răspunde mereu în limba ROMÂNĂ.
- NU afirma diagnostice. Folosește formulări sigure: "poate necesita evaluare", "simptomele descrise sunt compatibile cu...".
- Alege severity 1-5: 1-3 = urgență minoră; 4-5 = urgență majoră, necesită 112.
- Dacă severity >= 4, completează dataForDispatcher cu un rezumat scurt și o suspiciune de risc.
- uiResult conține 4 liste scurte (3-5 elemente fiecare).
- transcript = textul transcris din audio.

Profil pacient (ROeID): vârstă=${age}; alergii=${allergies}; cronice=${chronic}; medicație=${medication}.`;

  const userText = `Ascultă înregistrarea pacientului și efectuează triaj.
Răspunde STRICT cu JSON valid conform schemei, fără text adițional. Limba=${language}.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelOverride)}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [
      {
        role: "user",
        parts: [{ text: userText }, { inlineData: { data: audioBase64, mimeType } }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          severity: { type: "integer" },
          uiMessage: { type: "string" },
          transcript: { type: "string" },
          uiResult: {
            type: "object",
            properties: {
              simptome_identificate: {
                type: "array",
                items: { type: "string" },
              },
              cauze_posibile: { type: "array", items: { type: "string" } },
              recomandari: { type: "array", items: { type: "string" } },
              suna_112_daca_apare: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: [
              "simptome_identificate",
              "cauze_posibile",
              "recomandari",
              "suna_112_daca_apare",
            ],
          },
          dataForDispatcher: {
            type: "object",
            properties: {
              summary: { type: "string" },
              vitalsRisk: { type: "string" },
            },
            required: ["summary", "vitalsRisk"],
          },
        },
        required: ["severity", "uiMessage", "uiResult"],
      },
    },
  };

  type ParsedGeminiResponse = {
    severity?: number;
    uiMessage?: string;
    transcript?: string;
    uiResult?: Partial<PatientUiResult>;
    dataForDispatcher?: Partial<DispatcherPayload>;
  };
  let parsed: ParsedGeminiResponse = {};
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Gemini error:", resp.status, txt.slice(0, 500));
      let geminiMessage = txt.slice(0, 300);
      try {
        const parsedErr = JSON.parse(txt);
        if (parsedErr?.error?.message) geminiMessage = String(parsedErr.error.message);
      } catch {
        // text wasn't JSON, keep raw
      }
      const isQuota = resp.status === 429;
      const looksLikeBadKey =
        resp.status === 401 ||
        resp.status === 403 ||
        /api[_ ]?key|api key (expired|invalid)|API_KEY_INVALID/i.test(
          geminiMessage,
        );
      return errorResponse(
        isQuota
          ? "gemini_quota"
          : looksLikeBadKey
            ? "gemini_key_invalid"
            : "gemini_other",
        isQuota
          ? `Cota Gemini este depășită pentru această cheie. ${geminiMessage}`
          : looksLikeBadKey
            ? `Cheia Gemini a fost respinsă: ${geminiMessage}`
            : `Gemini a returnat ${resp.status}: ${geminiMessage}`,
        resp.status,
        demoFallback("false", userProfile),
      );
    }
    const result = await resp.json();
    const rawText =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ??
      result?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data ??
      "";
    const cleaned = String(rawText)
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    if (!cleaned) {
      return errorResponse(
        "gemini_empty",
        "Gemini nu a returnat conținut. Încearcă să vorbești mai clar sau mai mult timp.",
        502,
        demoFallback("false", userProfile),
      );
    }
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Gemini call failed:", err);
    return errorResponse(
      "gemini_other",
      `Apelul către Gemini a eșuat: ${(err as Error).message ?? "necunoscut"}.`,
      502,
      demoFallback("false", userProfile),
    );
  }

  const severity = clampSeverity(parsed?.severity);
  const uiResult: PatientUiResult = {
    simptome_identificate: arrOfStr(parsed?.uiResult?.simptome_identificate),
    cauze_posibile: arrOfStr(parsed?.uiResult?.cauze_posibile),
    recomandari: arrOfStr(parsed?.uiResult?.recomandari),
    suna_112_daca_apare: arrOfStr(parsed?.uiResult?.suna_112_daca_apare),
  };
  const dispatcher =
    severity >= 4 && parsed?.dataForDispatcher
      ? {
          summary: String(parsed.dataForDispatcher.summary ?? ""),
          vitalsRisk: String(parsed.dataForDispatcher.vitalsRisk ?? ""),
        }
      : undefined;

  const response: TriageResponse = {
    severity,
    uiMessage: String(parsed?.uiMessage ?? "").trim(),
    uiResult,
    dataForDispatcher: dispatcher,
    transcript: parsed?.transcript ? String(parsed.transcript) : undefined,
    source: "gemini",
    model: modelOverride,
  };

  if (response.severity >= 4 && response.dataForDispatcher) {
    try {
      recordAlert({
        severity: response.severity,
        uiMessage: response.uiMessage,
        summary: response.dataForDispatcher.summary,
        vitalsRisk: response.dataForDispatcher.vitalsRisk,
        transcript: response.transcript,
        patient: userProfile,
      });
    } catch (e) {
      console.error("Dispatcher record failed:", e);
    }
  }

  return jsonResponse(response);
}

function demoFallback(
  force: "auto" | "true" | "false",
  profile: UserProfile | null,
): TriageResponse {
  if (force === "true") {
    const response: TriageResponse = {
      severity: 5,
      uiMessage:
        "Pentru siguranța ta, este indicat ca un echipaj medical să te evalueze rapid. Așază-te relaxat și pregătește-te să apelezi 112.",
      uiResult: {
        simptome_identificate: [
          "Durere toracică intensă",
          "Iradiere către braț stâng",
          "Transpirații reci",
        ],
        cauze_posibile: ["Posibil sindrom coronarian acut"],
        recomandari: [
          "Așază-te în șezut",
          "Nu mânca, nu bea, nu te efortua",
          "Pregătește documentele medicale",
        ],
        suna_112_daca_apare: [
          "Pierderea cunoștinței",
          "Dificultăți severe de respirație",
          "Durerea persistă peste 5 minute",
        ],
      },
      dataForDispatcher: {
        summary:
          "Bărbat, durere toracică intensă cu iradiere în brațul stâng și transpirații reci.",
        vitalsRisk: "Posibil sindrom coronarian acut",
      },
      source: "demo",
    };
    try {
      recordAlert({
        severity: response.severity,
        uiMessage: response.uiMessage,
        summary: response.dataForDispatcher!.summary,
        vitalsRisk: response.dataForDispatcher!.vitalsRisk,
        patient: profile,
      });
    } catch {
      // ignore
    }
    return response;
  }
  return {
    severity: 2,
    uiMessage:
      "Situația nu pare a fi o urgență vitală, dar simptomele necesită îngrijire. Poți consulta un farmacist sau un medic de permanență din apropiere.",
    uiResult: {
      simptome_identificate: ["Durere locală", "Roșeață", "Mobilitate păstrată"],
      cauze_posibile: ["Contuzie", "Escoriație superficială"],
      recomandari: [
        "Comprese reci 15 min, de 3 ori pe zi",
        "Antiinflamator topic (ibuprofen gel)",
        "Repaus relativ 24–48h",
      ],
      suna_112_daca_apare: [
        "Umflătură severă sau deformare",
        "Durere care împiedică sprijinul",
        "Durerea persistă peste 72h",
      ],
    },
    source: "demo",
  };
}

/* ---------- Dispatcher ---------- */

async function handleDispatcherList(): Promise<Response> {
  return jsonResponse({ alerts: store().alerts });
}

async function handleDispatcherClear(): Promise<Response> {
  store().alerts = [];
  return jsonResponse({ ok: true });
}

/* ---------- Dispatch table ---------- */

export async function safecallApiRoute(request: Request, env: unknown): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/triage" && request.method === "POST") {
    return handleTriage(request, env);
  }
  if (path === "/api/dispatcher/list" && request.method === "GET") {
    return handleDispatcherList();
  }
  if (path === "/api/dispatcher/clear" && request.method === "POST") {
    return handleDispatcherClear();
  }
  return null;
}
