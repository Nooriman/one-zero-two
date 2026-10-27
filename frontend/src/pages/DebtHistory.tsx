import DebtCard from "./DebtCard";
import type { DebtRecord } from "./debtApi";

type DebtHistoryProps = {
  debts: DebtRecord[] | null;
  onBack: () => void;
  onOpen: (id: number) => void;
};

function DebtHistory({ debts, onBack, onOpen }: DebtHistoryProps) {
  const paid = debts
    ?.filter((debt) => debt.paidAt)
    .sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime());

  return (
    <section className="animate-arrive" aria-labelledby="debt-history-title">
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
        <h1 id="debt-history-title" className="text-2xl font-semibold">
          Debt History
        </h1>
      </header>

      {paid?.length === 0 && (
        <div className="flex min-h-[60dvh] items-center justify-center">
          <p className="text-graphite-300">No paid debt yet</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {paid?.map((debt) => (
          <li key={debt.id}>
            <DebtCard debt={debt} onOpen={() => onOpen(debt.id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default DebtHistory;
