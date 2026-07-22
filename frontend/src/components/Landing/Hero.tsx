import { useInView } from "../../hooks";
import { Button } from "../Common";

const heroCSS = `
.hero {
  position: relative;
  z-index: 2;
  padding: 8rem 0 5rem;
  text-align: center;
}
.hero-inner {
  max-width: 48rem;
  margin: 0 auto;
  padding: 0 1rem;
}
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.9rem;
  border-radius: var(--radius-full);
  background: rgba(16,185,129,0.1);
  border: 1px solid rgba(16,185,129,0.2);
  font-size: 0.75rem;
  font-family: var(--font-family-mono);
  color: var(--color-emerald-400);
  letter-spacing: 0.03em;
  animation: pulse-dot 2.5s ease-in-out infinite;
}
.hero-badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-emerald-400);
}
@keyframes pulse-dot {
  0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
  50% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
}
.hero h1 {
  font-family: var(--font-family-display);
  font-size: clamp(2rem, 5.5vw, 3.25rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin-top: 1.5rem;
}
.hero-sub {
  font-size: 1.1rem;
  color: var(--color-fg-secondary);
  max-width: 36rem;
  margin: 1.25rem auto 2rem;
  line-height: 1.7;
}
.hero-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}
.hero-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.75rem;
  flex-wrap: wrap;
  margin-top: 2.5rem;
  font-size: 0.8rem;
  color: var(--color-fg-muted);
}
.hero-trust-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.hero-trust-item svg {
  opacity: 0.5;
}
.hero-scroll {
  margin-top: 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--color-fg-muted);
  letter-spacing: 0.05em;
}
.hero-scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, var(--color-border-secondary), transparent);
  animation: scroll-pulse 2s ease-in-out infinite;
}
@keyframes scroll-pulse {
  0%,100% { opacity: 0.4; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-badge { animation: none; }
  .hero-scroll-line { animation: none; }
}
`;

export function Hero() {
  const [inView, ref] = useInView({ threshold: 0.1 });
  return (
    <>
      <style>{heroCSS}</style>
      <section ref={ref} className={`hero${inView ? " in-view" : ""}`} aria-labelledby="hero-heading">
        <div className="hero-inner">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            LIVE ON SUI TESTNET · Block #14,832,561
          </div>
          <h1 id="hero-heading">
            Farm-to-table <br />
            provenance, <br />
            <span className="text-gradient-emerald">on-chain.</span>
          </h1>
          <p className="hero-sub">
            TerraNode links every harvest batch to an immutable Sui ledger. From IoT
            telemetry to yield predictions to custody handoffs — the whole supply
            chain, verified.
          </p>
          <div className="hero-actions">
            <a href="/register"><Button variant="primary" size="lg">Start minting batches →</Button></a>
            <a href="#how-it-works"><Button variant="outline" size="lg">See how it works</Button></a>
          </div>
          <div className="hero-trust" aria-label="Trust indicators">
            <div className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              SHA-256 Hashed
            </div>
            <div className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              Non-custodial
            </div>
            <div className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ~200ms finality
            </div>
            <div className="hero-trust-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/></svg>
              Testnet · Free
            </div>
          </div>
          <div className="hero-scroll" aria-hidden="true">
            <span>SCROLL</span>
            <div className="hero-scroll-line" />
          </div>
        </div>
      </section>
    </>
  );
}