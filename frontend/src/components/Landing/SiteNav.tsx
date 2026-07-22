import { useState, useEffect, type FC, type ReactNode } from "react";
import { Link } from "react-router-dom";
import styles from "../../pages/Landing/LandingPage.css?inline";

/* floating header — no full-width bar, just a transparent pill that lives on top */
const navCSS = `
.floating-nav {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 48px);
  max-width: 72rem;
  padding: 10px 8px 10px 20px;
  border-radius: 9999px;
  border: 1px solid rgba(51, 65, 85, 0.45);
  background: rgba(10, 15, 26, 0.55);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow: 0 8px 32px -12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}
.floating-nav.scrolled {
  background: rgba(10, 15, 26, 0.8);
  border-color: rgba(34, 211, 238, 0.18);
  box-shadow: 0 12px 40px -14px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(34, 211, 238, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.floating-nav-left {
  display: flex;
  align-items: center;
  gap: 2.5rem;
}
.floating-brand {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  text-decoration: none;
  color: #f1f5f9;
  flex-shrink: 0;
}
.floating-brand svg { flex-shrink: 0; }
.floating-brand-name {
  font-family: "Space Grotesk", sans-serif;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.floating-links {
  display: none;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.floating-links a {
  color: #94a3b8;
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 9999px;
  transition: color 0.2s ease, background 0.2s ease;
  letter-spacing: 0.01em;
  font-family: "Outfit", system-ui, sans-serif;
  white-space: nowrap;
}
.floating-links a:hover {
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.04);
}
.floating-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.launch-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 9999px;
  font-family: "Space Grotesk", sans-serif;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-decoration: none;
  color: #0a0f1a;
  background: linear-gradient(135deg, #22d3ee, #06b6d4);
  border: none;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  white-space: nowrap;
}
.launch-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px -8px rgba(34, 211, 238, 0.45);
}
.launch-btn svg {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
}
.launch-btn:hover svg { transform: translateX(2px); }
.nav-mobile-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid rgba(51, 65, 85, 0.5);
  border-radius: 9999px;
  color: #94a3b8;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
}
.nav-mobile-toggle:hover {
  color: #e2e8f0;
  border-color: rgba(148, 163, 184, 0.4);
}
@media (min-width: 768px) {
  .floating-links { display: flex; }
  .nav-mobile-toggle { display: none; }
}
@media (max-width: 767px) {
  .floating-nav {
    top: 10px;
    width: calc(100% - 24px);
    padding: 8px 10px 8px 16px;
    border-radius: 20px;
  }
  .floating-links.mobile-open {
    display: flex;
    flex-direction: column;
    position: absolute;
    top: 110%;
    left: 0;
    right: 0;
    background: rgba(10, 15, 26, 0.96);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(51, 65, 85, 0.5);
    border-radius: 18px;
    padding: 10px;
    gap: 4px;
    box-shadow: 0 20px 50px -16px rgba(0, 0, 0, 0.7);
  }
  .floating-links.mobile-open a {
    padding: 10px 16px;
    border-radius: 12px;
    font-size: 0.9375rem;
  }
  .launch-btn { padding: 7px 14px; font-size: 0.75rem; }
}
`;

interface SiteNavProps {
  children?: ReactNode;
}

export const SiteNav: FC<SiteNavProps> = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", fn, { passive: true });
    fn();
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <style>{navCSS}</style>
      <nav className={`floating-nav${scrolled ? " scrolled" : ""}`} role="navigation" aria-label="Main">
        <div className="floating-nav-left">
          <Link to="/" className="floating-brand" aria-label="TerraNode home">
            <svg width="26" height="26" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14 2L3 8.5V19.5L14 26L25 19.5V8.5L14 2Z" stroke="url(#cube-grad2)" strokeWidth="1.75" fill="none"/>
              <path d="M14 12L3 6V19.5L14 26V12Z" fill="url(#cube-grad-fill2)" opacity=".35"/>
              <path d="M14 12L25 6V19.5L14 26V12Z" fill="url(#cube-grad-fill2-2)" opacity=".25"/>
              <path d="M3 8.5L14 14.5L25 8.5" stroke="url(#cube-grad2)" strokeWidth="1.5" strokeLinecap="round"/>
              <defs>
                <linearGradient id="cube-grad2" x1="3" y1="2" x2="25" y2="26"><stop stopColor="#34D399"/><stop offset="1" stopColor="#06B6D4"/></linearGradient>
                <linearGradient id="cube-grad-fill2" x1="3" y1="6" x2="14" y2="26"><stop stopColor="#10B981"/><stop offset="1" stopColor="#059669" stopOpacity="0"/></linearGradient>
                <linearGradient id="cube-grad-fill2-2" x1="25" y1="6" x2="14" y2="26"><stop stopColor="#06B6D4"/><stop offset="1" stopColor="#0891B2" stopOpacity="0"/></linearGradient>
              </defs>
            </svg>
            <span className="floating-brand-name text-gradient-emerald">TerraNode</span>
          </Link>

          <ul className={`floating-links${mobileOpen ? " mobile-open" : ""}`}>
            <li><a href="#features">Features</a></li>
            <li><a href="#how-it-works">How it Works</a></li>
            <li><a href="#roles">Roles</a></li>
            <li><a href="https://suiexplorer.com" target="_blank" rel="noopener noreferrer">Chain</a></li>
          </ul>
        </div>

        <div className="floating-actions">
          <Link to="/login" className="launch-btn" style={{ background: "transparent", color: "#94a3b8", boxShadow: "none" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#e2e8f0"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "transparent"; }}
          >Sign in</Link>
          <Link to="/register" className="launch-btn">
            Launch App
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </Link>
          <button
            className="nav-mobile-toggle"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
