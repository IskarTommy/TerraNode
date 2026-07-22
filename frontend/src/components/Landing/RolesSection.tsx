import styles from "../../pages/Landing/LandingPage.css?inline";
import { useInView } from "../../hooks";

const rolesCSS = `
.roles-section { padding: 6rem 0; }
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-top: 2.5rem;
}
.role-card {
  padding: 2rem;
  border-radius: var(--radius-card, 16px);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-primary);
  transition: transform var(--transition-normal), box-shadow var(--transition-normal);
}
.role-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-card-hover);
}
.role-icon {
  width: 2.75rem; height: 2.75rem;
  border-radius: var(--radius-lg);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 1rem;
}
.role-card h3 { margin-bottom: 0.5rem; }
.role-card p { font-size: 0.875rem; margin-bottom: 1.25rem; }
.role-list {
  list-style: none;
  margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.5rem;
}
.role-list li {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.8125rem; color: var(--color-fg-secondary);
}
.role-list li::before {
  content: "✓"; flex-shrink: 0;
}
.role-farmer .role-icon { background: var(--color-role-farmer-bg); color: var(--color-role-farmer); }
.role-farmer .role-list li::before { color: var(--color-role-farmer); }
.role-logistics .role-icon { background: var(--color-role-logistics-bg); color: var(--color-role-logistics); }
.role-logistics .role-list li::before { color: var(--color-role-logistics); }
.role-admin .role-icon { background: var(--color-role-admin-bg); color: var(--color-role-admin); }
.role-admin .role-list li::before { color: var(--color-role-admin); }
.role-farmer .role-card { border-color: rgba(16,185,129,0.15); }
.role-logistics .role-card { border-color: rgba(6,182,212,0.15); }
.role-admin .role-card { border-color: rgba(139,92,246,0.15); }
`;

const ROLES = [
  {
    cls: "role-farmer" as const,
    icon: "M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.95l-.71.71M21 12h-1M4 12H3m14.95 7.95l.71-.71M4.76 4.76l.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    title: "Farmer",
    desc: "Log telemetry, mint harvest batches, and track your crops end-to-end.",
    items: ["Submit environmental readings", "Mint NFT batch tokens", "View yield predictions", "Monitor batch status"],
  },
  {
    cls: "role-logistics" as const,
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    title: "Logistics",
    desc: "Accept transfer requests and move produce across the supply chain.",
    items: ["View open transfer requests", "Accept & execute transfers", "Scan QR batch codes", "Update shipment status"],
  },
  {
    cls: "role-admin" as const,
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    title: "Admin",
    desc: "Oversee platform integrity, manage users, and run ledger verifications.",
    items: ["Manage all user accounts", "Run hash verification", "View system health", "Access full audit logs"],
  },
];

export function RolesSection() {
  const [inView, ref] = useInView({ threshold: 0.1 });
  return (
    <>
      <style>{rolesCSS}</style>
      <section
        id="roles"
        ref={ref}
        className={`roles-section${inView ? " in-view" : ""}`}
        style={inView ? {} : { opacity: 0 }}
      >
        <div className="container">
          <div className="section-header">
            <h2 className="text-heading-lg">One platform, <span className="text-gradient-gold">three roles.</span></h2>
            <p className="text-body text-fg-secondary" style={{ maxWidth: "36rem", margin: "0.75rem auto 0" }}>
              Every participant in the supply chain gets a tailored experience.
            </p>
          </div>
          <div className="roles-grid">
            {ROLES.map((r) => (
              <div className={`role-card ${r.cls}`} key={r.title}>
                <div className="role-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d={r.icon} />
                  </svg>
                </div>
                <h3 className="text-heading">{r.title}</h3>
                <p className="text-body-sm text-fg-secondary">{r.desc}</p>
                <ul className="role-list">
                  {r.items.map((li) => <li key={li}>{li}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
