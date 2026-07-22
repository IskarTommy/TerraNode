import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/Common/Button";
import { Sprout, Cpu, Network, Handshake, Brain, ShieldCheck } from "lucide-react";

// ── Fade-in with fallback ────────────────────────────────────────────────────
function FadeIn({ children, delay = 0, y = 20 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.opacity = "0";
    el.style.transform = `translateY(${y}px)`;
    el.style.transition =
      `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms`;
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    };
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { reveal(); obs.disconnect(); } },
      { threshold: 0.05, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    const t = window.setTimeout(reveal, 2200);
    return () => { obs.disconnect(); window.clearTimeout(t); };
  }, [delay, y]);
  return <div ref={ref}>{children}</div>;
}

// ── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNum({ target, suffix = "", dur = 2200 }: { target: number; suffix?: string; dur?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let done = false;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || done) return;
        done = true;
        obs.disconnect();
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          const cur = target * eased;
          el.textContent =
            suffix === "%" ? cur.toFixed(1) + suffix : Math.floor(cur).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, suffix, dur]);
  return <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>{suffix === "%" ? "0.0%" : "0" + suffix}</span>;
}

// ── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { title: "Crop Provenance",  desc: "Every harvest batch stamped with origin data — variety, soil health, and yield — tied to an on-chain NFT.", icon: Sprout,  tag: "100% traceable",    color: "#10b981" },
  { title: "Custody Transfers", desc: "Handoffs happen in one on-chain transaction. Every ownership change is timestamped and auditable.",            icon: Handshake, tag: "Sub-second finality", color: "#06b6d4" },
  { title: "IoT Telemetry",    desc: "Temperature, humidity, and pH streamed live from LoRa sensors with SHA-256-hashed payloads.",                  icon: Cpu,      tag: "Live monitoring",    color: "#22d3ee" },
  { title: "Sui Blockchain",   desc: "Built on Sui's object-centric model. Each batch is a unique dynamic object with ownership and events.",                icon: Network,  tag: "L1 performance",     color: "#6366f1" },
  { title: "AI Yield Forecast",desc: "Weighted moving averages over 90 days of sensor data produce confidence-weighted harvest forecasts.",               icon: Brain,    tag: "ML-powered",         color: "#f59e0b" },
  { title: "ZK Privacy",       desc: "Zero-knowledge proofs let logistics partners verify cargo condition without revealing sensitive data.",                  icon: ShieldCheck, tag: "Privacy-first",    color: "#8b5cf6" },
];

const STEPS = [
  { n: "01", title: "Register", desc: "Create a TerraNode account and link your Sui wallet. Choose your role." },
  { n: "02", title: "Submit",   desc: "Log soil readings, temperature, and pH. Each record is SHA-256 hashed and stored immutably." },
  { n: "03", title: "Mint",     desc: "Bundle your harvest into a batch, sign on-chain, receive a verifiable NFT proof-of-origin." },
  { n: "04", title: "Verify",   desc: "Every custodian handoff and admin audit re-validates the hash against the Sui ledger end-to-end." },
];

const ROLES = [
  { role: "Farmer",    color: "#10b981", items: ["Submit environmental readings", "Mint NFT batch tokens", "View yield predictions", "Monitor batch status"] },
  { role: "Logistics", color: "#06b6d4", items: ["View open transfer requests", "Accept & execute transfers", "Scan QR batch codes", "Update shipment status"] },
  { role: "Admin",     color: "#8b5cf6", items: ["Manage all user accounts", "Run hash verification", "View system health", "Access full audit logs"] },
];

// ── Page ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user } = useAuth();

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "#0a0f1a",
        color: "#f1f5f9",
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      {/* Ambient glow blobs — using inline styles so they work without className */}
      <div
        style={{
          position: "absolute", top: 0, left: 0,
          width: 600, height: 600,
          borderRadius: "50%",
          background: "rgba(34,211,238,0.10)",
          filter: "blur(120px)",
          zIndex: -10, pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", bottom: 0, right: 0,
          width: 600, height: 600,
          borderRadius: "50%",
          background: "rgba(251,191,36,0.10)",
          filter: "blur(120px)",
          zIndex: -10, pointerEvents: "none",
        }}
      />

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ══════════════════════ HERO ══════════════════════ */}
      <FadeIn>
        <section
          style={{
            position: "relative", zIndex: 2,
            padding: "clamp(5rem, 14vw, 9rem) 1.5rem clamp(3rem, 8vw, 5rem)",
            textAlign: "center", overflow: "hidden",
          }}
        >
          {/* Live badge */}
          <div style={{ marginBottom: "1.75rem" }}>
            <span
              style={{
                display: "inline-flex", alignItems: "center", gap: "0.5rem",
                padding: "0.35rem 1rem", borderRadius: 9999,
                background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)",
                fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace",
                color: "#34d399", letterSpacing: "0.05em",
              }}
            >
              <span
                style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#34d399",
                  boxShadow: "0 0 8px rgba(52,211,153,0.5)",
                  animation: "pulse-dot 2s ease-in-out infinite",
                }}
              />
              LIVE ON SUI TESTNET · Block #14,832,561
            </span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: "clamp(2.4rem, 6.5vw, 4.2rem)",
              fontWeight: 800, lineHeight: 1.06, letterSpacing: "-0.035em",
              maxWidth: 920, margin: "0 auto 1.25rem",
            }}
          >
            <span style={{ color: "#f1f5f9" }}>Farm-to-table provenance, </span>
            <br />
            <span
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #22d3ee 50%, #3b82f6 100%)",
                backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              on-chain.
            </span>
          </h1>

          {/* Sub headline */}
          <p
            style={{
              maxWidth: 580, margin: "0 auto 2.25rem", lineHeight: 1.7,
              fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)",
              color: "rgba(148,163,184,0.8)",
            }}
          >
            TerraNode links every harvest batch to an immutable Sui ledger.
            From IoT telemetry to yield predictions to custody handoffs — the whole supply chain, verified.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/register">
              <Button variant="primary" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                Start minting batches →
              </Button>
            </Link>
            <a href="#features" style={{ textDecoration: "none" }}>
              <Button variant="outline" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                See how it works
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: "2rem", flexWrap: "wrap", marginTop: "2.5rem",
              fontSize: "0.78rem", color: "rgba(148,163,184,0.5)",
            }}
          >
            {["SHA-256 Hashed", "Non-custodial", "~200ms finality", "Testnet · Free"].map((t) => (
              <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* ══════════════════════ FEATURES ══════════════════════ */}
      <section
        id="features"
        style={{
          position: "relative", zIndex: 10,
          padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 3rem)",
          background: "linear-gradient(180deg, rgba(34,211,238,0.02) 0%, transparent 50%)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Section header */}
          <FadeIn delay={80}>
            <div style={{ textAlign: "center", marginBottom: 52 }}>
              <span
                style={{
                  display: "inline-block", padding: "5px 14px", borderRadius: 9999,
                  background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.15)",
                  fontSize: 12, fontWeight: 600, color: "#67e8f9",
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em", marginBottom: 16,
                }}
              >
                Core Capabilities
              </span>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 700,
                  letterSpacing: "-0.025em", color: "#f1f5f9", marginBottom: 12, lineHeight: 1.2,
                }}
              >
                Everything you need to{" "}
                <span
                  style={{
                    background: "linear-gradient(90deg, #fbbf24, #22d3ee, #3b82f6)",
                    backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  }}
                >
                  verify your supply chain
                </span>
              </h2>
              <p
                style={{
                  fontSize: 15, color: "rgba(148,163,184,0.8)",
                  maxWidth: 520, margin: "0 auto", lineHeight: 1.6,
                }}
              >
                Built on Sui for speed and security. Every feature serves farmers, logistics providers, and auditors.
              </p>
            </div>
          </FadeIn>

          {/* Feature cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
            {FEATURES.map((f, i) => {
              const IconComp = f.icon;
              const c = f.color;
              return (
                <FadeIn key={f.title} delay={i * 100} y={18}>
                  <div
                    style={{
                      position: "relative",
                      padding: "28px 26px 24px",
                      borderRadius: 18,
                      background: "linear-gradient(150deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.65) 100%)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(51,65,85,0.55)",
                      transition: "transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
                      overflow: "hidden", cursor: "default", height: "100%",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.borderColor = `${c}55`;
                      e.currentTarget.style.boxShadow = `0 20px 50px -16px ${c}30, inset 0 0 0 1px ${c}10`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor = "rgba(51,65,85,0.55)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Top glow line */}
                    <div
                      style={{
                        position: "absolute", top: 0, left: "50%",
                        transform: "translateX(-50%)", width: "55%", height: 1,
                        background: `linear-gradient(90deg, transparent, ${c}55, transparent)`,
                        opacity: 0, transition: "opacity 0.4s ease",
                      }}
                      onMouseEnter={(e) => ((e.target as HTMLElement).style.opacity = "1")}
                      onMouseLeave={(e) => ((e.target as HTMLElement).style.opacity = "0")}
                    />

                    {/* Icon */}
                    <div
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: `${c}14`, border: `1px solid ${c}28`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        marginBottom: 16,
                      }}
                    >
                      <IconComp size={22} strokeWidth={1.75} color={c} style={{ filter: `drop-shadow(0 0 10px ${c}55)` }} />
                    </div>

                    {/* Text */}
                    <h3
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontSize: 17, fontWeight: 600,
                        color: "#f1f5f9", marginBottom: 8, letterSpacing: "-0.01em",
                      }}
                    >
                      {f.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 13.5, lineHeight: 1.6, color: "rgba(148,163,184,0.75)",
                        marginBottom: 16, flexGrow: 1,
                      }}
                    >
                      {f.desc}
                    </p>
                    <span
                      style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 9999,
                        background: `${c}0d`, border: `1px solid ${c}1a`,
                        fontSize: 11, fontWeight: 600, color: c,
                        fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em",
                      }}
                    >
                      {f.tag}
                    </span>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════ HOW IT WORKS ══════════════════════ */}
      <section
        id="how-it-works"
        style={{
          position: "relative", zIndex: 10,
          padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 3rem)",
          background: "linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.015) 50%, transparent 100%)",
        }}
      >
        <div style={{ maxWidth: 1050, margin: "0 auto" }}>
          <FadeIn delay={0}>
            <div style={{ textAlign: "center", marginBottom: 48 }}>
              <span
                style={{
                  display: "inline-block", padding: "5px 14px", borderRadius: 9999,
                  background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)",
                  fontSize: 12, fontWeight: 600, color: "#fbbf24",
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em", marginBottom: 16,
                }}
              >
                How it works
              </span>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 700,
                  letterSpacing: "-0.025em", color: "#f1f5f9", marginBottom: 12,
                }}
              >
                From seed to shelf in <span style={{ color: "#22d3ee" }}>four steps.</span>
              </h2>
              <p
                style={{
                  fontSize: 15, color: "rgba(148,163,184,0.8)",
                  maxWidth: 500, margin: "0 auto", lineHeight: 1.6,
                }}
              >
                Every step is verified on-chain. No middlemen, no paperwork — just cryptographic proof.
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 18,
            }}
          >
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={120 + i * 100} y={14}>
                <div
                  style={{
                    padding: "1.75rem 1.25rem", borderRadius: 14, textAlign: "center",
                    background: "rgba(15,23,42,0.5)",
                    border: "1px solid rgba(251,191,36,0.18)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 14px 32px -12px rgba(251,191,36,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem",
                      letterSpacing: "0.06em", padding: "0.18rem 0.5rem", borderRadius: 9999,
                      background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)",
                      color: "#34d399", marginBottom: "0.85rem",
                    }}
                  >
                    {s.n}
                  </span>
                  <h3
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: "1.05rem", fontWeight: 600,
                      color: "#f1f5f9", marginBottom: "0.5rem",
                    }}
                  >
                    {s.title}
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "rgba(148,163,184,0.75)", lineHeight: 1.6 }}>
                    {s.desc}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ ROLES ══════════════════════ */}
      <section
        style={{
          position: "relative", zIndex: 10,
          padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 3rem)",
        }}
      >
        <div style={{ maxWidth: 1050, margin: "0 auto" }}>
          <FadeIn delay={0}>
            <div style={{ textAlign: "center", marginBottom: 44 }}>
              <h2
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 700,
                  letterSpacing: "-0.025em", color: "#f1f5f9", marginBottom: 12,
                }}
              >
                One platform, <span style={{ color: "#fbbf24" }}>three roles.</span>
              </h2>
              <p
                style={{
                  fontSize: 15, color: "rgba(148,163,184,0.8)",
                  maxWidth: 480, margin: "0 auto", lineHeight: 1.6,
                }}
              >
                Every participant in the supply chain gets a tailored experience.
              </p>
            </div>
          </FadeIn>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 18,
            }}
          >
            {ROLES.map((r) => (
              <FadeIn key={r.role} delay={100} y={12}>
                <div
                  style={{
                    padding: "1.75rem", borderRadius: 14,
                    background: "rgba(15,23,42,0.5)",
                    border: `1px solid ${r.color}20`,
                    transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = `${r.color}50`;
                    e.currentTarget.style.boxShadow = `0 14px 32px -12px ${r.color}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = `${r.color}20`;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: "1.1rem", fontWeight: 600,
                      color: "#f1f5f9", marginBottom: "0.85rem",
                    }}
                  >
                    {r.role}
                  </h3>
                  <ul
                    style={{
                      listStyle: "none", margin: 0, padding: 0,
                      display: "flex", flexDirection: "column", gap: "0.5rem",
                    }}
                  >
                    {r.items.map((item) => (
                      <li
                        key={item}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.5rem",
                          fontSize: "0.82rem", color: "rgba(148,163,184,0.8)",
                        }}
                      >
                        <span style={{ color: r.color, flexShrink: 0 }}>✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════ STATS ══════════════════════ */}
      <section
        style={{
          position: "relative", zIndex: 10,
          padding: "2.5rem clamp(1rem, 4vw, 3rem)",
          borderTop: "1px solid rgba(51,65,85,0.25)",
          borderBottom: "1px solid rgba(51,65,85,0.25)",
          background: "rgba(4,13,28,0.4)",
        }}
      >
        <div
          style={{
            maxWidth: 960, margin: "0 auto",
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
            gap: 24, textAlign: "center",
          }}
        >
          {[
            { value: 12480, suffix: "", label: "Total Batches" },
            { value: 847, suffix: "", label: "Farmers Online" },
            { value: 3291, suffix: "", label: "Transfers Today" },
            { value: 99.97, suffix: "%", label: "Uptime" },
          ].map((s) => (
            <FadeIn key={s.label} delay={0} y={8}>
              <div>
                <div
                  style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700,
                    color: "#22d3ee", letterSpacing: "-0.02em",
                  }}
                >
                  <AnimatedNum target={s.value} suffix={s.suffix} dur={2400} />
                </div>
                <div style={{ fontSize: "0.75rem", color: "rgba(148,163,184,0.5)", marginTop: 4 }}>
                  {s.label}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════════════════ CTA ══════════════════════ */}
      <FadeIn delay={0}>
        <section
          style={{
            position: "relative", zIndex: 10,
            padding: "clamp(4rem, 10vw, 7rem) clamp(1rem, 4vw, 3rem)",
            textAlign: "center", overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background:
                "radial-gradient(ellipse 55% 55% at 50% 110%, rgba(16,185,129,0.10) 0%, transparent 60%), " +
                "radial-gradient(ellipse 45% 45% at 50% -5%, rgba(6,182,212,0.08) 0%, transparent 50%)",
            }}
          />
          <div style={{ position: "relative", maxWidth: 640, margin: "0 auto" }}>
            <h2
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: "clamp(1.6rem, 4vw, 2.5rem)", fontWeight: 700,
                letterSpacing: "-0.025em", color: "#f1f5f9", marginBottom: "1rem",
              }}
            >
              Ready to go <span style={{ color: "#34d399" }}>on-chain?</span>
            </h2>
            <p
              style={{
                fontSize: 15, color: "rgba(148,163,184,0.8)",
                lineHeight: 1.7, marginBottom: "2rem",
              }}
            >
              Join hundreds of farmers and logistics partners already proving provenance with TerraNode.
            </p>
            <div style={{ display: "flex", gap: "0.875rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link to="/register">
                <Button variant="primary" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  Start minting batches →
                </Button>
              </Link>
              <a href="#how-it-works" style={{ textDecoration: "none" }}>
                <Button variant="outline" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  See how it works
                </Button>
              </a>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ══════════════════════ FOOTER ══════════════════════ */}
      <footer
        style={{
          position: "relative", zIndex: 10,
          borderTop: "1px solid rgba(51,65,85,0.2)",
          padding: "1.75rem 1rem", background: "rgba(10,15,26,0.9)",
        }}
      >
        <div
          style={{
            maxWidth: 1200, margin: "0 auto",
            display: "flex", flexWrap: "wrap", justifyContent: "space-between",
            alignItems: "center", gap: 14,
          }}
        >
          <p style={{ fontSize: 12.5, color: "rgba(100,116,139,0.4)", margin: 0 }}>
            © 2026 TerraNode. Built on Sui.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {["Stack", "Docs", "GitHub"].map((l) => (
              <a
                key={l}
                href="#"
                style={{
                  fontSize: 12.5, color: "rgba(100,116,139,0.4)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(100,116,139,0.4)")}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
