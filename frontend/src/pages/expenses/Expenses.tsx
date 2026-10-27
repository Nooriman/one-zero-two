import { useState } from "react";
import { listExpenses } from "../../api/ExpenseApi";
import AmountList from "../../components/AmountList";
import CalendarIcon from "../../icons/CalendarIcon";
import ChevronLeftIcon from "../../icons/ChevronLeftIcon";
import Liabilities from "../liabilities/Liabilities";

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const addMonths = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth() + count, 1);

function Expenses() {
  const [showLiabilities, setShowLiabilities] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  if (showLiabilities) return <Liabilities onBack={() => setShowLiabilities(false)} />;

  const isCurrentMonth = month.getTime() === startOfMonth(new Date()).getTime();
  const label = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const navButton =
    "flex size-10 items-center justify-center rounded-full text-graphite-300 transition active:scale-95 disabled:opacity-30";

  return (
    <AmountList
      // Remount per month so each month loads its own list.
      key={month.getTime()}
      headerAction={
        <button
          aria-label="Monthly liabilities"
          className="flex size-10 items-center justify-center rounded-full text-orange transition active:scale-95"
          onClick={() => setShowLiabilities(true)}
          type="button"
        >
          <CalendarIcon />
        </button>
      }
      list={() => listExpenses({ from: month, to: addMonths(month, 1) })}
      noun="expense"
      scrollList
      showTotal
      title="Expenses"
      toolbar={(editing) => (
        <div className="mb-3 flex items-center justify-between">
          <button
            aria-label="Previous month"
            className={navButton}
            disabled={editing}
            onClick={() => setMonth(addMonths(month, -1))}
            type="button"
          >
            <ChevronLeftIcon />
          </button>
          <p className="font-semibold">{label}</p>
          <button
            aria-label="Next month"
            className={navButton}
            disabled={editing || isCurrentMonth}
            onClick={() => setMonth(addMonths(month, 1))}
            type="button"
          >
            <ChevronLeftIcon className="size-6 rotate-180" />
          </button>
        </div>
      )}
    />
  );
}

export default Expenses;
