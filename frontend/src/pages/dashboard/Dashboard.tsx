import { useEffect, useState } from "react";
import { getBudget } from "../../api/BudgetApi";
import { formatAmount, listDebts, type DebtRecord } from "../../api/DebtApi";
import { listExpenses } from "../../api/ExpenseApi";
import GearIcon from "../../icons/GearIcon";
import PlusIcon from "../../icons/PlusIcon";
import { loadLiabilityStatus } from "../../lib/liabilityStatus";
import AddSpending from "./AddSpending";
import SalaryIn from "./SalaryIn";
import Settings from "./Settings";

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

/** This month's spending against the budget the user set; the bar and amount turn red once it is exceeded. */
function SpendingSection({ onAddSpending }: { onAddSpending: () => void }) {
  const [state, setState] = useState<LoadState>("loading");
  const [spent, setSpent] = useState(0);
  const [budget, setBudgetAmount] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const range = {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
    Promise.all([listExpenses(range), getBudget()])
      .then(([expenses, b]) => {
        setSpent(expenses.reduce((sum, e) => sum + Number(e.amount), 0));
        setBudgetAmount(b.amount);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  const limit = budget === null ? 0 : Number(budget);
  const over = limit > 0 && spent > limit;
  const percent = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const month = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <section aria-labelledby="spending-section-title" className="mb-4 rounded-2xl bg-graphite-900 p-5">
      <div className="flex items-center justify-between">
        <h2 id="spending-section-title" className="text-base font-semibold">
          Spent in {month}
        </h2>
        <button
          aria-label="Add spending"
          className="-mr-2 -mt-2 flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95"
          onClick={onAddSpending}
          type="button"
        >
          <PlusIcon />
        </button>
      </div>

      {state === "loading" && <p className="mt-4 text-sm text-graphite-300">Loading…</p>}
      {state === "error" && <p className="mt-4 text-sm text-bad">Couldn't load spending.</p>}

      {state === "ready" && (
        <>
          <p className={"mt-3 font-mono text-3xl font-medium " + (over ? "text-bad" : "")}>
            {formatAmount(String(spent))}
          </p>

          {limit > 0 && (
            <>
              <div
                aria-label={`${formatAmount(String(spent))} spent of ${formatAmount(budget!)}`}
                aria-valuemax={limit}
                aria-valuemin={0}
                aria-valuenow={spent}
                className="mt-4 h-3 overflow-hidden rounded-full bg-graphite-700"
                role="progressbar"
              >
                <div
                  className={"h-full rounded-full transition-all " + (over ? "bg-bad" : "bg-orange")}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className={"mt-2 text-xs " + (over ? "text-bad" : "text-graphite-300")}>
                {over
                  ? `Over budget by ${formatAmount(String(spent - limit))}`
                  : `${formatAmount(String(limit - spent))} left of ${formatAmount(budget!)}`}
              </p>
            </>
          )}
          {budget === null && (
            <p className="mt-2 text-xs text-graphite-300">Set a monthly budget in settings to track your spending.</p>
          )}
        </>
      )}
    </section>
  );
}

/** Payday entry point; its label follows how much of this month's liabilities is paid. */
function SalaryButton({ onOpen }: { onOpen: () => void }) {
  // null until loaded (or if loading failed), so the default button still works.
  const [counts, setCounts] = useState<{ total: number; unpaid: number } | null>(null);

  useEffect(() => {
    loadLiabilityStatus()
      .then(({ all, unpaid }) => setCounts({ total: all.length, unpaid: unpaid.length }))
      .catch(() => setCounts(null));
  }, []);

  const allPaid = counts !== null && counts.total > 0 && counts.unpaid === 0;
  const partlyPaid = counts !== null && counts.unpaid > 0 && counts.unpaid < counts.total;

  return (
    <button
      className="mb-4 h-12 w-full rounded-xl bg-orange text-sm font-semibold text-white transition active:scale-95 disabled:bg-graphite-900 disabled:text-graphite-300 disabled:active:scale-100"
      disabled={allPaid}
      onClick={onOpen}
      type="button"
    >
      {allPaid ? "Liabilities Paid!" : partlyPaid ? "Pay Liabilities" : "Salary is in!"}
    </button>
  );
}

function Dashboard() {
  const [view, setView] = useState<"home" | "salary" | "spending" | "settings">("home");

  if (view === "salary") return <SalaryIn onBack={() => setView("home")} />;
  if (view === "settings") return <Settings onBack={() => setView("home")} />;
  if (view === "spending") return <AddSpending onBack={() => setView("home")} />;

  return (
    <section className="animate-arrive" aria-labelledby="dashboard-title">
      <header className="flex h-16 items-center justify-between">
        <h1 id="dashboard-title" className="text-2xl font-semibold">
          Dashboard
        </h1>
        <button
          aria-label="Settings"
          className="-mr-2 flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
          onClick={() => setView("settings")}
          type="button"
        >
          <GearIcon />
        </button>
      </header>
      <SalaryButton onOpen={() => setView("salary")} />
      <SpendingSection onAddSpending={() => setView("spending")} />
      <DebtSection />
    </section>
  );
}

export default Dashboard;
