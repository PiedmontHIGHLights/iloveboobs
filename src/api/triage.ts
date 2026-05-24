import { createServerFn } from "@tanstack/react-start";

export type TriageResponse = {
  severity: 1 | 2 | 3 | 4 | 5;
  uiMessage: string;
  dataForDispatcher?: { summary: string; vitalsRisk: string };
  transcript?: string;
};

export const triageEmergency = createServerFn({
  method: "POST",
}).handler(async (context: any): Promise<TriageResponse> => {
  // TanStack Start/seroval may hide/transform the request body.
  // Force reading the raw JSON body.
  const rawBody = await context.request.json();

  const payload = rawBody?.data ?? rawBody;
  const audioBase64: string | undefined =
    payload?.audioBase64 ?? payload?.data?.audioBase64;

  if (!audioBase64) {
    throw new Error(
      "Audio missing. Received keys: " + JSON.stringify(Object.keys(payload ?? {}))
    );
  }

  const base64Data = audioBase64.includes(",")
    ? audioBase64.split(",")[1]
    : audioBase64;

  const apiKey = "AIzaSyDaizZ2pvxvhubT5logHID8_Qvo5OyQrTc";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: 'Ești asistent medical. Fă triaj. Returnează doar un JSON valid: {"severity": 1, "uiMessage": "...", "dataForDispatcher": {"summary": "...", "vitalsRisk": "..."}, "transcript": "..."}',
              },
              {
                inlineData: { data: base64Data, mimeType: "audio/webm" },
              },
            ],
          },
        ],
      }),
    }
  );

  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));

  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  const cleanJson = String(rawText ?? "")
    .replace(/```json|```/g, "")
    .trim();

  return JSON.parse(cleanJson) as TriageResponse;
});

