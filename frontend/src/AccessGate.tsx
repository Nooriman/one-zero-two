import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type AuthState = "checking" | "locked" | "unlocked";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "same-origin" })
      .then((response) => response.json())
      .then((body) => setState(body.authenticated ? "unlocked" : "locked"))
      .catch(() => setState("locked"));
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (response.ok) {
        setState("unlocked");
        return;
      }
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong.");
      setCode("");
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "unlocked") return <>{children}</>;
  if (state === "checking") return null;

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <form
        className="flex w-full max-w-xs animate-arrive flex-col items-center gap-6"
        onSubmit={submit}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-orange font-mono text-lg font-medium text-graphite-950">
          102
        </span>
        <h1 className="text-xl font-semibold">Enter access code</h1>
        <input
          aria-label="6-digit access code"
          autoComplete="one-time-code"
          autoFocus
          className="w-full rounded-2xl border border-graphite-700 bg-graphite-900 py-4 text-center indent-[0.4em] text-3xl tracking-[0.4em] outline-none transition-colors focus:border-orange"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          pattern="\d{6}"
          type="password"
          value={code}
        />
        <button
          className="h-14 w-full rounded-2xl bg-orange text-base font-bold text-graphite-950 transition active:scale-[0.98] active:bg-orange-deep disabled:bg-graphite-700 disabled:text-graphite-300"
          disabled={code.length !== 6 || busy}
          type="submit"
        >
          {busy ? "Checking…" : "Unlock"}
        </button>
        <p aria-live="polite" className="min-h-5 text-center text-sm text-bad" role="alert">
          {error}
        </p>
      </form>
    </main>
  );
}
