import { useInView } from "../../hooks";
import { TerminalMockup } from "./TerminalMockup";

const STEPS = [
  { n: "01", title: "Register", desc: "Create a TerraNode account and link your Sui wallet. Choose your role — Farmer, Logistics, or Admin." },
  { n: "02", title: "Submit", desc: "Log soil readings, temperature, and pH. Each record is SHA-256 hashed and stored immutably." },
  { n: "03", title: "Mint", desc: "Bundle your harvest into a batch, sign on-chain, and receive a verifiable NFT proof-of-origin." },
  { n: "04", title: "Verify", desc: "Every custodian handoff and admin audit re-validates the hash against the Sui ledger end-to-end." },
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
