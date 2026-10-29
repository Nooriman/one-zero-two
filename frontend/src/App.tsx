import { useState } from "react";
import type { ReactElement } from "react";
import Dashboard from "./pages/dashboard/Dashboard";
import Debt from "./pages/debt/Debt";
import Documents from "./pages/documents/Documents";
import Expenses from "./pages/expenses/Expenses";
import CardIcon from "./icons/CardIcon";
import DashboardIcon from "./icons/DashboardIcon";
import DocumentIcon from "./icons/DocumentIcon";
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
  {
    id: "documents",
    label: "Documents",
    icon: (
      <DocumentIcon />
    ),
    page: <Documents />,
  },
];

function App() {
  const [activeId, setActiveId] = useState(NAV_ITEMS[0].id);
  const active = NAV_ITEMS.find((item) => item.id === activeId) ?? NAV_ITEMS[0];

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      {/* pb reserves room for the floating nav: 3rem bar + 0.75rem gap + 1.75rem breathing space + bottom inset. */}
      <main className="flex-1 px-6 pt-[env(safe-area-inset-top)] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{active.page}</main>

      <nav
        aria-label="Primary"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <ul className="pointer-events-auto mx-auto flex max-w-xl overflow-hidden rounded-3xl border border-graphite-700 bg-graphite-900/95 shadow-lg shadow-black/40 backdrop-blur">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === active.id;
            return (
              <li className="flex-1" key={item.id}>
                <button
                  aria-current={isActive ? "page" : undefined}
                  aria-label={item.label}
                  className={
                    "flex h-12 w-full items-center justify-center transition active:scale-95 " +
                    (isActive ? "text-orange" : "text-graphite-300")
                  }
                  onClick={() => setActiveId(item.id)}
                  title={item.label}
                  type="button"
                >
                  {item.icon}
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
