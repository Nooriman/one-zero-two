import { useState } from "react";
import type { ReactElement } from "react";
import Dashboard from "./pages/dashboard/Dashboard";
import Debt from "./pages/debt/Debt";
import Expenses from "./pages/expenses/Expenses";
import CardIcon from "./icons/CardIcon";
import DashboardIcon from "./icons/DashboardIcon";
import ReceiptIcon from "./icons/ReceiptIcon";

type NavItem = {
  id: string;
  label: string;
  icon: ReactElement;
  page: ReactElement;
};

// Max 4 items. Add a module here as it gets built.
const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <DashboardIcon />
    ),
    page: <Dashboard />,
  },
  {
    id: "debt",
    label: "Debt",
    icon: (
      <CardIcon />
    ),
    page: <Debt />,
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: (
      <ReceiptIcon />
    ),
    page: <Expenses />,
  },
];

function App() {
  const [activeId, setActiveId] = useState(NAV_ITEMS[0].id);
  const active = NAV_ITEMS.find((item) => item.id === activeId) ?? NAV_ITEMS[0];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <main className="flex-1 px-6 pt-[env(safe-area-inset-top)] pb-24">{active.page}</main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-graphite-700 bg-graphite-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <ul className="mx-auto flex max-w-xl">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active.id;
            return (
              <li className="flex-1" key={item.id}>
                <button
                  aria-current={isActive ? "page" : undefined}
                  className={
                    "flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition active:scale-95 " +
                    (isActive ? "text-orange" : "text-graphite-300")
                  }
                  onClick={() => setActiveId(item.id)}
                  type="button"
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

export default App;
