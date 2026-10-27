import { useEffect, useState } from "react";
import { formatAmount, listDebts, type DebtRecord } from "../../api/DebtApi";

type LoadState = "loading" | "ready" | "error";

const TOP_COUNT = 5;

function DebtSection() {
  const [state, setState] = useState<LoadState>("loading");
  const [debts, setDebts] = useState<DebtRecord[]>([]);

  useEffect(() => {
    listDebts()
      .then((data) => {
        setDebts(data);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const unpaid = debts.filter((debt) => !debt.paidAt);
  const top = [...unpaid]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, TOP_COUNT);
  const total = unpaid.reduce((sum, debt) => sum + Number(debt.amount), 0);

  return (
    <section aria-labelledby="debt-section-title" className="rounded-2xl bg-graphite-900 p-5">
      <div className="flex items-baseline justify-between">
        <h2 id="debt-section-title" className="text-base font-semibold">
          Debt
        </h2>
        {state === "ready" && unpaid.length > 0 && (
          <span className="font-mono text-[11px] uppercase text-graphite-300">
            Top {top.length} of {unpaid.length}
          </span>
        )}
      </div>

      {state === "ready" && unpaid.length > 0 && (
        <p className="mt-3 font-mono text-3xl font-medium">{formatAmount(String(total))}</p>
      )}

      {state === "loading" && <p className="mt-4 text-sm text-graphite-300">Loading…</p>}
      {state === "error" && <p className="mt-4 text-sm text-bad">Couldn't load debts.</p>}
      {state === "ready" && unpaid.length === 0 && (
        <p className="mt-4 text-sm text-graphite-300">No outstanding debt.</p>
      )}

      {top.length > 0 && (
        <ul className="mt-4 divide-y divide-graphite-700">
          {top.map((debt) => (
            <li className="flex items-center justify-between gap-4 py-3" key={debt.id}>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{debt.person}</p>
                {debt.description && (
                  <p className="truncate text-xs text-graphite-300">{debt.description}</p>
                )}
              </div>
              <span className="shrink-0 font-mono text-sm">{formatAmount(debt.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Dashboard() {
  return (
    <section className="animate-arrive" aria-labelledby="dashboard-title">
      <header className="flex h-16 items-center">
        <h1 id="dashboard-title" className="text-2xl font-semibold">
          Dashboard
        </h1>
      </header>
      <DebtSection />
    </section>
  );
}

export default Dashboard;
