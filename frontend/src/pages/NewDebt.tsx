import { useState, type FormEvent } from "react";
import { createDebt } from "./debtApi";

type NewDebtProps = {
  onBack: () => void;
  onCreated: () => void;
};

const PEOPLE = ["Wife", "Lola", "Luffy", "Others"] as const;
const DEFAULT_PERSON = PEOPLE[0];
const DESCRIPTION_MAX = 250;

const AMOUNT_INT_DIGITS = 10;

/** Reduce typed text to a plain currency string: digits, one dot, max 2 decimals. */
function cleanAmount(input: string) {
  const [whole, ...rest] = input.replace(/[^\d.]/g, "").split(".");
  const intPart = whole.replace(/^0+(?=\d)/, "").slice(0, AMOUNT_INT_DIGITS);
  if (rest.length === 0) return intPart;
  return `${intPart || "0"}.${rest.join("").slice(0, 2)}`;
}

/** Add thousands separators to a cleaned amount for display. */
function displayAmount(amount: string) {
  const [whole, decimals] = amount.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decimals === undefined ? grouped : `${grouped}.${decimals}`;
}

const fieldClass =
  "w-full rounded-xl border border-graphite-700 bg-graphite-900 px-4 py-3 text-base text-white placeholder:text-graphite-300 focus:border-orange focus:outline-none";
const labelClass = "mb-2 block text-sm font-semibold text-graphite-300";

function NewDebt({ onBack, onCreated }: NewDebtProps) {
  const [person, setPerson] = useState<string>(DEFAULT_PERSON);
  const [otherName, setOtherName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isOther = person === "Others";
  const canSubmit =
    Number(amount) > 0 && (!isOther || otherName.trim().length > 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      await createDebt({
        person: isOther ? otherName.trim() : person,
        amount: Number(amount),
        description: description.trim(),
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  };

  const clear = () => {
    setPerson(DEFAULT_PERSON);
    setOtherName("");
    setAmount("");
    setDescription("");
  };

  return (
    <section className="animate-arrive" aria-labelledby="new-debt-title">
      <header className="flex h-16 items-center gap-2">
        <button
          aria-label="Back to debts"
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
          onClick={onBack}
          type="button"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 id="new-debt-title" className="text-2xl font-semibold">
          New Debt
        </h1>
      </header>

      <form
        className="flex flex-col gap-5"
        onSubmit={submit}
      >
        <div>
          <label className={labelClass} htmlFor="debt-to">
            Debt to
          </label>
          <div className="flex items-center gap-3">
            <span className="flex-1 rounded-xl border border-graphite-700 px-4 py-3 text-base font-semibold">
              Me
            </span>
            <span aria-hidden="true" className="text-graphite-300">
              →
            </span>
            <select
              className={fieldClass + " flex-1"}
              id="debt-to"
              onChange={(e) => setPerson(e.target.value)}
              value={person}
            >
              {PEOPLE.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          {isOther && (
            <input
              aria-label="Other person's name"
              autoFocus
              className={fieldClass + " mt-3"}
              onChange={(e) => setOtherName(e.target.value)}
              placeholder="Enter name"
              type="text"
              value={otherName}
            />
          )}
        </div>

        <div>
          <label className={labelClass} htmlFor="debt-amount">
            Amount
          </label>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base text-graphite-300">
              $
            </span>
            <input
              className={fieldClass + " pl-8"}
              id="debt-amount"
              autoComplete="off"
              inputMode="decimal"
              onChange={(e) => setAmount(cleanAmount(e.target.value))}
              placeholder="0.00"
              type="text"
              value={displayAmount(amount)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="debt-description">
            Description
          </label>
          <textarea
            className={fieldClass + " resize-none"}
            id="debt-description"
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this for?"
            rows={5}
            value={description}
          />
          <p className="mt-1 text-right text-xs text-graphite-300">
            {description.length}/{DESCRIPTION_MAX}
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            className="h-12 flex-1 rounded-xl border border-graphite-700 text-sm font-semibold text-graphite-300 transition active:scale-95"
            onClick={clear}
            type="button"
          >
            Clear
          </button>
          <button
            className="h-12 flex-1 rounded-xl bg-orange text-sm font-semibold text-graphite-950 transition active:scale-95 disabled:opacity-40"
            disabled={!canSubmit || busy}
            type="submit"
          >
            {busy ? "Submitting…" : "Submit"}
          </button>
        </div>
        {error && (
          <p className="text-sm text-bad" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

export default NewDebt;
