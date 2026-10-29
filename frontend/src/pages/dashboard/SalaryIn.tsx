import { useEffect, useState } from "react";
import { createExpense } from "../../api/ExpenseApi";
import { listDebts, payDebt, type DebtRecord } from "../../api/DebtApi";
import type { LiabilityRecord } from "../../api/LiabilityApi";
import { loadLiabilityStatus } from "../../lib/liabilityStatus";
import { cleanAmount } from "../../lib/amount";
import ChevronLeftIcon from "../../icons/ChevronLeftIcon";
import PlusIcon from "../../icons/PlusIcon";
import TrashIcon from "../../icons/TrashIcon";

const CREDIT_CARD_LABEL = "Credit card payment";

const formatAmount = (amount: string) =>
  Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** A debt payment being set up; amount defaults to the full remaining debt. */
type DebtRow = { debtId: number | null; amount: string };

/** Payday checklist: ticked liabilities (plus a credit card payment) are logged as this month's expenses. */
function SalaryIn({ onBack }: { onBack: () => void }) {
  const [liabilities, setLiabilities] = useState<LiabilityRecord[] | null>(null);
  // Everything starts ticked since these are paid regardless.
  const [unchecked, setUnchecked] = useState<Set<number>>(new Set());
  const [creditCard, setCreditCard] = useState("");
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [debtRows, setDebtRows] = useState<DebtRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Ids already saved by a failed attempt, so a retry never creates duplicates.
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Only what is still unpaid this month.
    loadLiabilityStatus()
      .then((status) => setLiabilities(status.unpaid))
      .catch((e: Error) => setError(e.message));
    listDebts()
      .then((all) => setDebts(all.filter((d) => !d.paidAt)))
      .catch((e: Error) => setError(e.message));
  }, []);

  const toggle = (id: number) =>
    setUnchecked((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const debtById = (id: number | null) => debts.find((d) => d.id === id);
  // Debts not already picked by another row.
  const availableDebts = debts.filter((d) => !debtRows.some((r) => r.debtId === d.id));
  const updateDebtRow = (index: number, changes: Partial<DebtRow>) =>
    setDebtRows((rows) => rows.map((r, i) => (i === index ? { ...r, ...changes } : r)));
  const rowProblem = (row: DebtRow) => {
    const debt = debtById(row.debtId);
    if (!debt) return "Choose a debt.";
    if (!(Number(row.amount) > 0)) return "Enter an amount.";
    if (Number(row.amount) > Number(debt.amount)) return `Only ${formatAmount(debt.amount)} is owed.`;
    return "";
  };
  const debtsValid = debtRows.every((r) => !rowProblem(r));
  const debtTotal = debtRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  const selected = (liabilities ?? []).filter((l) => !unchecked.has(l.id));
  const cardAmount = Number(creditCard) > 0 ? creditCard : "";
  const total =
    selected.reduce((sum, l) => sum + Number(l.amount), 0) + (cardAmount ? Number(cardAmount) : 0) + debtTotal;
  const count = selected.length + (cardAmount ? 1 : 0) + debtRows.length;

  const submit = async () => {
    if (busy || count === 0 || !debtsValid) return;
    setBusy(true);
    setError("");
    const saved = new Set(done);
    try {
      if (cardAmount && !saved.has("card")) {
        await createExpense({ description: CREDIT_CARD_LABEL, amount: cardAmount });
        saved.add("card");
      }
      for (const l of selected) {
        if (saved.has(`l${l.id}`)) continue;
        await createExpense({ description: l.description, amount: l.amount, liabilityId: l.id });
        saved.add(`l${l.id}`);
      }
      // The server reduces the debt and logs the expense in one step, so each is only sent once.
      for (const row of debtRows) {
        if (saved.has(`d${row.debtId}`)) continue;
        await payDebt(row.debtId!, row.amount);
        saved.add(`d${row.debtId}`);
      }
      onBack();
    } catch (e) {
      setDone(saved);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const rowClass = "flex items-center gap-3 rounded-xl border border-graphite-700 bg-graphite-900 px-4 py-3";

  return (
    <section className="animate-arrive" aria-labelledby="salary-title">
      <header className="flex h-16 items-center gap-2">
        <button
          aria-label="Back to dashboard"
          className="-ml-2 flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
          onClick={onBack}
          type="button"
        >
          <ChevronLeftIcon />
        </button>
        <h1 id="salary-title" className="text-2xl font-semibold">
          Salary is in!
        </h1>
      </header>

      <div className={rowClass + " mb-3"}>
        <label className="min-w-0 flex-1 text-base" htmlFor="credit-card-amount">
          {CREDIT_CARD_LABEL}
        </label>
        <input
          autoComplete="off"
          className="w-28 rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 text-right text-base text-white focus:border-orange focus:outline-none"
          id="credit-card-amount"
          inputMode="decimal"
          onChange={(e) => setCreditCard(cleanAmount(e.target.value))}
          placeholder="0.00"
          type="text"
          value={creditCard}
        />
      </div>

      {liabilities?.length === 0 && (
        <p className="mt-8 text-center text-graphite-300">No liabilities left to pay</p>
      )}

      <ul className="flex flex-col gap-3">
        {liabilities?.map((l) => (
          <li key={l.id}>
            <label className={rowClass + " cursor-pointer"}>
              <input
                checked={!unchecked.has(l.id)}
                className="size-5 shrink-0 accent-orange"
                onChange={() => toggle(l.id)}
                type="checkbox"
              />
              <span className="min-w-0 flex-1 truncate text-base">{l.description}</span>
              <span className="font-semibold">${formatAmount(l.amount)}</span>
            </label>
          </li>
        ))}
      </ul>

      <h2 className="mt-6 mb-3 text-base font-semibold">Debt</h2>
      <ul className="flex flex-col gap-3">
        {debtRows.map((row, index) => {
          const problem = rowProblem(row);
          return (
            <li className="rounded-xl border border-graphite-700 bg-graphite-900 px-4 py-3" key={index}>
              <div className="flex items-center gap-3">
                <select
                  aria-label="Debt"
                  className="min-w-0 flex-1 rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 text-base text-white focus:border-orange focus:outline-none"
                  onChange={(e) => {
                    const debt = debtById(Number(e.target.value));
                    updateDebtRow(index, { debtId: debt?.id ?? null, amount: debt?.amount ?? "" });
                  }}
                  value={row.debtId ?? ""}
                >
                  <option value="">Select debt…</option>
                  {[...availableDebts, ...(debtById(row.debtId) ? [debtById(row.debtId)!] : [])].map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.person} · ${formatAmount(d.amount)}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Debt payment amount"
                  autoComplete="off"
                  className="w-24 rounded-lg border border-graphite-700 bg-graphite-950 px-3 py-2 text-right text-base text-white focus:border-orange focus:outline-none"
                  inputMode="decimal"
                  onChange={(e) => updateDebtRow(index, { amount: cleanAmount(e.target.value) })}
                  placeholder="0.00"
                  type="text"
                  value={row.amount}
                />
                <button
                  aria-label="Remove debt payment"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-bad transition active:scale-95"
                  onClick={() => setDebtRows((rows) => rows.filter((_, i) => i !== index))}
                  type="button"
                >
                  <TrashIcon />
                </button>
              </div>
              {problem && row.debtId !== null && <p className="mt-2 text-xs text-bad">{problem}</p>}
            </li>
          );
        })}
      </ul>
      <button
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-graphite-700 text-sm font-semibold text-orange transition active:scale-95 disabled:opacity-40"
        disabled={availableDebts.length === 0}
        onClick={() => setDebtRows((rows) => [...rows, { debtId: null, amount: "" }])}
        type="button"
      >
        <PlusIcon className="size-5" />
        {debts.length === 0 ? "No outstanding debt" : "Include a debt payment"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      {/* Sticks just above the floating bottom nav (4rem bar + 0.75rem gap + bottom inset) and otherwise follows the list. */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 -mx-6 mt-4 bg-graphite-950/95 px-6 py-2 backdrop-blur">
        <button
          className="h-12 w-full rounded-xl bg-orange text-sm font-semibold text-white transition active:scale-95 disabled:opacity-40"
          disabled={busy || count === 0 || !liabilities || !debtsValid}
          onClick={submit}
          type="button"
        >
          {busy ? "Saving…" : `Paid my liabilities · $${formatAmount(String(total))}`}
        </button>
      </div>
    </section>
  );
}

export default SalaryIn;
