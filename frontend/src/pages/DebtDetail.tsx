import { useEffect, useState } from "react";
import { formatAmount, getDebt, markDebtPaid, type DebtRecord } from "./debtApi";

type DebtDetailProps = {
  id: number;
  onBack: () => void;
};

function DebtDetail({ id, onBack }: DebtDetailProps) {
  const [debt, setDebt] = useState<DebtRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDebt(id)
      .then(setDebt)
      .catch((e: Error) => setError(e.message));
  }, [id]);

  const markPaid = async () => {
    setBusy(true);
    setError("");
    try {
      setDebt(await markDebtPaid(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="animate-arrive" aria-labelledby="debt-detail-title">
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
        <h1 id="debt-detail-title" className="text-2xl font-semibold">
          Debt
        </h1>
      </header>

      {error && (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      {debt && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-graphite-700 bg-graphite-900 p-4">
            <p className="text-sm text-graphite-300">Me → {debt.person}</p>
            <p className="mt-1 text-3xl font-semibold">{formatAmount(debt.amount)}</p>
            <p className={"mt-1 text-xs font-semibold " + (debt.paidAt ? "text-graphite-300" : "text-orange")}>
              {debt.paidAt ? `Paid on ${new Date(debt.paidAt).toLocaleDateString()}` : "Unpaid"}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-graphite-300">Description</p>
            <p className="whitespace-pre-wrap break-words">{debt.description || "No description"}</p>
          </div>

          <p className="text-xs text-graphite-300">
            Created {new Date(debt.createdAt).toLocaleDateString()}
          </p>

          {!debt.paidAt && (
            <button
              className="h-12 rounded-xl bg-orange text-sm font-semibold text-graphite-950 transition active:scale-95 disabled:opacity-40"
              disabled={busy}
              onClick={markPaid}
              type="button"
            >
              {busy ? "Saving…" : "Paid"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

export default DebtDetail;
