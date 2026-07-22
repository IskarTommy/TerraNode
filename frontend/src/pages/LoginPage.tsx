import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/* ═══════════════════════════════════════════════════════════════════════════════
   KEYFRAMES & GLOBAL STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */
function GlobalStyles() {
  return (
    <style>{`
      @keyframes float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-14px); }
      }
      @keyframes dot-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,0.5); }
        50%     { box-shadow: 0 0 14px 5px rgba(34,211,238,0.22); }
      }
      @keyframes badge-glow {
        0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,0); }
        50%     { box-shadow: 0 0 16px 4px rgba(34,211,238,0.15); }
      }
      @keyframes fade-up {
        from { opacity: 0; transform: translateY(28px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      *:focus-visible { outline: 2px solid rgba(34,211,238,0.55); outline-offset: 3px; border-radius: 6px; }
      ::selection { background: rgba(34,211,238,0.3); color: #f1f5f9; }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   EYE ICON
   ═══════════════════════════════════════════════════════════════════════════════ */
function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/farmer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* responsive columns: 1fr on mobile, 1fr 1fr on desktop */
  const [cols, setCols] = useState("1fr");
  useEffect(() => {
    const update = () => setCols(window.innerWidth >= 768 ? "1fr 1fr" : "1fr");
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
        minHeight: "100svh",
        background: "#0a0f1a",
        color: "#e2e8f0",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <GlobalStyles />

      {/* ─── ATMOSPHERE ────────────────────────────────────── */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 45% at 20% 20%, rgba(34,211,238,0.09) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(251,191,36,0.05) 0%, transparent 55%), #0a0f1a`,
      }} />

      {/* Grid overlay */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(34,211,238,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.025) 1px, transparent 1px)",
        backgroundSize: "68px 68px",
        maskImage: "radial-gradient(ellipse 85% 65% at center, black 18%, transparent 65%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 65% at center, black 18%, transparent 65%)",
      }} />

      {/* Floating orbs */}
      <div aria-hidden="true" style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        width: 520, height: 520, top: -200, left: -160,
        borderRadius: "50%", filter: "blur(130px)", background: "#22d3ee", opacity: 0.14,
        animation: "float 22s ease-in-out infinite",
      }} />
      <div aria-hidden="true" style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        width: 400, height: 400, bottom: -160, right: -130,
        borderRadius: "50%", filter: "blur(110px)", background: "#fbbf24", opacity: 0.10,
        animation: "float 28s ease-in-out infinite", animationDelay: "-11s",
      }} />
      <div aria-hidden="true" style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        width: 300, height: 300, top: "38%", left: "44%",
        borderRadius: "50%", filter: "blur(100px)", background: "#8b5cf6", opacity: 0.07,
        animation: "float 32s ease-in-out infinite", animationDelay: "-18s",
      }} />

            {/* ─── HORIZONTAL SPLIT ─────────────────────────────── */}
      <main style={{
        position: "relative", zIndex: 10,
        display: "grid",
        gridTemplateColumns: cols,
        height: "100vh",
      }}>
        {/* ── LEFT — Branding panel ── */}
        <div style={{
          position: "relative", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "clamp(24px, 4vh, 48px) clamp(28px, 5vw, 52px) 16px",
          background: `linear-gradient(160deg, rgba(34,211,238,0.05) 0%, rgba(10,15,26,0.98) 55%),
            radial-gradient(ellipse 55% 55% at 40% 35%, rgba(34,211,238,0.04) 0%, transparent 60%)`,
          overflowY: "auto",
        }}>
 <Link to="/" style={{
  position: "absolute", top: 20, left: 22, zIndex: 30,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 19, fontWeight: 700,
  color: "#22d3ee", textDecoration: "none", letterSpacing: "-0.02em",
  display: "inline-flex", alignItems: "center", gap: 9,
 }}>
  <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
   <path d="M16 2L4 8v8c0 7.7 5.1 14.9 12 17 6.9-2.1 12-9.3 12-17V8L16 2z" stroke="#22d3ee" strokeWidth="1.8"/>
   <path d="M12 16l3 3 6-6" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
  TerraNode
 </Link>
          {/* Scan-line texture */}
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(34,211,238,0.013) 3px, rgba(34,211,238,0.013) 4px)",
          }} />

          <div style={{ position: "relative", zIndex: 2, paddingTop: 96, }}>
            {/* Badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 9,
              padding: "7px 16px", borderRadius: 100,
              background: "rgba(34,211,238,0.09)", border: "1px solid rgba(34,211,238,0.22)",
              fontFamily: "'Space Grotesk', sans-serif", fontSize: 12.5, fontWeight: 500,
              color: "#67e8f9", letterSpacing: "0.03em", marginBottom: 24,
            }}>
              <span style={{
                width: 7, height: 7, borderRadius: "50%", background: "#22d3ee",
                boxShadow: "0 0 8px #22d3ee", animation: "dot-pulse 2s ease-in-out infinite",
              }} />
              Sui Blockchain
            </span>

            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700,
              lineHeight: 1.08, letterSpacing: "-0.03em", color: "#f1f5f9", marginBottom: 14,
            }}>
              Agricultural<span style={{ color: "#22d3ee" }}> provenance</span>,<br />
              <span style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>redefined.</span>
            </h1>

            <p style={{
              fontSize: 14.5, lineHeight: 1.65, color: "rgba(148,163,184,0.78)", maxWidth: 300,
            }}>
              Every batch, every handoff, every sensor reading — immutably recorded on Sui. Trust the data, verify the source.
            </p>
          </div>

          {/* Bottom: trace timeline + stats */}
          <div style={{ position: "relative", zIndex: 2, paddingTop: 28 }}>
            {/* Trace card */}
            <div style={{
              borderRadius: 18, padding: "20px 22px",
              background: "rgba(10,15,26,0.45)", border: "1px solid rgba(51,65,85,0.3)",
              marginBottom: 20,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 10.5, fontWeight: 600,
                  color: "rgba(148,163,184,0.4)", letterSpacing: "0.07em",
                }}>BATCH TRACE</span>
                <span style={{
                  fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 500,
                  color: "#22d3ee", opacity: 0.75,
                }}>BTH-0047</span>
              </div>

              {/* 4-step timeline */}
              <div style={{ position: "relative" }}>
                {[
                  { label: "Farm", on: true },
                  { label: "Hub", on: true },
                  { label: "Cold Storage", on: true },
                  { label: "Retail", on: false },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    position: "relative", zIndex: 2, width: "100%",
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: s.on ? "#22d3ee" : "rgba(51,65,85,0.55)",
                      boxShadow: s.on ? "0 0 10px rgba(34,211,238,0.45)" : "none",
                    }} />
                    <span style={{
                      fontSize: 11, fontWeight: 500, marginTop: 7,
                      color: s.on ? "#94a3b8" : "rgba(100,116,139,0.4)",
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}>{s.label}</span>
                  </div>
                ))}
                {/* Connector line */}
                <div style={{
                  position: "absolute", top: 4.5, left: "calc(12.5% + 5px)", right: "calc(12.5% + 5px)",
                  height: 1,
                  background: "linear-gradient(90deg, rgba(34,211,238,0.5), rgba(34,211,238,0.12))",
                }} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { value: "12.4K", suffix: "batches", accent: "#22d3ee" },
                { value: "99.98%", suffix: "uptime", accent: "#fbbf24" },
              ].map(({ value, suffix, accent }) => (
                <div key={suffix}>
                  <span style={{
                    fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700,
                    color: accent, letterSpacing: "-0.02em", lineHeight: 1,
                  }}>{value}</span>
                  <span style={{
                    fontSize: 12, color: "rgba(100,116,139,0.55)", display: "block", marginTop: 4,
                  }}>{suffix}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT — Form panel ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "clamp(24px, 5vh, 48px) clamp(24px, 5vw, 48px)",
          background: "#0a0f1a", position: "relative", zIndex: 2,
        }}>
 <Link to="/register" style={{
  position: "absolute", top: 22, right: 22, zIndex: 30,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
  color: "#22d3ee", textDecoration: "none", letterSpacing: "-0.01em",
 }}
  onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
  onMouseLeave={(e) => (e.currentTarget.style.color = "#22d3ee")}
 >Create Account</Link>
          <div style={{
            width: "100%", maxWidth: 400,
            animation: "fade-up 0.75s ease-out both",
          }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700,
                letterSpacing: "-0.02em", color: "#f1f5f9", marginBottom: 6,
              }}>Sign in</h2>
              <p style={{ fontSize: 14.5, color: "rgba(148,163,184,0.7)", lineHeight: 1.55 }}>
                Access your dashboard and supply chain data.
              </p>
            </div>

            {error && (
              <div style={{
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5", fontSize: 13.5, marginBottom: 20,
              }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Email */}
              <div>
                <label htmlFor="email" style={{
                  display: "block", fontSize: 13, fontWeight: 500,
                  color: "#94a3b8", marginBottom: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>Email address</label>
                <input
                  type="email" id="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  autoComplete="email" placeholder="farmer@terranode.io"
                  style={{
                    width: "100%", height: 48, padding: "0 16px", borderRadius: 12,
                    background: "rgba(10,15,26,0.55)", border: "1px solid rgba(51,65,85,0.7)",
                    color: "#f1f5f9", fontSize: 14,
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#22d3ee";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.1), 0 0 20px -6px rgba(34,211,238,0.15)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(51,65,85,0.7)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{
                  display: "block", fontSize: 13, fontWeight: 500,
                  color: "#94a3b8", marginBottom: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>Password</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPw ? "text" : "password"} id="password" value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    autoComplete="current-password" placeholder="Enter your password"
                    style={{
                      width: "100%", height: 48, padding: "0 48px 0 16px", borderRadius: 12,
                      background: "rgba(10,15,26,0.55)", border: "1px solid rgba(51,65,85,0.7)",
                      color: "#f1f5f9", fontSize: 14,
                      fontFamily: "'Outfit', system-ui, sans-serif",
                      outline: "none", boxSizing: "border-box",
                      transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#22d3ee";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.1), 0 0 20px -6px rgba(34,211,238,0.15)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(51,65,85,0.7)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer",
                      color: showPw ? "#22d3ee" : "rgba(100,116,139,0.5)", padding: 4,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
              </div>

              {/* Remember / Forgot */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13, marginTop: 2,
              }}>
                <label style={{
                  display: "inline-flex", alignItems: "center", gap: 9, cursor: "pointer",
                  color: "rgba(148,163,184,0.85)", fontFamily: "'Space Grotesk', sans-serif",
                }}>
                  <input type="checkbox" style={{
                    width: 15, height: 15, borderRadius: 4, accentColor: "#22d3ee", cursor: "pointer",
                  }} />
                  Remember me
                </label>
                <a href="#" style={{
                  fontSize: 13, color: "#22d3ee", textDecoration: "none",
                  fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
                  transition: "color 0.2s ease",
                }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#22d3ee")}
                >
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: "100%", height: 50, borderRadius: 14,
                  background: loading ? "linear-gradient(135deg, #22d3ee, #06b6d4)" : "linear-gradient(135deg, #22d3ee, #0891b2)",
                  color: "#0a0f1a", border: "none", fontSize: 14.5, fontWeight: 600,
                  cursor: loading ? "wait" : "pointer", opacity: loading ? 0.65 : 1,
                  fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em",
                  marginTop: 4,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 36px -10px rgba(34,211,238,0.45)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16, margin: "24px 0 20px",
            }}>
              <div style={{ flex: 1, height: 1, background: "rgba(51,65,85,0.5)" }} />
              <span style={{
                fontSize: 12, color: "rgba(100,116,139,0.45)",
                fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap",
              }}>or continue with</span>
              <div style={{ flex: 1, height: 1, background: "rgba(51,65,85,0.5)" }} />
            </div>

            {/* Social buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <SuiWalletButton />
              <GoogleButton label="Google" />
            </div>

            {/* Sign up */}
            <p style={{
              textAlign: "center", fontSize: 14, color: "rgba(148,163,184,0.8)", marginTop: 28,
            }}>
              Don't have an account?{" "}
              <Link to="/register" style={{
                color: "#22d3ee", textDecoration: "none", fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "color 0.2s ease",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#22d3ee")}
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SOCIAL BUTTONS
   ═══════════════════════════════════════════════════════════════════════════════ */
function brandBtnBase(extra: Record<string, string> = {}) {
  return {
    height: 48, borderRadius: 12,
    background: "rgba(30,41,59,0.35)",
    border: "1px solid rgba(51,65,85,0.55)",
    color: "#e2e8f0", fontSize: 13.5, fontWeight: 500,
    cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
    transition: "border-color 0.25s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
    ...extra,
  };
}

function SuiWalletButton() {
  return (
    <button
      type="button"
      style={brandBtnBase()}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "#22d3ee";
        el.style.background = "rgba(34,211,238,0.06)";
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow = "0 4px 16px -6px rgba(34,211,238,0.2)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "rgba(51,65,85,0.55)";
        el.style.background = "rgba(30,41,59,0.35)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M4.5 12.5l7-7 7 7-7 7z" fill="#22d3ee"/>
        <path d="M11.5 5.5l7 7-7 7-7-7z" fill="#06b6d4" opacity="0.7"/>
      </svg>
      Sui Wallet
    </button>
  );
}

function GoogleButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      style={brandBtnBase()}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "rgba(148,163,184,0.3)";
        el.style.background = "rgba(30,41,59,0.55)";
        el.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "rgba(51,65,85,0.55)";
        el.style.background = "rgba(30,41,59,0.35)";
        el.style.transform = "translateY(0)";
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  );
}
