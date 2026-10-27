import { useState } from "react";
import ChevronLeftIcon from "../../icons/ChevronLeftIcon";
import PlusIcon from "../../icons/PlusIcon";

function Expenses() {
  const [adding, setAdding] = useState(false);

  if (adding) {
    return (
      <section className="animate-arrive" aria-labelledby="new-expense-title">
        <header className="flex h-16 items-center gap-2">
          <button
            aria-label="Back to expenses"
            className="-ml-2 flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95"
            onClick={() => setAdding(false)}
            type="button"
          >
            <ChevronLeftIcon />
          </button>
          <h1 id="new-expense-title" className="text-2xl font-semibold">
            New Expense
          </h1>
        </header>
      </section>
    );
  }

  return (
    <section className="animate-arrive" aria-labelledby="expenses-title">
      <header className="flex h-16 items-center justify-between">
        <h1 id="expenses-title" className="text-2xl font-semibold">
          Expenses
        </h1>
        <div className="-mr-2 flex items-center">
          <button
            aria-label="Add expense"
            className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95"
            onClick={() => setAdding(true)}
            type="button"
          >
            <PlusIcon />
          </button>
        </div>
      </header>

      <div className="flex min-h-[60dvh] items-center justify-center">
        <p className="text-graphite-300">No expenses yet</p>
      </div>
    </section>
  );
}

export default Expenses;
