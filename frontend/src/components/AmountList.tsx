import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { cleanAmount } from "../lib/amount";
import ChevronLeftIcon from "../icons/ChevronLeftIcon";
import PencilIcon from "../icons/PencilIcon";
import PlusIcon from "../icons/PlusIcon";
import TrashIcon from "../icons/TrashIcon";

type Row = { id: number; description: string; amount: string };
type RowInput = { description: string; amount: string };

/** Everything that differs between lists that share the same description + amount shape. */
type AmountListProps = {
  /** Page title, e.g. "Expenses". */
  title: string;
  /** Singular lowercase noun used in labels, e.g. "expense". */
  noun: string;
  list: () => Promise<Row[]>;
  /** Omit create and update for a read-only list. */
  create?: (input: RowInput) => Promise<Row>;
  update?: (id: number, input: RowInput) => Promise<Row>;
  /** Omit to make saved rows permanent (rows not yet saved can still be discarded). */
  remove?: (id: number) => Promise<void>;
  /** Shown before the edit button while not editing, e.g. a link to another list. */
  headerAction?: ReactNode;
  /** Rendered under the header; receives whether the list is being edited. */
  toolbar?: (editing: boolean) => ReactNode;
  /** Show the sum of all rows under the header. */
  showTotal?: boolean;
  /** Pin the header, toolbar and total in place so only the list scrolls. */
  scrollList?: boolean;
  /** When set, saving edits first asks the user to confirm with this message. */
  saveNotice?: { title: string; message: string };
  /** When set, a back chevron is shown next to the title. */
  onBack?: () => void;
};

const DESCRIPTION_MAX = 250;

function formatAmount(amount: string) {
  return Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const inputClass =
  "rounded-lg border border-graphite-700 bg-graphite-900 px-3 py-2 text-base text-white focus:border-orange focus:outline-none";

function AmountList({ title, noun, list, create, update: updateRow, remove, headerAction, toolbar, showTotal, scrollList, saveNotice, onBack }: AmountListProps) {
  // null until the first fetch completes.
  const [saved, setSaved] = useState<Row[] | null>(null);
  // Working copy while editing; only sent to the API when Done is pressed.
  // New rows get a negative temporary id until the server assigns a real one.
  const [draft, setDraft] = useState<Row[]>([]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const [confirmingSave, setConfirmingSave] = useState(false);

  useEffect(() => {
    list()
      .then(setSaved)
      .catch((e: Error) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expenses = (editing ? draft : saved) ?? [];

  const startEditing = () => {
    if (!saved) return;
    setError("");
    setDraft(saved);
    setEditing(true);
  };

  /** Whether the draft differs from what is saved (ignoring added rows left blank). */
  const hasChanges = () =>
    !!saved &&
    (saved.some((r) => !draft.some((d) => d.id === r.id)) ||
      draft.some((d) => {
        const original = saved.find((r) => r.id === d.id);
        return original
          ? original.description !== d.description || original.amount !== d.amount
          : d.description.trim() !== "" || Number(d.amount) > 0;
      }));

  const requestFinish = () => {
    if (saveNotice && hasChanges()) setConfirmingSave(true);
    else finishEditing();
  };

  const finishEditing = async () => {
    if (!saved || busy || !create || !updateRow) return;
    setBusy(true);
    setError("");

    // Track what the server has accepted so a retry after a failure never repeats work.
    let serverState = saved;
    let draftState = draft;
    try {
      const keptIds = new Set(draft.map((e) => e.id));
      for (const gone of saved.filter((e) => !keptIds.has(e.id))) {
        await remove?.(gone.id);
        serverState = serverState.filter((e) => e.id !== gone.id);
      }

      for (const row of draft) {
        const input = { description: row.description, amount: row.amount || "0" };
        if (row.id < 0) {
          // Skip rows that were added but never filled in.
          if (!row.description.trim() && !(Number(row.amount) > 0)) continue;
          const created = await create(input);
          serverState = [created, ...serverState];
          draftState = draftState.map((e) => (e.id === row.id ? created : e));
        } else {
          const original = serverState.find((e) => e.id === row.id);
          if (original && original.description === row.description && original.amount === row.amount) continue;
          const updated = await updateRow(row.id, input);
          serverState = serverState.map((e) => (e.id === row.id ? updated : e));
        }
      }

      setSaved(await list());
      setEditing(false);
    } catch (e) {
      setSaved(serverState);
      setDraft(draftState);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const addRow = () =>
    setDraft((list) => {
      const tempId = Math.min(0, ...list.map((e) => e.id)) - 1;
      return [{ id: tempId, description: "", amount: "" }, ...list];
    });

  const updateDraft = (id: number, changes: Partial<Row>) =>
    setDraft((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)));

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setDraft((list) => list.filter((e) => e.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  return (
    <section
      // Fill the screen between the top inset and the bottom nav (main reserves 6rem below), so the page itself never scrolls.
      className={"animate-arrive" + (scrollList ? " flex h-[calc(100dvh-env(safe-area-inset-top)-6rem)] flex-col" : "")}
      aria-labelledby="amount-list-title"
    >
      <header className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              aria-label="Back"
              className="-ml-2 flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
              onClick={onBack}
              type="button"
            >
              <ChevronLeftIcon />
            </button>
          )}
          <h1 id="amount-list-title" className="text-2xl font-semibold">
            {title}
          </h1>
        </div>
        <div className="-mr-2 flex items-center">
          {editing ? (
            <button
              className="h-10 rounded-full px-3 text-sm font-semibold text-orange transition active:scale-95 disabled:opacity-40"
              disabled={busy}
              onClick={requestFinish}
              type="button"
            >
              {busy ? "Saving…" : "Done"}
            </button>
          ) : (
            <>
              {headerAction}
              {create && updateRow && (
              <button
                aria-label={`Edit ${noun} list`}
                className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95 disabled:opacity-40"
                disabled={!saved}
                onClick={startEditing}
                type="button"
              >
                <PencilIcon />
              </button>
              )}
            </>
          )}
        </div>
      </header>

      {toolbar?.(editing)}

      {showTotal && (
        <p className="mb-3 flex items-baseline justify-between text-sm text-graphite-300">
          Total
          <span className="text-lg font-semibold text-white">
            ${formatAmount(expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0).toFixed(2))}
          </span>
        </p>
      )}

      {error && (
        <p className="mb-3 text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      {editing && (
        <button
          className="mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-graphite-700 text-sm font-semibold text-orange transition active:scale-95"
          onClick={addRow}
          type="button"
        >
          <PlusIcon className="size-5" />
          Add {noun}
        </button>
      )}

      {saved && expenses.length === 0 && !editing && (
        <div className={scrollList ? "flex flex-1 items-center justify-center" : "flex min-h-[60dvh] items-center justify-center"}>
          <p className="text-graphite-300">No {noun === "liability" ? "liabilities" : `${noun}s`} yet</p>
        </div>
      )}

      <ul className={"flex flex-col gap-3" + (scrollList ? " min-h-0 flex-1 overflow-y-auto pb-2" : "")}>
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
                  onChange={(e) => updateDraft(expense.id, { description: e.target.value })}
                  type="text"
                  value={expense.description}
                />
                <input
                  aria-label="Amount"
                  autoComplete="off"
                  className={inputClass + " w-24 text-right"}
                  inputMode="decimal"
                  onChange={(e) => updateDraft(expense.id, { amount: cleanAmount(e.target.value) })}
                  type="text"
                  value={expense.amount}
                />
                {(expense.id < 0 || remove) && (
                <button
                  aria-label={`Delete ${expense.description || noun}`}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-bad transition active:scale-95"
                  onClick={() => setPendingDelete(expense)}
                  type="button"
                >
                  <TrashIcon />
                </button>
                )}
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

      {confirmingSave && saveNotice && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setConfirmingSave(false)}
        >
          <div
            aria-describedby="save-notice-message"
            aria-labelledby="save-notice-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-graphite-700 bg-graphite-900 p-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <h2 id="save-notice-title" className="text-lg font-semibold">
              {saveNotice.title}
            </h2>
            <p id="save-notice-message" className="mt-2 text-sm text-graphite-300">
              {saveNotice.message}
            </p>
            <div className="mt-5 flex gap-3">
              <button
                className="h-12 flex-1 rounded-xl border border-graphite-700 text-sm font-semibold text-graphite-300 transition active:scale-95"
                onClick={() => setConfirmingSave(false)}
                type="button"
              >
                Keep editing
              </button>
              <button
                autoFocus
                className="h-12 flex-1 rounded-xl bg-orange text-sm font-semibold text-white transition active:scale-95"
                onClick={() => {
                  setConfirmingSave(false);
                  finishEditing();
                }}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 px-6"
          onClick={() => setPendingDelete(null)}
        >
          <div
            aria-describedby="delete-row-message"
            aria-labelledby="delete-row-title"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl border border-graphite-700 bg-graphite-900 p-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <h2 id="delete-row-title" className="text-lg font-semibold">
              Delete {noun}?
            </h2>
            <p id="delete-row-message" className="mt-2 text-sm text-graphite-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-white">
                {pendingDelete.description || `this ${noun}`}
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

export default AmountList;
