import { useEffect, useState } from "react";
import DebtCard from "./DebtCard";
import DebtDetail from "./DebtDetail";
import DebtHistory from "./DebtHistory";
import { listDebts, type DebtRecord } from "./debtApi";
import NewDebt from "./NewDebt";

type View =
  | { kind: "list" }
  | { kind: "new" }
  | { kind: "history" }
  | { kind: "detail"; id: number; from: "list" | "history" };

function Debt() {
  const [view, setView] = useState<View>({ kind: "list" });
  const [debts, setDebts] = useState<DebtRecord[] | null>(null);
  const [error, setError] = useState("");

  // Refetch whenever we land back on a screen that shows the list.
  const showsList = view.kind === "list" || view.kind === "history";
  useEffect(() => {
    if (!showsList) return;
    setError("");
    listDebts()
      .then(setDebts)
      .catch((e: Error) => setError(e.message));
  }, [showsList]);

  const toList = () => setView({ kind: "list" });

  if (view.kind === "new") return <NewDebt onBack={toList} onCreated={toList} />;
  if (view.kind === "detail") {
    return (
      <DebtDetail
        id={view.id}
        onBack={() => setView({ kind: view.from })}
      />
    );
  }
  if (view.kind === "history") {
    return (
      <DebtHistory
        debts={debts}
        onBack={toList}
        onOpen={(id) => setView({ kind: "detail", id, from: "history" })}
      />
    );
  }

  const unpaid = debts?.filter((debt) => !debt.paidAt);

  return (
    <section className="animate-arrive" aria-labelledby="debt-title">
      <header className="flex h-16 items-center justify-between">
        <h1 id="debt-title" className="text-2xl font-semibold">
          Debt
        </h1>
        <div className="-mr-2 flex items-center">
          <button
            aria-label="Debt history"
            className="flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
            onClick={() => setView({ kind: "history" })}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
              <path d="M12 7v5l3 2" />
            </svg>
          </button>
          <button
            aria-label="Add debt"
            className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95"
            onClick={() => setView({ kind: "new" })}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-bad" role="alert">
          {error}
        </p>
      )}

      {unpaid?.length === 0 && (
        <div className="flex min-h-[60dvh] items-center justify-center">
          <p className="text-graphite-300">No debt at the moment</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {unpaid?.map((debt) => (
          <li key={debt.id}>
            <DebtCard debt={debt} onOpen={() => setView({ kind: "detail", id: debt.id, from: "list" })} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default Debt;
