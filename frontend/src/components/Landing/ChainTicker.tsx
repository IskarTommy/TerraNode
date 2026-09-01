import { useInView } from "../../hooks";

const tickerCSS = `
.chain-ticker {
  position: relative;
  z-index: 2;
  border-top: 1px solid var(--color-border-primary, rgba(255,255,255,0.06));
  border-bottom: 1px solid var(--color-border-primary, rgba(255,255,255,0.06));
  background: rgba(4,13,28,0.5);
  backdrop-filter: blur(8px);
  overflow: hidden;
  padding: 0.75rem 0;
}
.chain-ticker-track {
  display: flex;
  gap: 3rem;
  width: max-content;
  animation: ticker-scroll 50s linear infinite;
}
.chain-ticker:hover .chain-ticker-track {
  animation-play-state: paused;
}
.chain-ticker-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
  font-family: var(--font-family-mono);
  font-size: 0.8rem;
  color: var(--color-fg-secondary, rgba(255,255,255,0.55));
}
.chain-ticker-item .t-label {
  color: var(--color-fg-muted, rgba(255,255,255,0.3));
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 0.65rem;
}
.chain-ticker-item .t-val {
  color: var(--color-fg-primary, rgba(255,255,255,0.85));
  font-weight: 500;
}
@keyframes ticker-scroll {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .chain-ticker-track { animation: none; }
}
`;

interface TickerItem {
  label: string;
  value: string;
}
const ITEMS: TickerItem[] = [
  { label: "Network", value: "Sui Testnet" },
  { label: "On-chain weight", value: "grams (u64)" },
  { label: "Integrity", value: "SHA-256" },
  { label: "Telemetry", value: "AES-256-GCM" },
  { label: "Nonce", value: "96-bit unique" },
  { label: "Wallet challenge", value: "single use" },
  { label: "Cache TTL", value: "600 seconds" },
  { label: "Lifecycle", value: "4 explicit states" },
  { label: "Verification", value: "fail closed" },
  { label: "Asset model", value: "traceability only" },
];

function Row() {
  return (
    <>
      {ITEMS.map((it, i) => (
        <div className="chain-ticker-item" key={i}>
          <span className="t-label">{it.label}</span>
          <span className="t-val">{it.value}</span>
        </div>
      ))}
    </>
  );
}

export function ChainTicker() {
  const [inView, ref] = useInView({ threshold: 0.1 });
  return (
    <>
      <style>{tickerCSS}</style>
      <div
        ref={ref}
        className={`chain-ticker${inView ? " in-view" : ""}`}
        style={inView ? {} : { opacity: 0 }}
        role="region"
        aria-label="TerraNode design facts"
      >
        <div className="chain-ticker-track">
          <Row />
          <Row />
        </div>
      </div>
    </>
  );
}
