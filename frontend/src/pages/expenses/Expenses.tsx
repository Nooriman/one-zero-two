import { useEffect, useState } from "react";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
  type ExpenseRecord,
} from "../../api/ExpenseApi";
import PencilIcon from "../../icons/PencilIcon";
import PlusIcon from "../../icons/PlusIcon";
import TrashIcon from "../../icons/TrashIcon";

type Expense = Pick<ExpenseRecord, "id" | "description" | "amount">;

const DESCRIPTION_MAX = 250;

/** Reduce typed text to a plain currency string: digits, one dot, max 2 decimals. */
function cleanAmount(input: string) {
  const [whole, ...rest] = input.replace(/[^\d.]/g, "").split(".");
  const intPart = whole.replace(/^0+(?=\d)/, "").slice(0, 10);
  if (rest.length === 0) return intPart;
  return `${intPart || "0"}.${rest.join("").slice(0, 2)}`;
}

function formatAmount(amount: string) {
  return Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const inputClass =
  "rounded-lg border border-graphite-700 bg-graphite-900 px-3 py-2 text-base text-white focus:border-orange focus:outline-none";

function Expenses() {
  // null until the first fetch completes.
  const [saved, setSaved] = useState<Expense[] | null>(null);
  // Working copy while editing; only sent to the API when Done is pressed.
  // New rows get a negative temporary id until the server assigns a real one.
  const [draft, setDraft] = useState<Expense[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  useEffect(() => {
    listExpenses()
      .then(setSaved)
      .catch((e: Error) => setError(e.message));
  }, []);

  const expenses = (editing ? draft : saved) ?? [];

  const startEditing = () => {
    if (!saved) return;
    setError("");
    setDraft(saved);
    setEditing(true);
  };

  const finishEditing = async () => {
    if (!saved || busy) return;
    setBusy(true);
    setError("");

    // Track what the server has accepted so a retry after a failure never repeats work.
    let serverState = saved;
    let draftState = draft;
    try {
      const keptIds = new Set(draft.map((e) => e.id));
      for (const gone of saved.filter((e) => !keptIds.has(e.id))) {
        await deleteExpense(gone.id);
        serverState = serverState.filter((e) => e.id !== gone.id);
      }

      for (const row of draft) {
        const input = { description: row.description, amount: row.amount || "0" };
        if (row.id < 0) {
          // Skip rows that were added but never filled in.
          if (!row.description.trim() && !(Number(row.amount) > 0)) continue;
          const created = await createExpense(input);
          serverState = [created, ...serverState];
          draftState = draftState.map((e) => (e.id === row.id ? created : e));
        } else {
          const original = serverState.find((e) => e.id === row.id);
          if (original && original.description === row.description && original.amount === row.amount) continue;
          const updated = await updateExpense(row.id, input);
          serverState = serverState.map((e) => (e.id === row.id ? updated : e));
        }
      }

      setSaved(await listExpenses());
      setEditing(false);
    } catch (e) {
      setSaved(serverState);
      setDraft(draftState);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const addExpense = () =>
    setDraft((list) => {
      const tempId = Math.min(0, ...list.map((e) => e.id)) - 1;
      return [{ id: tempId, description: "", amount: "" }, ...list];
    });

  const update = (id: number, changes: Partial<Expense>) =>
    setDraft((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setDraft((list) => list.filter((e) => e.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <section className="animate-arrive" aria-labelledby="expenses-title">
      <header className="flex h-16 items-center justify-between">
        <h1 id="expenses-title" className="text-2xl font-semibold">
          Expenses
        </h1>
        <div className="-mr-2 flex items-center">
          {editing ? (
            <button
              className="h-10 rounded-full px-3 text-sm font-semibold text-orange transition active:scale-95 disabled:opacity-40"
              disabled={busy}
              onClick={finishEditing}
              type="button"
            >
              {busy ? "Saving…" : "Done"}
            </button>
          ) : (
            <button
              aria-label="Edit expenses"
              className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95 disabled:opacity-40"
              disabled={!saved}
              onClick={startEditing}
              type="button"
            >
              <PencilIcon />
            </button>
          )}
        </div>
      </header>

      {error && (
        <p className="mb-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      {editing && (
        <button
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-graphite-700 text-sm font-semibold text-orange transition active:scale-95"
          onClick={addExpense}
          type="button"
        >
          <PlusIcon className="size-5" />
          Add expense
        </button>
      )}

      {saved && expenses.length === 0 && !editing && (
        <div className="flex min-h-[60dvh] items-center justify-center">
          <p className="text-graphite-300">No expenses yet</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {expenses.map((expense) => (
          <li
            className="flex items-center gap-3 rounded-xl border border-graphite-700 bg-graphite-900 px-4 py-3"
            key={expense.id}
          >
            {editing ? (
              <>
                <input
                  aria-label="Description"
                  className={inputClass + " min-w-0 flex-1"}
                  maxLength={DESCRIPTION_MAX}
                  onChange={(e) => update(expense.id, { description: e.target.value })}
                  type="text"
                  value={expense.description}
                />
                <input
                  aria-label="Amount"
                  autoComplete="off"
                  className={inputClass + " w-24 text-right"}
                  inputMode="decimal"
                  onChange={(e) => update(expense.id, { amount: cleanAmount(e.target.value) })}
                  type="text"
                  value={expense.amount}
                />
                <button
                  aria-label={`Delete ${expense.description || "expense"}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-bad transition active:scale-95"
                  onClick={() => setPendingDelete(expense)}
                  type="button"
                >
                  <TrashIcon />
                </button>
              </>
            ) : (
              <>
                <p className="min-w-0 flex-1 truncate text-base">{expense.description}</p>
                <p className="font-semibold">${formatAmount(expense.amount)}</p>
              </>
            )}
          </li>
        ))}
      </ul>

      {pendingDelete && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setPendingDelete(null)}
        >
          <div
            aria-describedby="delete-expense-message"
            aria-labelledby="delete-expense-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-graphite-700 bg-graphite-900 p-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <h2 id="delete-expense-title" className="text-lg font-semibold">
              Delete expense?
            </h2>
            <p id="delete-expense-message" className="mt-2 text-sm text-graphite-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {pendingDelete.description || "this expense"}
              </span>{" "}
              (${formatAmount(pendingDelete.amount)})? This can't be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                autoFocus
                className="h-12 flex-1 rounded-xl border border-graphite-700 text-sm font-semibold text-graphite-300 transition active:scale-95"
                onClick={() => setPendingDelete(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="h-12 flex-1 rounded-xl bg-bad text-sm font-semibold text-white transition active:scale-95"
                onClick={confirmDelete}
                type="button"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Expenses;
