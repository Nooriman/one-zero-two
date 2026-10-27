import WrenchIcon from "../../icons/WrenchIcon";

function Dashboard() {
  return (
    <section className="animate-arrive" aria-labelledby="dashboard-title">
      <header className="flex h-16 items-center">
        <h1 id="dashboard-title" className="text-2xl font-semibold">
          Dashboard
        </h1>
      </header>
      <div className="mt-24 flex flex-col items-center text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-graphite-900 text-orange">
          <WrenchIcon className="size-8" />
        </span>
        <h2 className="mt-6 text-xl font-semibold">Work in progress</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-graphite-300">
          The dashboard is coming soon.
        </p>
      </div>
    </section>
  );
}

export default Dashboard;
