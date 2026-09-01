import { useInView } from "../../hooks";
import { TerminalMockup } from "./TerminalMockup";

const STEPS = [
  { n: "01", title: "Register", desc: "Create a farmer or logistics account and optionally bind a Sui wallet with a single-use challenge." },
  { n: "02", title: "Submit", desc: "Store source-labelled observations with AES-256-GCM encryption and a canonical SHA-256 hash." },
  { n: "03", title: "Anchor", desc: "Prepare a produce batch, sign on Testnet, and verify the resulting Sui traceability object." },
  { n: "04", title: "Verify", desc: "Recheck local integrity, the batch hash, custody events, and current on-chain owner." },
];

export function HowItWorksSection() {
  const [v, ref] = useInView({ threshold: 0.15 });
  return (
    <section id="how-it-works" ref={ref} className={`how-section${v ? " in-view" : ""}`}>
      <div className="container">
        <div className="section-header">
          <h2 className="text-heading-lg">How it <span className="text-gradient-emerald">works</span></h2>
          <p className="text-body text-fg-secondary" style={{ maxWidth: "32rem", margin: "0.75rem auto 0" }}>
            From seed to shelf in four blockchain-verified steps.
          </p>
        </div>
        <div className="how-flow">
          {STEPS.map((s, i) => (
            <div className="how-step" key={i}>
              {i < STEPS.length - 1 && <div className="how-connector" aria-hidden="true" />}
              <div className="how-num">{s.n}</div>
              <h3 className="text-heading-sm">{s.title}</h3>
              <p className="text-body-sm text-fg-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
        {/* Terminal mockup */}
        <TerminalMockup />
      </div>
    </section>
  );
}
