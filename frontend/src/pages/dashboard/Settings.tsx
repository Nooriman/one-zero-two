import { useEffect, useState } from "react";
import { getBudget, setBudget } from "../../api/BudgetApi";
import ChevronLeftIcon from "../../icons/ChevronLeftIcon";
import { cleanAmount } from "../../lib/amount";

function Settings({ onBack }: { onBack: () => void }) {
  const [saved, setSaved] = useState<string | null | undefined>(undefined); // undefined while loading
  const [budget, setBudgetDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getBudget()
      .then((b) => {
        setSaved(b.amount);
        setBudgetDraft(b.amount ?? "");
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const changed = Number(budget) > 0 && Number(budget) !== Number(saved ?? 0);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!changed || busy) return;
    setBusy(true);
    setError("");
    try {
      await setBudget(budget);
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <section className="animate-arrive" aria-labelledby="settings-title">
      <header className="flex h-16 items-center gap-2">
        <button
          aria-label="Back to dashboard"
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
          onClick={onBack}
          type="button"
        >
          <ChevronLeftIcon />
        </button>
        <h1 id="settings-title" className="text-2xl font-semibold">
          Settings
        </h1>
      </header>

      <form className="flex flex-col gap-4" onSubmit={save}>
        <label className="flex flex-col gap-2 text-sm text-graphite-300">
          Monthly budget
          <input
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-graphite-700 bg-graphite-900 px-4 text-base text-white focus:border-orange focus:outline-none disabled:opacity-40"
            disabled={saved === undefined}
            inputMode="decimal"
            onChange={(e) => setBudgetDraft(cleanAmount(e.target.value))}
            placeholder="0.00"
            type="text"
            value={budget}
          />
        </label>

        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}

        <button
          className="h-12 w-full rounded-xl bg-orange text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          disabled={!changed || busy}
          type="submit"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </form>
    </section>
  );
}

export default Settings;
