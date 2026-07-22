import { Button } from "../Common";
import { useInView } from "../../hooks";

const bannerCSS = `
.cta-banner {
  position: relative;
  z-index: 2;
  padding: 5rem 0;
  text-align: center;
  overflow: hidden;
}
.cta-banner::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 60% at 50% 110%, rgba(16,185,129,0.14) 0%, transparent 65%),
    radial-gradient(ellipse 50% 50% at 50% -5%, rgba(6,182,212,0.10) 0%, transparent 55%);
  pointer-events: none;
}
.cta-banner .container { position: relative; }
.cta-banner h2 {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  margin-bottom: 1rem;
}
.cta-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 2rem;
}
`;

export function CtaBanner() {
  const [inView, ref] = useInView({ threshold: 0.15 });
  return (
    <>
      <style>{bannerCSS}</style>
      <section
        ref={ref}
        className={`cta-banner${inView ? " in-view" : ""}`}
        style={inView ? {} : { opacity: 0 }}
        aria-label="Get started"
      >
        <div className="container">
          <h2 className="text-heading-lg">
            Ready to go <span className="text-gradient-emerald">on-chain?</span>
          </h2>
          <p className="text-body-lg text-fg-secondary" style={{ maxWidth: "34rem", margin: "0.75rem auto 0" }}>
            Join hundreds of farmers and logistics partners already proving provenance with TerraNode.
          </p>
          <div className="cta-actions">
            <a href="/register"><Button variant="primary" size="lg">Start minting batches →</Button></a>
            <a href="#how-it-works"><Button variant="outline" size="lg">See how it works</Button></a>
          </div>
        </div>
      </section>
    </>
  );
}
