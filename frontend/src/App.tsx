import { useState } from "react";
import type { ReactElement } from "react";
import Dashboard from "./pages/Dashboard";
import Debt from "./pages/Debt";

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
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
    page: <Dashboard />,
  },
  {
    id: "debt",
    label: "Debt",
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2.5" />
        <path d="M2 10h20" />
        <path d="M6 15h4" />
      </svg>
    ),
    page: <Debt />,
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
