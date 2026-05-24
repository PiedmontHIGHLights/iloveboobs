# SafeCall — Triaj vocal pentru 112

SafeCall este un asistent vocal AI care acționează ca filtru primar pentru
apelurile la 112: utilizatorul descrie liber simptomele, iar pipeline-ul AI
(Gemini 2.0 + structured JSON) decide dacă este o urgență minoră (afișează
îndrumare blândă) sau o urgență majoră (transmite dosarul ROeID +
sumarul către dispecerat).

Vezi `gemini.md` pentru spec-ul complet (Cluj Hackathon 2026 · Digital Romania).

## Stack

- **App framework**: TanStack Start + React 19 + Tailwind v4 (shadcn/ui)
- **Build**: Vite + Cloudflare Workers (vite plugin)
- **AI**: Gemini 2.0 Flash (audio understanding + JSON schema response)
- **Routing**: TanStack Router (cu `/`, `/profile`, `/dispatcher`)

## Rulare locală

```bash
npm install
cp .env.example .env  # dacă există, altfel completează cheia direct
npm run dev           # → http://localhost:8080
```

Comenzi disponibile:

| Comandă | Descriere |
| --- | --- |
| `npm run dev` | Dev server (Vite) |
| `npm run build` | Build de producție (Cloudflare Workers) |
| `npm run preview` | Preview pentru build-ul de producție |
| `npm run lint` | ESLint + Prettier |
| `npm run format` | Prettier write |

## Variabile de mediu

`.env`:

```
GEMINI_API_KEY=...
VITE_GEMINI_API_KEY=...
```

`VITE_GEMINI_API_KEY` este folosit la build (Vite injectează env-uri
`VITE_*`). `GEMINI_API_KEY` rămâne disponibil pentru `process.env` în
runtime-uri Node-like.

Dacă lipsește cheia sau quota Gemini este depășită, aplicația cade automat pe
un răspuns de demo plauzibil, ca demo-ul live să nu se blocheze niciodată.

## Fluxuri principale

- `/` (Home) — autentificare ROeID (mock 2FA), buton tap-to-talk, vizualizare
  rezultat (Minor cu carduri simptome/cauze/recomandări/sună-112-dacă, sau
  Critic cu sumar pentru dispecerat și buton 112). Butonul roșu 112 din colț
  necesită long-press 1.5s.
- `/profile` — dosarul medical ROeID (alergii, afecțiuni cronice, medicație).
- `/dispatcher` — tablou de bord pentru juriu/mentori. Afișează în timp real
  (polling 2s) toate alertele Cod Roșu generate de aplicație, cu fișa
  medicală extrasă din ROeID.

## Demo toggle

În josul ecranului principal există un selector `Demo: AI · Minor · Critic`
care forțează răspunsul AI pe ramura corespunzătoare — util pentru
prezentarea live fără să trebuiască să forțezi un transcript anume.

## Arhitectură pe scurt

```
src/
├── api/
│   ├── triage.ts          createServerFn POST (FormData) → Gemini 2.0
│   └── dispatcher.ts      createServerFn GET/POST + store in-memory
├── components/safecall/
│   ├── emergency-button.tsx   Long-press 1.5s 112
│   └── disclaimers.tsx        Disclaimerele obligatorii
├── lib/mock-user.ts       Mock ROeID
├── routes/
│   ├── __root.tsx
│   ├── index.tsx          Home (auth + triggering view + result views)
│   ├── profile.tsx        Profil ROeID
│   └── dispatcher.tsx     Dashboard dispecerat
└── ...
```
