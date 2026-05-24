import { useEffect, useState } from "react";
import { ExternalLink, KeyRound, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AVAILABLE_MODELS,
  DEFAULT_MODEL,
  getStoredApiKey,
  getStoredModel,
  setStoredApiKey,
  setStoredModel,
} from "@/lib/safecall-client";

export function ApiKeyButton({ onChange }: { onChange?: (hasKey: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const k = getStoredApiKey();
    setHasKey(!!k);
    onChange?.(!!k);
  }, [onChange]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors ${
          hasKey
            ? "bg-[color:var(--success)]/10 text-[color:var(--success)] ring-[color:var(--success)]/25 hover:bg-[color:var(--success)]/15"
            : "bg-[color:var(--warm)]/10 text-[color:var(--warm)] ring-[color:var(--warm)]/30 hover:bg-[color:var(--warm)]/15"
        }`}
        title={hasKey ? "Cheia Gemini este salvată local" : "Configurează cheia Gemini"}
      >
        <KeyRound className="h-3.5 w-3.5" />
        {hasKey ? "Gemini conectat" : "Configurează Gemini"}
      </button>
      <ApiKeyDialog
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => {
          const k = getStoredApiKey();
          setHasKey(!!k);
          onChange?.(!!k);
        }}
      />
    </>
  );
}

function ApiKeyDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "ok"; text: string } | { kind: "err"; text: string }
  >({ kind: "idle" });

  useEffect(() => {
    if (open) {
      setKey(getStoredApiKey());
      setModel(getStoredModel());
      setStatus({ kind: "idle" });
    }
  }, [open]);

  const handleTest = async () => {
    if (!key.trim()) {
      setStatus({ kind: "err", text: "Lipsește cheia." });
      return;
    }
    setTesting(true);
    setStatus({ kind: "idle" });
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model,
      )}:generateContent?key=${key.trim()}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "Spune doar: ok" }] }],
        }),
      });
      const txt = await resp.text();
      if (resp.ok) {
        setStatus({ kind: "ok", text: `Cheia funcționează cu ${model}.` });
      } else {
        let msg = txt.slice(0, 200);
        try {
          const j = JSON.parse(txt);
          if (j?.error?.message) msg = String(j.error.message);
        } catch {
          // raw text
        }
        setStatus({ kind: "err", text: `HTTP ${resp.status}: ${msg}` });
      }
    } catch (e) {
      setStatus({
        kind: "err",
        text: `Eroare de rețea: ${(e as Error).message ?? "necunoscută"}`,
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    setStoredApiKey(key.trim());
    setStoredModel(model);
    toast.success(
      key.trim() ? "Cheia Gemini salvată local (doar în acest browser)." : "Cheia a fost ștearsă.",
    );
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Configurează Gemini
          </DialogTitle>
          <DialogDescription>
            Aplicația folosește Gemini pentru triajul vocal. Cheia se salvează doar local, în{" "}
            <code>localStorage</code>, și se trimite cu fiecare cerere către serverul propriu (nu
            pleacă nicăieri altundeva).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="gk">Cheie API Gemini</Label>
            <Input
              id="gk"
              type="password"
              autoComplete="off"
              placeholder="AIza..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Generează una gratuit la{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-0.5 text-primary underline-offset-2 hover:underline"
              >
                aistudio.google.com/app/apikey
                <ExternalLink className="h-3 w-3" />
              </a>
              .
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gm">Model</Label>
            <select
              id="gm"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                  {m === DEFAULT_MODEL ? " (recomandat)" : ""}
                </option>
              ))}
            </select>
          </div>

          {status.kind !== "idle" && (
            <p
              className={`rounded-md px-3 py-2 text-xs ${
                status.kind === "ok"
                  ? "bg-[color:var(--success)]/10 text-[color:var(--success)] ring-1 ring-inset ring-[color:var(--success)]/30"
                  : "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/30"
              }`}
            >
              {status.text}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing || !key.trim()}
            className="sm:w-auto"
          >
            {testing ? "Testez..." : "Testează cheia"}
          </Button>
          <Button onClick={handleSave}>Salvează</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
