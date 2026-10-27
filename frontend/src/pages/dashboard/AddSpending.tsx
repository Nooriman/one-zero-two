import { useState } from "react";
import { createExpense } from "../../api/ExpenseApi";
import ChevronLeftIcon from "../../icons/ChevronLeftIcon";
import { cleanAmount } from "../../lib/amount";

const DESCRIPTION_MAX = 250;

const inputClass =
  "h-12 w-full rounded-xl border border-graphite-700 bg-graphite-900 px-4 text-base text-white focus:border-orange focus:outline-none";

/** Ad hoc spending: one item and an amount, logged as an expense for the current month. */
function AddSpending({ onBack }: { onBack: () => void }) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const valid = item.trim() !== "" && Number(amount) > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await createExpense({ description: item.trim(), amount });
      onBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <section className="animate-arrive" aria-labelledby="spending-title">
      <header className="flex h-16 items-center gap-2">
        <button
          aria-label="Back to dashboard"
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
          onClick={onBack}
          type="button"
        >
          <ChevronLeftIcon />
        </button>
        <h1 id="spending-title" className="text-2xl font-semibold">
          Add Spending
        </h1>
      </header>

      <form className="flex flex-col gap-4" onSubmit={submit}>
        <label className="flex flex-col gap-2 text-sm text-graphite-300">
          Item
          <input
            autoFocus
            className={inputClass}
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setItem(e.target.value)}
            type="text"
            value={item}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-graphite-300">
          Amount
          <input
            autoComplete="off"
            className={inputClass}
            inputMode="decimal"
            onChange={(e) => setAmount(cleanAmount(e.target.value))}
            placeholder="0.00"
            type="text"
            value={amount}
          />
        </label>

        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}

        <button
          className="h-12 w-full rounded-xl bg-orange text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40 disabled:active:scale-100"
          disabled={!valid || busy}
          type="submit"
        >
          {busy ? "Saving…" : "Submit"}
        </button>
      </form>
    </section>
  );
}

export default AddSpending;
