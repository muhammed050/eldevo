const stats = [
  ["0", "Active agents"],
  ["0", "Running tasks"],
  ["$0.00", "AI spend"],
  ["0", "Successful outcomes"],
];

const nav = ["Overview", "Agents", "Teams", "Tasks", "Memory", "Tools", "Approvals", "Usage"];

export default function Home() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">eldevo</div>
        <nav className="nav">
          {nav.map((item, index) => <a key={item} className={index === 0 ? "active" : ""} href="#">{item}</a>)}
        </nav>
      </aside>
      <main className="main">
        <div className="eyebrow">AI Workforce Control Center</div>
        <h1>Deploy intelligence.</h1>
        <p className="sub">Eldevo is the operating system for AI employees. Give a team an outcome, let agents plan and execute the work, and keep humans in control of sensitive actions.</p>
        <section className="grid">
          {stats.map(([value, label]) => <div className="card" key={label}><div className="label">{label}</div><div className="metric">{value}</div></div>)}
        </section>
        <section className="section">
          <h2>Execution queue</h2>
          <div className="card task"><div><strong>No tasks yet</strong><div className="label">Create your first agent to start executing work.</div></div><span className="badge">READY</span></div>
        </section>
        <section className="section">
          <h2>Foundation</h2>
          <div className="grid">
            <div className="card"><strong>Agent Runtime</strong><p className="label">Planner, executor, state, retries and model routing.</p></div>
            <div className="card"><strong>Memory</strong><p className="label">Company knowledge and task context with permission boundaries.</p></div>
            <div className="card"><strong>Security</strong><p className="label">Policies, budgets, approvals and auditability.</p></div>
            <div className="card"><strong>Marketplace</strong><p className="label">A future ecosystem for certified AI employees.</p></div>
          </div>
        </section>
      </main>
    </div>
  );
}
