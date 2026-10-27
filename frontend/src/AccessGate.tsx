import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import axios from "axios";
import { lock } from "./lib/vault";

// Keep in sync with CODE_LENGTH in backend/src/auth/crypto.ts.
const CODE_LENGTH = 8;

type AuthState = "checking" | "locked" | "unlocked";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>("checking");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    axios
      .get("/api/auth/session", { withCredentials: true })
      .then((response) => setState(response.data.authenticated ? "unlocked" : "locked"))
      .catch(() => setState("locked"));
  }, []);

  // Sessions expire, so keep checking while the app is open and return to the code screen
  // (locking the document vault too) rather than leaving pages failing with "Unauthorized".
  useEffect(() => {
    if (state !== "unlocked") return;
    const check = () =>
      axios
        .get("/api/auth/session", { withCredentials: true })
        .then((response) => {
          if (!response.data.authenticated) expire();
        })
        // A network error says nothing about the session; only an explicit answer counts.
        .catch((error) => {
          if (axios.isAxiosError(error) && error.response?.status === 401) expire();
        });
    const expire = () => {
      lock();
      setCode("");
      setState("locked");
    };
    const onVisible = () => {
      if (!document.hidden) void check();
    };
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== CODE_LENGTH || busy) return;
    setBusy(true);
    setError("");
    try {
      await axios.post("/api/auth/login", { code }, { withCredentials: true });
      setState("unlocked");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        setError(error.response.data?.error ?? "Something went wrong.");
        setCode("");
      } else {
        setError("Cannot reach the server.");
      }
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
          aria-label={`${CODE_LENGTH}-digit access code`}
          autoComplete="one-time-code"
          autoFocus
          className="w-full rounded-2xl border border-graphite-700 bg-graphite-900 py-4 text-center indent-[0.25em] text-3xl tracking-[0.25em] outline-none transition-colors focus:border-orange"
          inputMode="numeric"
          maxLength={CODE_LENGTH}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
          pattern={`\\d{${CODE_LENGTH}}`}
          type="password"
          value={code}
        />
        <button
          className="h-14 w-full rounded-2xl bg-orange text-base font-bold text-graphite-950 transition active:scale-[0.98] active:bg-orange-deep disabled:bg-graphite-700 disabled:text-graphite-300"
          disabled={code.length !== CODE_LENGTH || busy}
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
