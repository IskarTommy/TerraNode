import { useInView } from "../../hooks";

interface Feature {
  icon: string;
  title: string;
  desc: string;
  tag?: string;
}

const FEATURES: Feature[] = [
  {
    icon: "M7 20h10M12 20v-4M9 4h6v5.5a2.5 2.5 0 0 1-2.5 2.5h-1A2.5 2.5 0 0 1 9 9.5V4M9 13c-2.5 0-4.5 1.5-4.5 3.5S6.5 20 9 20c1 0 1.9-.4 2.7-1M15 13c2.5 0 4.5 1.5 4.5 3.5S17.5 20 15 20c-1 0-1.9-.4-2.7-1",
    title: "Crop Provenance",
    desc: "Every harvest is stamped with origin data — variety, soil health, and yield — tied to an on-chain NFT.",
    tag: "Traceability",
  },
  {
    icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 6a1.5 1.5 0 1 1-1.5 1.5A1.5 1.5 0 0 1 12 8zm0 9.5a4.5 4.5 0 1 1 4.5-4.5 4.5 4.5 0 0 1-4.5 4.5zm9.5-7.5a1 1 0 0 1-1.7.7L16 8.3a1 1 0 0 1 .7-1.7 1 1 0 0 1 1 .2l2.8 2.8a1 1 0 0 1 .2 1z",
    title: "Sui Blockchain",
    desc: "Built on Sui's object-centric model. Each batch is a unique dynamic object with ownership and events.",
    tag: "Layer 1",
  },
  {
    icon: "M7 17L17 7M17 7H7M17 7v10",
    title: "AI Yield",
    desc: "Weighted moving averages over 90 days of sensor data produce confidence-weighted harvest forecasts.",
    tag: "Analytics",
  },
  {
    icon: "M18 4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM2 14a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2zM7 14a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z",
    title: "IoT Telemetry",
    desc: "Temperature, humidity, and pH streamed live from LoRa / BLE sensors with SHA-256-hashed payloads.",
    tag: "Integrity",
  },
  {
    icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
    title: "ZK Privacy",
    desc: "Zero-knowledge proofs let logistics partners verify cargo condition without revealing sensitive data.",
    tag: "Privacy",
  },
  {
    icon: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
    title: "Custody Transfers",
    desc: "Handoffs happen in one on-chain transaction. Every ownership change is timestamped and auditable.",
    tag: "Supply Chain",
  },
];

const GRADIENT_SVG = `
  <defs>
    <linearGradient id="feat-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stopColor="#22D3EE"/>
      <stop offset="100%" stopColor="#3B82F6"/>
    </linearGradient>
  </defs>`;

function iconSvg(w: number, pathD: string, featured: boolean) {
  const sw = featured ? 1.75 : 1.5;
  return (
    <svg
      width={w}
      height={w}
      viewBox="0 0 24 24"
      fill="none"
      stroke="url(#feat-grad)"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="feature-icon-svg"
      style={{ filter: "drop-shadow(0 0 12px rgba(6,182,212,0.42))" }}
    >
      {GRADIENT_SVG}
      <path d={pathD} />
    </svg>
  );
}

export function FeaturesSection() {
  const [heroInView] = useInView({ threshold: 0.2 });

  return (
    <section id="features" className={`features${heroInView ? " in-view" : ""}`}>
      <div className="container">
        <div className="section-header">
          <h2 className="text-heading-lg">
            Designed for{" "}<span className="text-gradient-emerald">trust.</span> Built for{" "}
            <span className="text-gradient-gold">farmers.</span>
          </h2>
          <p
            className="text-body text-fg-secondary"
            style={{ maxWidth: "38rem", margin: "0.75rem auto 0" }}
          >
            Every feature on TerraNode makes the supply chain auditable, efficient, and honest.
          </p>
        </div>

        <div className="features-grid">
          {FEATURES.map((f, idx) => {
            const featured = idx === 0;
            const w = featured ? 28 : 24;
            const cls = featured ? "text-heading" : "text-heading-sm";

            return (
              <div
                className={`feature-card${featured ? " feature-card--featured" : ""}`}
                key={f.title}
              >
                <div className="feature-icon-wrap">
                  {iconSvg(w, f.icon, featured)}
                </div>
                <h3 className={cls}>{f.title}</h3>
                <p className="text-body-sm text-fg-secondary">{f.desc}</p>
                <span className="feature-badge">{f.tag}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
