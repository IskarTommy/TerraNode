import { useEffect, useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/Common/Button";
import { Logo } from "../components/Logo";
import { CanvasBackground } from "../components/CanvasBackground";
import { Sprout, Cpu, Network, Handshake, Brain, ShieldCheck } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  y?: number;
}

interface AnimatedNumProps {
  target: number;
  suffix?: string;
  dur?: number;
}

interface FeatureItem {
  title: string;
  desc: string;
  icon: typeof Sprout;
  tag: string;
  color: string;
}

interface StepItem {
  n: string;
  title: string;
  desc: string;
}

interface RoleItem {
  role: string;
  color: string;
  items: string[];
}

interface StatItem {
  value: number;
  suffix: string;
  label: string;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES: FeatureItem[] = [
  { title: "Crop Provenance", desc: "Every harvest batch stamped with origin data — variety, soil health, and yield — tied to an on-chain NFT.", icon: Sprout, tag: "100% traceable", color: "#10b981" },
  { title: "Custody Transfers", desc: "Handoffs happen in one on-chain transaction. Every ownership change is timestamped and auditable.", icon: Handshake, tag: "Sub-second finality", color: "#06b6d4" },
  { title: "IoT Telemetry", desc: "Temperature, humidity, and pH streamed live from LoRa sensors with SHA-256-hashed payloads.", icon: Cpu, tag: "Live monitoring", color: "#22d3ee" },
  { title: "Sui Blockchain", desc: "Built on Sui object-centric model. Each batch is a unique dynamic object with ownership and events.", icon: Network, tag: "L1 performance", color: "#6366f1" },
  { title: "AI Yield Forecast", desc: "Weighted moving averages over 90 days of sensor data produce confidence-weighted harvest forecasts.", icon: Brain, tag: "ML-powered", color: "#f59e0b" },
  { title: "ZK Privacy", desc: "Zero-knowledge proofs let logistics partners verify cargo condition without revealing sensitive data.", icon: ShieldCheck, tag: "Privacy-first", color: "#8b5cf6" },
];

const STEPS: StepItem[] = [
  { n: "01", title: "Register", desc: "Create a TerraNode account and link your Sui wallet. Choose your role." },
  { n: "02", title: "Submit", desc: "Log soil readings, temperature, and pH. Each record is SHA-256 hashed and stored immutably." },
  { n: "03", title: "Mint", desc: "Bundle your harvest into a batch, sign on-chain, and receive a verifiable NFT proof-of-origin." },
  { n: "04", title: "Verify", desc: "Every custodian handoff and admin audit re-validates the hash against the Sui ledger end-to-end." },
];

const ROLES: RoleItem[] = [
  { role: "Farmer", color: "#10b981", items: ["Submit environmental readings", "Mint NFT batch tokens", "View yield predictions", "Monitor batch status"] },
  { role: "Logistics", color: "#06b6d4", items: ["View open transfer requests", "Accept & execute transfers", "Scan QR batch codes", "Update shipment status"] },
  { role: "Admin", color: "#8b5cf6", items: ["Manage all user accounts", "Run hash verification", "View system health", "Access full audit logs"] },
];

const STATS: StatItem[] = [
  { value: 12480, suffix: "", label: "Total Batches" },
  { value: 847, suffix: "", label: "Farmers Online" },
  { value: 3291, suffix: "", label: "Transfers Today" },
  { value: 99.97, suffix: "%", label: "Uptime" },
];

// ── Animation Components ──────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, y = 18 }: FadeInProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.opacity = "0";
    el.style.transform = `translateY(${y}px)`;
    el.style.transition = `opacity 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 0.7s cubic-bezier(.16,1,.3,1) ${delay}ms`;

    let done = false;
    const reveal = (): void => {
      if (done) return;
      done = true;
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { reveal(); observer.disconnect(); }
    }, { threshold: 0.05, rootMargin: "0px 0px -30px 0px" });
    observer.observe(el);
    const fallback = window.setTimeout(reveal, 2200);

    return () => { observer.disconnect(); window.clearTimeout(fallback); };
  }, [delay, y]);

  return <div ref={ref}>{children}</div>;
}

function AnimatedNum({ target, suffix = "", dur = 2200 }: AnimatedNumProps): React.ReactElement {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let done = false;
    let frameId = 0;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || done) return;
      done = true;
      observer.disconnect();

      const t0 = performance.now();
      const tick = (now: number): void => {
        const progress = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = target * eased;
        const text = suffix === "%"
          ? `${current.toFixed(1)}${suffix}`
          : `${Math.floor(current).toLocaleString()}${suffix}`;
        el.textContent = text;
        if (progress < 1) { frameId = requestAnimationFrame(tick); }
      };
      frameId = requestAnimationFrame(tick);
    }, { threshold: 0.3 });

    observer.observe(el);
    return () => { observer.disconnect(); if (frameId) cancelAnimationFrame(frameId); };
  }, [target, suffix, dur]);

  return <span ref={ref} className="tabular-nums" aria-live="polite">{suffix === "%" ? "0.0%" : `0${suffix}`}</span>;
}

// ── Landing Page ──────────────────────────────────────────────────────────────

export default function HomePage(): React.ReactElement {
  return (
    <div
      className="relative min-h-screen overflow-hidden"
      style={{ background: "#0a0f1a", color: "#f1f5f9", fontFamily: "'Outfit', system-ui, sans-serif" }}
    >
<CanvasBackground />

      <style>{`
        @keyframes tn-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes tn-float-orb {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -25px); }
          66% { transform: translate(-20px, 15px); }
        }
        @keyframes tn-reveal-up {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Ambient glow orbs ───────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute rounded-full" style={{ width: 700, height: 700, background: "radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 70%)", top: "-25%", left: "5%", filter: "blur(60px)", animation: "tn-float-orb 14s ease-in-out infinite" }} />
        <div className="absolute rounded-full" style={{ width: 500, height: 500, background: "radial-gradient(circle, rgba(251,191,36,0.07) 0%, transparent 70%)", bottom: "-20%", right: "5%", filter: "blur(50px)", animation: "tn-float-orb 18s ease-in-out infinite 4s" }} />
        <div className="absolute rounded-full" style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", top: "40%", left: "55%", filter: "blur(80px)", animation: "tn-float-orb 20s ease-in-out infinite 8s" }} />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION HEADER
         ═══════════════════════════════════════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
        style={{ background: "rgba(10,15,26,0.75)", backdropFilter: "blur(14px)", borderBottom: "1px solid rgba(51,65,85,0.2)" }}
        role="banner"
      >
        <nav
          className="mx-auto flex items-center justify-between"
          style={{ maxWidth: 1200, padding: "0.85rem 1.5rem" }}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 no-underline" aria-label="TerraNode home">
  <Logo size={28} showText={true} />
</Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-7">
            {[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Roles", href: "#roles" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="transition-colors duration-200"
                style={{ fontSize: 14, fontWeight: 500, color: "rgba(203,213,225,0.7)", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f1f5f9")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(203,213,225,0.7)")}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className="rounded-lg transition-all duration-200"
              style={{ padding: "8px 16px", fontSize: 14, fontWeight: 600, color: "#f1f5f9", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.2)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.12)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.25)"; }}
            >
              Launch App
            </Link>
          </div>
          {/* Mobile menu button */}
          <button className="sm:hidden p-2 text-slate-400 hover:text-slate-200 transition-colors" aria-label="Open menu">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </nav>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          HERO
         ═══════════════════════════════════════════════════════════════ */}
      <FadeIn>
        <section
          className="relative z-10 flex flex-col items-center text-center"
          style={{ padding: "clamp(6rem, 14vw, 9rem) 1.5rem clamp(3rem, 8vw, 5rem)" }}
          aria-labelledby="hero-heading"
        >
          {/* Live badge */}
          <div className="mb-7">
            <span
              className="inline-flex items-center gap-2 rounded-full"
              style={{ padding: "6px 16px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#34d399", letterSpacing: "0.05em" }}
            >
              <span className="inline-block rounded-full" aria-hidden="true" style={{ width: 7, height: 7, background: "#34d399", boxShadow: "0 0 8px rgba(52,211,153,0.5)", animation: "tn-pulse-dot 2s ease-in-out infinite" }} />
              LIVE ON SUI TESTNET · Block #14,832,561
            </span>
          </div>

          {/* Headline */}
          <h1
            id="hero-heading"
            className="text-center mx-auto max-w-3xl leading-[1.06]"
            style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(2.4rem, 6.5vw, 4.2rem)", fontWeight: 800, letterSpacing: "-0.035em", marginBottom: "1.25rem" }}
          >
            <span style={{ color: "#f1f5f9" }}>Farm-to-table provenance, </span>
            <br />
            <span style={{ background: "linear-gradient(135deg, #fbbf24 0%, #22d3ee 50%, #3b82f6 100%)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              on-chain.
            </span>
          </h1>

          {/* Sub-headline */}
          <p
            className="text-center mx-auto max-w-2xl leading-relaxed"
            style={{ fontSize: "clamp(0.95rem, 1.8vw, 1.1rem)", color: "rgba(203,213,225,0.85)", marginBottom: "2.25rem" }}
          >
            TerraNode links every harvest batch to an immutable Sui ledger. From IoT telemetry to yield predictions to custody handoffs — the whole supply chain, verified.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/register">
              <Button variant="primary" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                Start minting batches →
              </Button>
            </Link>
            <a href="#features" className="no-underline">
              <Button variant="outline" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                See how it works
              </Button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10" style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.7)" }} aria-label="Platform guarantees">
            {["SHA-256 Hashed", "Non-custodial", "~200ms finality", "Testnet · Free"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </section>
      </FadeIn>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURES
         ═══════════════════════════════════════════════════════════════ */}
      <section
        id="features"
        className="relative z-10 flex flex-col items-center text-center"
        style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 3rem)", background: "linear-gradient(180deg, rgba(34,211,238,0.02) 0%, transparent 50%)" }}
        aria-labelledby="features-heading"
      >
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          {/* Section header — stays centered */}
          <FadeIn delay={80}>
            <div className="text-center mb-14">
              <span
                className="inline-block rounded-full mb-4"
                style={{ padding: "4px 14px", background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.15)", fontSize: 12, fontWeight: 600, color: "#67e8f9", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
              >
                Core Capabilities
              </span>
              <h2
                id="features-heading"
                className="leading-tight mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.025em", color: "#f1f5f9" }}
              >
                Everything you need to{" "}
                <span style={{ background: "linear-gradient(90deg, #fbbf24, #22d3ee, #3b82f6)", backgroundClip: "text", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  verify your supply chain
                </span>
              </h2>
              <p className="mx-auto max-w-130 leading-relaxed" style={{ fontSize: 15, color: "rgba(203,213,225,0.8)" }}>
                Built on Sui for speed and security. Every feature serves farmers, logistics providers, and auditors.
              </p>
            </div>
          </FadeIn>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mx-auto w-full" style={{ maxWidth: 1050, placeItems: "center" }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 100} y={18}>
                <div
                  className="group relative rounded-2xl overflow-hidden text-center"
                  style={{
                    padding: i === 0 ? "36px 30px 30px" : "30px",
                    background: "linear-gradient(150deg, rgba(30,41,59,0.55) 0%, rgba(15,23,42,0.65) 100%)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(51,65,85,0.55)",
                    transition: "transform 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease",
                    cursor: "default",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-6px)";
                    e.currentTarget.style.borderColor = `${f.color}55`;
                    e.currentTarget.style.boxShadow = `0 20px 50px -16px ${f.color}30, inset 0 0 0 1px ${f.color}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "rgba(51,65,85,0.55)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  role="article"
                  aria-label={f.title}
                >
                  {/* Top glow accent */}
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-[55%] transition-opacity duration-400 opacity-0 group-hover:opacity-100"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.color}55, transparent)` }}
                    aria-hidden="true"
                  />

                  {/* Icon */}
                  <div
                    className="flex items-center justify-center mx-auto mb-4 rounded-xl"
                    style={{ width: 46, height: 46, background: `${f.color}14`, border: `1px solid ${f.color}28` }}
                  >
                    <f.icon size={23} strokeWidth={1.75} color={f.color} style={{ filter: `drop-shadow(0 0 10px ${f.color}55)` }} aria-hidden="true" />
                  </div>

                  {/* Text */}
                  <h3 className="mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: i === 0 ? 20 : 18, fontWeight: 600, color: "#f1f5f9", letterSpacing: "-0.01em" }}>
                    {f.title}
                  </h3>
                  <p className="mb-5 leading-relaxed" style={{ fontSize: 13.5, color: "rgba(203,213,225,0.75)", maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
                    {f.desc}
                  </p>
                  <span
                    className="inline-block rounded-full"
                    style={{ padding: "2px 10px", background: `${f.color}0d`, border: `1px solid ${f.color}1a`, fontSize: 11, fontWeight: 600, color: f.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.02em" }}
                  >
                    {f.tag}
                  </span>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          HOW IT WORKS
         ═══════════════════════════════════════════════════════════════ */}
      <section
        id="how-it-works"
        className="relative z-10 flex flex-col items-center text-center"
        style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 3rem)", background: "linear-gradient(180deg, transparent 0%, rgba(251,191,36,0.015) 50%, transparent 100%)" }}
        aria-labelledby="how-heading"
      >
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <FadeIn delay={0}>
            <div className="text-center mb-12">
              <span
                className="inline-block rounded-full mb-4"
                style={{ padding: "4px 14px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.15)", fontSize: 12, fontWeight: 600, color: "#fbbf24", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}
              >
                How it works
              </span>
              <h2
                id="how-heading"
                className="mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.025em", color: "#f1f5f9" }}
              >
                From seed to shelf in <span style={{ color: "#22d3ee" }}>four steps.</span>
              </h2>
              <p className="mx-auto max-w-125 leading-relaxed" style={{ fontSize: 15, color: "rgba(203,213,225,0.8)" }}>
                Every step is verified on-chain. No middlemen, no paperwork — just cryptographic proof.
              </p>
            </div>
          </FadeIn>

          {/* Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mx-auto w-full" style={{ maxWidth: 1050 }}>
            {STEPS.map((s, i) => (
              <FadeIn key={s.n} delay={120 + i * 100} y={14}>
                <div
                  className="text-center rounded-xl"
                  style={{
                    padding: "1.75rem 1.25rem",
                    background: "rgba(15,23,42,0.5)",
                    border: "1px solid rgba(51,65,85,0.4)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.borderColor = "rgba(251,191,36,0.25)";
                    e.currentTarget.style.boxShadow = "0 14px 32px -12px rgba(251,191,36,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.borderColor = "rgba(51,65,85,0.4)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span
                    className="inline-block mb-3"
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", letterSpacing: "0.06em", padding: "0.18rem 0.5rem", borderRadius: 9999, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", color: "#34d399" }}
                  >
                    {s.n}
                  </span>
                  <h3 className="mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.05rem", fontWeight: 600, color: "#f1f5f9" }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: "0.82rem", color: "rgba(203,213,225,0.75)", lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          ROLES
         ═══════════════════════════════════════════════════════════════ */}
      <section
        id="roles"
        className="relative z-10 flex flex-col items-center text-center"
        style={{ padding: "clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 3rem)" }}
        aria-labelledby="roles-heading"
      >
        <div className="mx-auto" style={{ maxWidth: 1200 }}>
          <FadeIn delay={0}>
            <div className="text-center mb-12">
              <h2
                id="roles-heading"
                className="mb-3"
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.6rem)", fontWeight: 700, letterSpacing: "-0.025em", color: "#f1f5f9" }}
              >
                One platform, <span style={{ color: "#fbbf24" }}>three roles.</span>
              </h2>
              <p className="mx-auto max-w-120 leading-relaxed" style={{ fontSize: 15, color: "rgba(203,213,225,0.8)" }}>
                Every participant in the supply chain gets a tailored experience.
              </p>
            </div>
          </FadeIn>

          {/* Role cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mx-auto w-full" style={{ maxWidth: 1050, placeItems: "center" }}>
            {ROLES.map((r) => (
              <FadeIn key={r.role} delay={100} y={12}>
                <div
                  className="rounded-xl text-center"
                  style={{
                    padding: "1.75rem",
                    background: "rgba(15,23,42,0.5)",
                    border: `1px solid ${r.color}20`,
                    transition: "transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease",
                    width: "100%",
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
                  <h3 className="mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "1.1rem", fontWeight: 600, color: "#f1f5f9" }}>
                    {r.role}
                  </h3>
                  <ul className="flex flex-col gap-2.5 list-none m-0 p-0" style={{ fontSize: "0.82rem", color: "rgba(203,213,225,0.8)" }}>
                    {r.items.map((item) => (
                      <li key={item} className="flex items-center justify-center gap-2">
                        <span className="shrink-0" style={{ color: r.color }} aria-hidden="true">✓</span>
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

      {/* ═══════════════════════════════════════════════════════════════
          STATS BAND
         ═══════════════════════════════════════════════════════════════ */}
      <section
        className="relative z-10 flex flex-col items-center text-center"
        style={{
          padding: "2.5rem clamp(1rem, 4vw, 3rem)",
          borderTop: "1px solid rgba(51,65,85,0.25)",
          borderBottom: "1px solid rgba(51,65,85,0.25)",
          background: "rgba(4,13,28,0.4)",
        }}
        aria-label="Platform statistics"
      >
        <div className="mx-auto grid gap-8" style={{ maxWidth: 960, gridTemplateColumns: "repeat(4, 1fr)" }}>
          {STATS.map((s) => (
            <FadeIn key={s.label} delay={0} y={8}>
              <div>
                <div
                  className="mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 700, color: "#22d3ee", letterSpacing: "-0.02em" }}
                >
                  <AnimatedNum target={s.value} suffix={s.suffix} dur={2400} />
                </div>
                <div style={{ fontSize: "0.78rem", color: "rgba(203,213,225,0.6)" }}>{s.label}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          CTA BANNER
         ═══════════════════════════════════════════════════════════════ */}
      <FadeIn delay={0}>
        <section
          className="relative z-10 flex flex-col items-center text-center"
          style={{ padding: "clamp(4rem, 10vw, 7rem) clamp(1rem, 4vw, 3rem)", overflow: "hidden" }}
          aria-labelledby="cta-heading"
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 55% 55% at 50% 110%, rgba(16,185,129,0.10) 0%, transparent 60%), radial-gradient(ellipse 45% 45% at 50% -5%, rgba(6,182,212,0.08) 0%, transparent 50%)",
            }}
            aria-hidden="true"
          />
          <div className="relative mx-auto" style={{ maxWidth: 640 }}>
            <h2 id="cta-heading" className="mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: "clamp(1.6rem, 4vw, 2.5rem)", fontWeight: 700, letterSpacing: "-0.025em", color: "#f1f5f9" }}>
              Ready to go <span style={{ color: "#34d399" }}>on-chain?</span>
            </h2>
            <p className="mx-auto mb-8 leading-relaxed" style={{ fontSize: 15, color: "rgba(203,213,225,0.8)", maxWidth: 480 }}>
              Join hundreds of farmers and logistics partners already proving provenance with TerraNode.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register">
                <Button variant="primary" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  Start minting batches →
                </Button>
              </Link>
              <a href="#how-it-works" className="no-underline">
                <Button variant="outline" size="lg" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  See how it works
                </Button>
              </a>
            </div>
          </div>
        </section>
      </FadeIn>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════════════════════════════ */}
      <footer
        className="relative z-10"
        style={{ borderTop: "1px solid rgba(51,65,85,0.2)", padding: "1.75rem 1rem", background: "rgba(10,15,26,0.9)" }}
        role="contentinfo"
      >
        <div className="mx-auto flex flex-wrap items-center justify-between gap-4" style={{ maxWidth: 1200 }}>
          <p style={{ fontSize: 13, color: "rgba(148,163,184,0.6)", margin: 0, fontFamily: "'Outfit', system-ui, sans-serif" }}>
            © 2026 TerraNode. Built on Sui.
          </p>
          <nav aria-label="Footer navigation">
            <div className="flex items-center gap-5">
              {["Stack", "Docs", "GitHub"].map((link) => (
                <a
                  key={link}
                  href="#"
                  className="transition-colors duration-200"
                  style={{ fontSize: 13, color: "rgba(203,213,225,0.5)", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(203,213,225,0.5)")}
                >
                  {link}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </footer>
    </div>
  );
}
