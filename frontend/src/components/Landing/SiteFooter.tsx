import { Link } from "react-router-dom";

const footerCSS = `
.site-footer {
  position: relative; z-index: 2;
  border-top: 1px solid var(--color-border-primary, rgba(255,255,255,0.06));
  padding: 4rem 0 2rem;
  background: rgba(2,6,16,0.6);
}
.footer-grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 2rem;
}
@media (max-width: 768px) {
  .footer-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .footer-grid { grid-template-columns: 1fr; }
}
.footer-brand-name {
  font-family: var(--font-family-display);
  font-size: var(--font-size-lg);
  font-weight: 700;
  letter-spacing: 0.04em;
}
.footer-desc {
  font-size: 0.875rem;
  color: var(--color-fg-secondary);
  margin-top: 0.75rem;
  max-width: 18rem;
}
.footer-built {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1.25rem;
  padding: 0.4rem 0.85rem;
  border-radius: var(--radius-full);
  background: rgba(6,182,212,0.08);
  border: 1px solid rgba(6,182,212,0.18);
  font-size: 0.75rem;
  font-family: var(--font-family-mono);
  color: var(--color-secondary);
  letter-spacing: 0.03em;
}
.footer-col h4 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-fg-muted);
  margin-bottom: 1rem;
  font-weight: 600;
}
.footer-col ul {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 0.6rem;
}
.footer-col a {
  font-size: 0.875rem;
  color: var(--color-fg-secondary);
  text-decoration: none;
  transition: color var(--transition-fast);
}
.footer-col a:hover { color: var(--color-fg-primary); }
.footer-bottom {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border-primary, rgba(255,255,255,0.04));
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}
.footer-copy {
  font-size: 0.8125rem;
  color: var(--color-fg-muted);
}
.footer-socials {
  display: flex;
  gap: 0.75rem;
}
.footer-socials a {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem; height: 2.25rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border-primary);
  color: var(--color-fg-secondary);
  text-decoration: none;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.footer-socials a:hover {
  color: var(--color-fg-primary);
  border-color: var(--color-border-secondary);
}
`;

export function SiteFooter() {
  return (
    <>
      <style>{footerCSS}</style>
      <footer className="site-footer" role="contentinfo">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-name text-gradient-emerald">TerraNode</div>
              <p className="footer-desc">
                Agricultural supply chain provenance on Sui. Trace. Verify. Trust.
              </p>
              <div className="footer-built">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="12" r="8"/></svg>
                Built on Sui Network
              </div>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><Link to="/register">Get Started</Link></li>
                <li><Link to="/login">Sign in</Link></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#roles">Roles</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Blockchain</h4>
              <ul>
                <li><a href="https://suiexplorer.com" target="_blank" rel="noopener noreferrer">Sui Explorer</a></li>
                <li><a href="https://docs.sui.io" target="_blank" rel="noopener noreferrer">Sui Docs</a></li>
                <li><a href="https://faucet.sui.io" target="_blank" rel="noopener noreferrer">Testnet Faucet</a></li>
                <li><a href="https://github.com/MystenLabs/sui" target="_blank" rel="noopener noreferrer">GitHub</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#how-it-works">About</a></li>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
                <li><a href="mailto:hello@terranode.io">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© {new Date().getFullYear()} TerraNode. All rights reserved.</div>
            <div className="footer-socials">
              {/* X/Twitter */}
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* GitHub */}
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              </a>
              {/* Discord */}
              <a href="https://discord.com" target="_blank" rel="noopener noreferrer" aria-label="Discord">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
