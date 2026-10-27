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
          <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" />
          </svg>
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
