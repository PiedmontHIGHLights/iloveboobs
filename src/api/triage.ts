import { createServerFn } from "@tanstack/react-start";
import { recordDispatcherAlert } from "./dispatcher";

/* ---------- Shared types ---------- */

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

export type TriageResponse = {
  severity: Severity;
  /** Short, calming sentence shown as the headline message. */
  uiMessage: string;
  /** Structured cards for the minor branch. */
  uiResult: PatientUiResult;
  /** Present only when severity >= 4. */
  dataForDispatcher?: DispatcherPayload;
  /** Whisper-style transcript (optional). */
  transcript?: string;
};

/* ---------- Helpers ---------- */

function getGeminiKey(): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string> } }).process;
  const fromProcess = proc?.env?.GEMINI_API_KEY;
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const fromMeta = meta?.VITE_GEMINI_API_KEY ?? meta?.GEMINI_API_KEY;
  return fromProcess ?? fromMeta;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
  }
  // btoa is available both in browsers and in modern runtimes (Workers/Node 20+).
  return typeof btoa !== "undefined"
    ? btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");
}

/* ---------- Parsed input shape ---------- */

type ParsedInput = {
  audioBase64: string;
  mimeType: string;
  userProfile: UserProfile | null;
  language: "ro" | "en" | "auto";
  forceCritical: "auto" | "true" | "false";
};

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

/* ---------- Server function ---------- */

export const triageEmergency = createServerFn({ method: "POST" })
  .inputValidator(async (input: unknown): Promise<ParsedInput> => {
    if (!(input instanceof FormData)) {
      throw new Error("Expected FormData payload");
    }
    const blob = input.get("audioBlob");
    if (!(blob instanceof Blob)) {
      throw new Error("audioBlob is required");
    }
    const userProfile = parseUserProfile(input.get("userProfile"));
    const language = (input.get("language") as string) ?? "ro";
    const forceCritical = (input.get("forceCritical") as string | null) ?? "auto";
    const mimeType = blob.type || "audio/webm";
    const audioBase64 = await blobToBase64(blob);
    return {
      audioBase64,
      mimeType,
      userProfile,
      language: (language as ParsedInput["language"]) ?? "ro",
      forceCritical: forceCritical === "true" || forceCritical === "false" ? forceCritical : "auto",
    };
  })
  .handler(async ({ data }): Promise<TriageResponse> => {
    const apiKey = getGeminiKey();
    if (!apiKey) {
      // Hackathon-friendly mock so the demo never blocks
      return demoFallback(data.forceCritical, data.userProfile);
    }

    const profile = data.userProfile;
    const allergies = profile?.allergies?.join(", ") || "necunoscute";
    const chronic = profile?.chronicConditions?.join(", ") || "necunoscute";
    const medication = profile?.medication?.join(", ") || "necunoscute";
    const age = profile?.age ?? "necunoscută";

    const forceHint =
      data.forceCritical === "true"
        ? "\nMod demo: ignoră audio și răspunde ca pentru o urgență MAJORĂ (severitate 5 — durere toracică severă cu iradiere)."
        : data.forceCritical === "false"
          ? "\nMod demo: ignoră audio și răspunde ca pentru o urgență MINORĂ (severitate 2 — contuzie sau durere musculară ușoară)."
          : "";

    const systemPrompt = `Ești SafeCall — un asistent vocal de triaj medical pentru România. Vorbești CALM, profesionist, fără diagnostice ferme.

Reguli STRICTE:
- Detectează limba din audio și răspunde mereu în limba ROMÂNĂ.
- NU afirma diagnostice (ex: "ai infarct"). Folosește formulări sigure: "poate necesita evaluare", "simptomele descrise sunt compatibile cu...".
- Alege severity 1-5:
  - 1-3 = urgență minoră / îngrijire obișnuită
  - 4-5 = urgență majoră, necesită apel 112
- Dacă severity >= 4, completează "dataForDispatcher" cu un rezumat scurt pentru dispecerul 112 și o suspiciune de risc.
- uiResult conține mereu 4 liste scurte (3-5 elemente fiecare).
- transcript = textul transcris din audio (în limba originală a vorbitorului).

Profil pacient (din ROeID):
- Vârstă: ${age}
- Alergii: ${allergies}
- Afecțiuni cronice: ${chronic}
- Medicație curentă: ${medication}${forceHint}`;

    const userText = `Ascultă înregistrarea pacientului și efectuează triaj.
Răspunde STRICT cu JSON valid conform schemei furnizate, fără text adițional.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [
        {
          role: "user",
          parts: [
            { text: userText },
            { inlineData: { data: data.audioBase64, mimeType: data.mimeType } },
          ],
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
        console.error("Gemini error:", resp.status, txt);
        return demoFallback(data.forceCritical, profile);
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
      parsed = JSON.parse(cleaned);
    } catch (err) {
      console.error("Gemini call failed:", err);
      return demoFallback(data.forceCritical, profile);
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
    };

    if (response.severity >= 4 && response.dataForDispatcher) {
      try {
        recordDispatcherAlert({
          severity: response.severity,
          uiMessage: response.uiMessage,
          summary: response.dataForDispatcher.summary,
          vitalsRisk: response.dataForDispatcher.vitalsRisk,
          transcript: response.transcript,
          patient: profile,
        });
      } catch (e) {
        console.error("Dispatcher record failed:", e);
      }
    }

    return response;
  });

/* ---------- Sanitizers & demo fallback ---------- */

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

function demoFallback(
  force: ParsedInput["forceCritical"],
  profile: UserProfile | null,
): TriageResponse {
  const wantCritical = force === "true";
  if (wantCritical) {
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
    };
    try {
      recordDispatcherAlert({
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
  };
}
