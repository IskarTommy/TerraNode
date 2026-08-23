import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ShieldCheck, Wifi, ArrowRightLeft, ScanSearch } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Logo } from "../components/Logo";
import { ConnectModal, useCurrentAccount } from '@mysten/dapp-kit';

/* ═══════════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */
function GlobalStyles() {
  return (
    <style>{`
      @keyframes float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-12px); }
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
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important; }
      }
    `}</style>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function RegisterPage() {
  const location = useLocation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("FARMER");
  const [suiPublicKey, setSuiPublicKey] = useState(location.state?.sui_public_key || "");
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  
  const currentAccount = useCurrentAccount();
  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentAccount?.address) {
      setSuiPublicKey(currentAccount.address);
      setIsConnectOpen(false);
    }
  }, [currentAccount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) { setError("Please accept the Terms of Service."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError("");
    setLoading(true);
    try {
      await register({ full_name: fullName, email, password, role: role as "FARMER" | "LOGISTICS" | "ADMIN", sui_public_key: suiPublicKey || undefined });
      navigate("/farmer/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const [cols, setCols] = useState("1fr");
  useEffect(() => {
    const update = () => setCols(window.innerWidth >= 768 ? "1fr 1fr" : "1fr");
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return (
    <div style={{
      fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
      minHeight: "100svh", background: "#0a0f1a", color: "#e2e8f0",
      overflow: "hidden", position: "relative",
    }}>
      <GlobalStyles />

      {/* ─── ATMOSPHERE ─────────────────────────────────────── */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 65% 45% at 30% 15%, rgba(34,211,238,0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 70% 85%, rgba(251,191,36,0.04) 0%, transparent 55%), #0a0f1a`,
      }} />
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(34,211,238,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.022) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "radial-gradient(ellipse 80% 65% at center, black 15%, transparent 68%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 65% at center, black 15%, transparent 68%)",
      }} />

      {/* Floating orbs */}
      <div aria-hidden="true" style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        width: 440, height: 440, top: -130, left: -100,
        borderRadius: "50%", filter: "blur(100px)", background: "#22d3ee", opacity: 0.13,
        animation: "float 20s ease-in-out infinite",
      }} />
      <div aria-hidden="true" style={{
        position: "fixed", zIndex: 1, pointerEvents: "none",
        width: 320, height: 320, bottom: -80, right: -60,
        borderRadius: "50%", filter: "blur(85px)", background: "#fbbf24", opacity: 0.09,
        animation: "float 24s ease-in-out infinite", animationDelay: "-8s",
      }} />

            {/* ─── HORIZONTAL SPLIT ───────────────────────────────── */}
      <main style={{
        position: "relative", zIndex: 10,
        display: "grid", gridTemplateColumns: cols,
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
 <Link to="/" className="inline-flex items-center gap-2 no-underline" style={{ position: "absolute", top: 20, left: 22, zIndex: 30 }}>
  <Logo size={26} showText={true} />
</Link>
          {/* Glow accent line on top */}
          <div aria-hidden="true" style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: "60%", height: 1,
            background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.25), transparent)",
            animation: "badge-glow 4s ease-in-out infinite",
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
                width: 7, height: 7, borderRadius: "50%", background: "#fb923c",
                boxShadow: "0 0 8px #fb923c", animation: "badge-glow 2.5s ease-in-out infinite",
              }} />
              Join the Network
            </span>

            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)", fontWeight: 700,
              lineHeight: 1.08, letterSpacing: "-0.03em", color: "#f1f5f9", marginBottom: 14,
            }}>
              Start your<br />
              <span style={{
                background: "linear-gradient(135deg, #22d3ee, #06b6d4)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>supply chain</span><br />
              <span style={{
                background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>journey</span>
            </h1>

            <p style={{
              fontSize: 14.5, lineHeight: 1.65, color: "rgba(148,163,184,0.78)", maxWidth: 300,
            }}>
              Register as a farmer, logistics provider, or auditor and start building provable provenance records.
            </p>
          </div>

          {/* Feature chips */}
          <div style={{ position: "relative", zIndex: 2, display: "flex", flexWrap: "wrap", gap: 10 }}>
            {[
              { icon: "ShieldCheck", text: "Blockchain secured" },
      { icon: "Wifi", text: "IoT on-chain" },
      { icon: "ArrowRightLeft", text: "Custody transfers" },
      { icon: "ScanSearch", text: "End-to-end trace" },
            ].map((f) => (
              <span key={f.text} style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "7px 14px", borderRadius: 100,
                background: "rgba(30,41,59,0.45)", border: "1px solid rgba(51,65,85,0.35)",
                fontSize: 12.5, fontWeight: 500, color: "#94a3b8",
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                <IconSpan name={f.icon} />
                {f.text}
              </span>
            ))}
          </div>
        </div>

        {/* ── RIGHT — Form panel ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "clamp(24px, 5vh, 48px) clamp(24px, 5vw, 48px)",
          background: "#0a0f1a", position: "relative", zIndex: 2,
        }}>
 <Link to="/login" style={{
  position: "absolute", top: 22, right: 22, zIndex: 30,
  fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600,
  color: "#22d3ee", textDecoration: "none", letterSpacing: "-0.01em",
 }}
  onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
  onMouseLeave={(e) => (e.currentTarget.style.color = "#22d3ee")}
 >Sign in</Link>
          <div style={{
            width: "100%", maxWidth: 420,
            animation: "fade-up 0.75s ease-out both",
          }}>
            <div style={{ marginBottom: 32 }}>
              <h2 style={{
                fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700,
                letterSpacing: "-0.02em", color: "#f1f5f9", marginBottom: 6,
              }}>Create your account</h2>
              <p style={{ fontSize: 14.5, color: "rgba(148,163,184,0.7)", lineHeight: 1.55 }}>
                Join the TerraNode agricultural provenance network.
              </p>
            </div>

            {error && (
              <div style={{
                padding: "12px 16px", borderRadius: 12,
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5", fontSize: 13.5, marginBottom: 20,
              }}>{error}</div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {suiPublicKey && (
                <div style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22d3ee", boxShadow: "0 0 8px #22d3ee" }} />
                  <span style={{ fontSize: 13.5, color: "#e2e8f0", fontFamily: "'Space Grotesk', sans-serif" }}>
                    Wallet linked: <span style={{ color: "#22d3ee" }}>{suiPublicKey.slice(0, 6)}...{suiPublicKey.slice(-4)}</span>
                  </span>
                  <button type="button" onClick={() => setSuiPublicKey("")} style={{
                    background: "none", border: "none", color: "#94a3b8", cursor: "pointer", marginLeft: "auto",
                  }}>×</button>
                </div>
              )}
              {/* Full name */}
              <InputField label="Full name" id="fullName" type="text"
                value={fullName} onChange={setFullName} placeholder="Jane Doe" autoComplete="name" />

              {/* Email */}
              <InputField label="Email address" id="email" type="email"
                value={email} onChange={setEmail} placeholder="farmer@terranode.io" autoComplete="email" />

              {/* Password */}
              <InputField label="Password" id="password" type={showPw ? "text" : "password"}
                value={password} onChange={setPassword}
                placeholder="Min. 8 characters" autoComplete="new-password"
                suffix={
                  <PwToggle showPw={showPw} onToggle={() => setShowPw((v) => !v)} />
                }
              />

              {/* Role selector */}
              <div>
                <label htmlFor="role" style={{
                  display: "block", fontSize: 13, fontWeight: 500,
                  color: "#94a3b8", marginBottom: 8,
                  fontFamily: "'Space Grotesk', sans-serif",
                }}>Role</label>
                <div style={{ position: "relative" }}>
                  <select id="role" value={role} onChange={(e) => setRole(e.target.value)} style={{
                    width: "100%", height: 48, padding: "0 42px 0 16px", borderRadius: 12,
                    background: "rgba(10,15,26,0.55)", border: "1px solid rgba(51,65,85,0.7)",
                    color: "#f1f5f9", fontSize: 14,
                    fontFamily: "'Outfit', system-ui, sans-serif",
                    outline: "none", boxSizing: "border-box", appearance: "none",
                    WebkitAppearance: "none", cursor: "pointer",
                    transition: "border-color 0.25s ease, box-shadow 0.25s ease",
                  }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "#22d3ee";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.1)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "rgba(51,65,85,0.7)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <option value="FARMER">Farmer</option>
                    <option value="LOGISTICS">Logistics Provider</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  <div style={{
                    position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                    pointerEvents: "none", color: "rgba(100,116,139,0.6)",
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <label style={{
                display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer",
                fontSize: 13.5, color: "rgba(148,163,184,0.8)", lineHeight: 1.5,
                fontFamily: "'Space Grotesk', sans-serif",
              }}>
                <input
                  type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
                  style={{ width: 15, height: 15, borderRadius: 4, accentColor: "#22d3ee", cursor: "pointer", marginTop: 1, flexShrink: 0 }}
                />
                <span>
                  I agree to the{" "}
                  <a href="#" onClick={(e) => e.preventDefault()} style={{
                    color: "#22d3ee", textDecoration: "none", fontWeight: 500,
                  }}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" onClick={(e) => e.preventDefault()} style={{
                    color: "#22d3ee", textDecoration: "none", fontWeight: 500,
                  }}>Privacy Policy</a>.
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: "100%", height: 48, borderRadius: 12,
                  background: loading ? "linear-gradient(135deg, #22d3ee, #06b6d4)" : "linear-gradient(135deg, #22d3ee, #0891b2)",
                  color: "#0a0f1a", border: "none", fontSize: 14, fontWeight: 600,
                  cursor: loading ? "wait" : "pointer", opacity: loading ? 0.65 : 1,
                  fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "-0.01em",
                  marginTop: 4,
                  transition: "transform 0.3s ease, box-shadow 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 14px 32px -10px rgba(34,211,238,0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                }}
              >
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>

            {/* Social auth */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "24px 0 20px" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(51,65,85,0.5)" }} />
              <span style={{
                fontSize: 12, color: "rgba(100,116,139,0.45)",
                fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "nowrap",
              }}>or sign up with</span>
              <div style={{ flex: 1, height: 1, background: "rgba(51,65,85,0.5)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {!suiPublicKey && (
                <>
                  <button type="button" style={socialBtnBase()}
                    onClick={() => setIsConnectOpen(true)}
                    onMouseEnter={socialEnter} onMouseLeave={socialLeave}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4.5 12.5l7-7 7 7-7 7z" fill="#22d3ee"/>
                      <path d="M11.5 5.5l7 7-7 7-7-7z" fill="#06b6d4" opacity="0.7"/>
                    </svg>
                    Sui Wallet
                  </button>
                  <ConnectModal
                    trigger={<span style={{ display: 'none' }} />}
                    open={isConnectOpen}
                    onOpenChange={(isOpen) => setIsConnectOpen(isOpen)}
                  />
                </>
              )}
              {suiPublicKey && (
                <div style={{ visibility: "hidden" }} />
              )}
              <GoogleButton />
            </div>

            {/* Sign in */}
            <p style={{
              textAlign: "center", fontSize: 14, color: "rgba(148,163,184,0.8)", marginTop: 28,
            }}>
              Already have an account?{" "}
              <Link to="/login" style={{
                color: "#22d3ee", textDecoration: "none", fontWeight: 600,
                fontFamily: "'Space Grotesk', sans-serif",
                transition: "color 0.2s ease",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#22d3ee")}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════════ */

function socialBtnBase(extra: Record<string, string> = {}) {
  return {
    height: 44, borderRadius: 12,
    background: "rgba(30,41,59,0.35)",
    border: "1px solid rgba(51,65,85,0.6)",
    color: "#e2e8f0", fontSize: 13.5, fontWeight: 500,
    cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "border-color 0.25s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease",
    ...extra,
  };
}
function socialEnter(e: React.MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = "#22d3ee";
  el.style.background = "rgba(34,211,238,0.06)";
  el.style.transform = "translateY(-1px)";
}
function socialLeave(e: React.MouseEvent) {
  const el = e.currentTarget as HTMLElement;
  el.style.borderColor = "rgba(51,65,85,0.6)";
  el.style.background = "rgba(30,41,59,0.35)";
  el.style.transform = "translateY(0)";
}

function GoogleButton({ label = "Google" }: { label?: string }) {
  return (
    <button type="button" style={socialBtnBase()}
      onMouseEnter={socialEnter}
      onMouseLeave={socialLeave}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
      {label}
    </button>
  );
}


function IconSpan({ name }: { name: string }) {
  const s = 14;
  const iconColor = name === "ShieldCheck" ? "#22d3ee" : "#94a3b8";
  switch (name) {
    case "ShieldCheck":
      return <span style={{ color: iconColor, display: "inline-flex", flexShrink: 0, lineHeight: 1 }}><ShieldCheck size={s} strokeWidth={2} /></span>;
    case "Wifi":
      return <span style={{ color: iconColor, display: "inline-flex", flexShrink: 0, lineHeight: 1 }}><Wifi size={s} strokeWidth={2} /></span>;
    case "ArrowRightLeft":
      return <span style={{ color: iconColor, display: "inline-flex", flexShrink: 0, lineHeight: 1 }}><ArrowRightLeft size={s} strokeWidth={2} /></span>;
    case "ScanSearch":
      return <span style={{ color: iconColor, display: "inline-flex", flexShrink: 0, lineHeight: 1 }}><ScanSearch size={s} strokeWidth={2} /></span>;
    default:
      return null;
  }
}

/* Reusable text input to reduce duplication */
function InputField({
  label, id, type, value, onChange, placeholder, autoComplete, suffix,
  required,
}: {
  label: string;
  id: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  suffix?: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} style={{
        display: "block", fontSize: 13, fontWeight: 500,
        color: "#94a3b8", marginBottom: 8,
        fontFamily: "'Space Grotesk', sans-serif",
      }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type={type} id={id} value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required} placeholder={placeholder} autoComplete={autoComplete}
          style={{
            width: "100%", height: 48, padding: suffix ? "0 46px 0 16px" : "0 16px",
            borderRadius: 12, background: "rgba(10,15,26,0.55)",
            border: "1px solid rgba(51,65,85,0.7)", color: "#f1f5f9", fontSize: 14,
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
        {suffix && (
          <div style={{
            position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
          }}>{suffix}</div>
        )}
      </div>
    </div>
  );
}

function PwToggle({ showPw, onToggle }: { showPw: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={showPw ? "Hide password" : "Show password"}
      style={{
        background: "none", border: "none", cursor: "pointer",
        color: showPw ? "#22d3ee" : "rgba(100,116,139,0.5)",
        padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <EyeIcon open={showPw} />
    </button>
  );
}

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
