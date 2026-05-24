import { createServerFn } from "@tanstack/react-start";

export type UserProfile = {
  name: string;
  cnp: string;
  age: number;
  allergies: string[];
  chronicConditions: string[];
};

export type TriageRequest = {
  audioBlob: Blob;
  userProfile: UserProfile | null;
  language?: "ro";
};

export type DispatcherPayload = {
  summary: string;
  vitalsRisk: string;
};

export type TriageResponse = {
  severity: 1 | 2 | 3 | 4 | 5;
  uiMessage: string;
  dataForDispatcher?: DispatcherPayload;
  transcript?: string;
};

function assertEnv(name: string, value: unknown): asserts value is string {
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
}

export const triageEmergency = createServerFn({
  method: "POST",
})
  .validator((input: unknown): TriageRequest => {
    if (!input || typeof input !== "object") {
      throw new Error("Invalid request");
    }
    const x = input as any;
    if (!x.audioBlob || !(x.audioBlob instanceof Blob)) {
      throw new Error("audioBlob is required");
    }
    return x as TriageRequest;
  })
  .handler(async ({ input }: { input: TriageRequest }): Promise<TriageResponse> => {
    const apiKey =
      (globalThis as any).process?.env?.OPENAI_API_KEY ??
      (globalThis as any).OPENAI_API_KEY;
    assertEnv("OPENAI_API_KEY", apiKey);

    const OpenAI = (await import("openai")).default as any;
    const openai = new OpenAI({ apiKey });

    const audioFile = new File([input.audioBlob], "symptoms.webm", {
      type: input.audioBlob.type || "audio/webm",
    });

    const transcriptResult = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: input.language ?? "ro",
    });

    const transcript = String(transcriptResult.text ?? "");

    const allergies = input.userProfile?.allergies ?? [];
    const chronic = input.userProfile?.chronicConditions ?? [];
    const age = input.userProfile?.age ?? null;

    const systemPrompt = `Ești un asistent medical pentru triaj de urgență. Răspunzi calm și profesionist, în limba română.

Reguli STRICTE:
- Nu inventa diagnostice medicale și NU afirma că utilizatorul are o boală (ex: „infarct”, „AVC”).
- Folosește formulări sigure: „poate necesita evaluare medicală”, „necesită atenție imediată”.
- Recomandările trebuie să fie orientate spre urgență (nu tratament medical specific).
- Alege severitatea 1–5.
  - 1–3: urgență minoră / îngrijire obișnuită
  - 4–5: urgență majoră / necesită apel 112
- Dacă severitatea este 4–5, furnizează dataForDispatcher (rezumat + suspiciune de risc), fără diagnostice ferme.
- Outputul trebuie să fie JSON valid conform schemei.`;

    const userPrompt = {
      transcript,
      patient: {
        age,
        allergies,
        chronicConditions: chronic,
      },
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPrompt) },
      ],
      temperature: 0.2,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "triage_response",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["severity", "uiMessage"],
            properties: {
              severity: {
                type: "integer",
                enum: [1, 2, 3, 4, 5],
              },
              uiMessage: {
                type: "string",
              },
              dataForDispatcher: {
                type: "object",
                additionalProperties: false,
                required: ["summary", "vitalsRisk"],
                properties: {
                  summary: { type: "string" },
                  vitalsRisk: { type: "string" },
                },
              },
            },
          },
        },
      },
    });

    const raw = String(response.choices?.[0]?.message?.content ?? "{}");
    const parsed = JSON.parse(raw);

    const severity = parsed.severity as TriageResponse["severity"];

    return {
      severity,
      uiMessage: String(parsed.uiMessage ?? ""),
      dataForDispatcher:
        severity >= 4 && parsed.dataForDispatcher
          ? {
              summary: String(parsed.dataForDispatcher.summary ?? ""),
              vitalsRisk: String(parsed.dataForDispatcher.vitalsRisk ?? ""),
            }
          : undefined,
      transcript,
    };
  });

