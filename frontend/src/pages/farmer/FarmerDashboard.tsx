import { useState } from "react";
import { StatCard } from "../../components/Dashboard/FarmerDashboard";
import "./DashboardPlaceholder.css";

// ── Design tokens ─────────────────────────────────────────────────────────────
const FONT_DISPLAY = "'Space Grotesk', sans-serif";
const FONT_BODY = "'Outfit', system-ui, sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";
const TITLE_COLOR = "#f1f5f9";
const TEXT_COLOR = "#e2e8f0";
const MUTED_COLOR = "#94a3b8"; // min-contrast secondary text
const DIM_COLOR = "#64748b"; // dim labels only
const BG_CARD = "#0c1e3a";
const BG_ELEVATED = "#0f2347";
const BG_HOVER = "rgba(15,35,71,0.5)";
const BORDER = "#1e293b";
const BORDER_MID = "rgba(51,65,85,0.6)";

const HEADING: React.CSSProperties = {
  fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 600,
  color: TITLE_COLOR, letterSpacing: "-0.01em", lineHeight: 1.4, margin: 0,
};

const badge = (bg: string, fg: string, border: string) => ({
  display: "inline-flex", alignItems: "center", padding: "4px 10px",
  borderRadius: 100, background: bg, border: `1px solid ${border}`,
  fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 600, color: fg,
  letterSpacing: "0.03em", whiteSpace: "nowrap" as const,
});

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_BATCHES = [
  { id: "BTH-0047", crop: "Tomatoes", status: "minted" as const, date: "2026-07-20", temp: "4.2°C" },
  { id: "BTH-0046", crop: "Wheat", status: "in_transit" as const, date: "2026-07-18", temp: "—" },
  { id: "BTH-0045", crop: "Maize", status: "delivered" as const, date: "2026-07-15", temp: "3.8°C" },
  { id: "BTH-0044", crop: "Soybeans", status: "pending" as const, date: "2026-07-12", temp: "—" },
];

const MOCK_ALERTS = [
  { id: 1, type: "warning" as const, msg: "Batch BTH-0046 temperature exceeded 8°C threshold", time: "2h ago" },
  { id: 2, type: "info" as const, msg: "New shipment SHP-2024-004 awaiting pickup at collection hub", time: "4h ago" },
  { id: 3, type: "success" as const, msg: "Batch BTH-0045 delivered — all freshness checks passed", time: "1d ago" },
];

const FORECAST = [
  { day: "Today", icon: "sun", high: 32, low: 22, rain: 5, wind: 12 },
  { day: "Tue", icon: "partly-cloud", high: 29, low: 20, rain: 20, wind: 15 },
  { day: "Wed", icon: "cloud-rain", high: 25, low: 19, rain: 75, wind: 22 },
  { day: "Thu", icon: "cloud", high: 27, low: 20, rain: 40, wind: 18 },
  { day: "Fri", icon: "sun", high: 33, low: 23, rain: 0, wind: 10 },
];

const STATUS_META: Record<string, { label: string; bg: string; fg: string; border: string }> = {
  minted: { label: "Minted", bg: "rgba(16,185,129,0.12)", fg: "#6ee7b7", border: "rgba(16,185,129,0.28)" },
  in_transit: { label: "In Transit", bg: "rgba(6,182,212,0.12)", fg: "#67e8f9", border: "rgba(6,182,212,0.28)" },
  delivered: { label: "Delivered", bg: "rgba(34,211,238,0.1)", fg: "#22d3ee", border: "rgba(34,211,238,0.22)" },
  pending: { label: "Pending", bg: "rgba(245,158,11,0.12)", fg: "#fcd34d", border: "rgba(245,158,11,0.28)" },
};

// ── SVG helpers ──────────────────────────────────────────────────────────────
function WeatherIcon({ type, size = 20 }: { type: string; size?: number }) {
  const s = 1.6;
  const common = { width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: s, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "sun":
      return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 20v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m20 0h2M4.22 19.78l1.41-1.41m12.72-12.72l1.41-1.41"/></svg>;
    case "partly-cloud":
      return <svg {...common} viewBox="0 0 24 24"><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/><path d="M17 18a4 4 0 00-8 0 4 4 0 001.5 7.5A4 4 0 0017 18z" opacity=".5"/></svg>;
    case "cloud-rain":
      return <svg {...common} viewBox="0 0 24 24"><path d="M16 13V21m-8-4v6m4-10v10M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.58"/></svg>;
    case "cloud":
      return <svg {...common} viewBox="0 0 24 24"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg>;
    default:
      return <svg {...common} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>;
  }
}

function ArrowRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}

// ── Weather Forecast (API-ready — replace FORECAST with a fetch call) ─────────
function ForecastRow({ detail }: { detail: boolean }) {
  return (
    <div>
      <div style={{
        padding: "20px 24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 20,
        background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(6,182,212,0.02) 100%)",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <WeatherIcon type="sun" size={48} />
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{
              fontFamily: FONT_DISPLAY, fontSize: "2.6rem", fontWeight: 700,
              color: TITLE_COLOR, letterSpacing: "-0.03em", lineHeight: 1,
            }}>32°C</span>
            <span style={{ fontSize: 13, color: MUTED_COLOR }}>H:34° L:22°</span>
          </div>
          <p style={{ fontSize: 13.5, color: MUTED_COLOR, marginTop: 5 }}>
            Clear skies — good conditions for field operations
          </p>
        </div>
        <div className="hidden sm:flex" style={{ marginLeft: "auto", alignItems: "center", gap: 18, fontSize: 12, color: MUTED_COLOR, fontFamily: FONT_MONO }}>
          <span>Humidity 45%</span>
          <span>Wind 12 km/h</span>
          <span>UV 7 High</span>
        </div>
      </div>

      <div style={{ padding: "14px 16px", display: "flex", gap: 10, overflowX: "auto" }}>
        {FORECAST.map((d) => (
          <div key={d.day} style={{
            flex: "1 1 100px", minWidth: 96, padding: "14px 10px",
            borderRadius: 14, background: BG_HOVER, textAlign: "center",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: MUTED_COLOR, fontFamily: FONT_DISPLAY }}>{d.day}</span>
            <WeatherIcon type={d.icon} size={22} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: TITLE_COLOR, lineHeight: 1 }}>{d.high}°</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: DIM_COLOR }}>{d.low}°</span>
            <span style={{ fontSize: 10, color: "#22d3ee", fontFamily: FONT_MONO, display: "flex", alignItems: "center", gap: 3 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"/></svg>
              {d.rain}%
            </span>
          </div>
        ))}
      </div>

      {detail && (
        <div style={{
          padding: 20, borderTop: `1px solid ${BORDER}`, background: BG_ELEVATED,
        }}>
          <h3 style={{ ...HEADING, margin: "0 0 14px" }}>5-Day Forecast — Agakhawn Region</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12 }}>
            {FORECAST.map((d) => (
              <div key={d.day} style={{ padding: 18, borderRadius: 14, background: BG_CARD, border: `1px solid ${BORDER}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: TITLE_COLOR, fontFamily: FONT_DISPLAY }}>{d.day}</span>
                  <WeatherIcon type={d.icon} size={20} />
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: "1.6rem", fontWeight: 700, color: TITLE_COLOR, lineHeight: 1 }}>{d.high}°</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED_COLOR }}>/ {d.low}°</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: MUTED_COLOR, fontFamily: FONT_MONO }}>
                  <span>Wind {d.wind} km/h</span>
                  <span>Humidity 72%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function FarmerDashboard() {
  const [forecast] = useState(FORECAST);
  const [showWeatherDetail, setShowWeatherDetail] = useState(false);

  return (
    <div className="dashboard-placeholder-page" data-role="farmer">
      {/* Page Header */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
              fontWeight: 700, color: TITLE_COLOR, letterSpacing: "-0.03em",
              lineHeight: 1.1, margin: "0 0 6px",
            }}>Farmer Workspace</h1>
            <p style={{ fontSize: 14, color: MUTED_COLOR, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.5 }}>
              Monitor batches, sensor telemetry, and field conditions.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowWeatherDetail((v) => !v)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "8px 16px", borderRadius: 14,
                background: "rgba(12,30,58,0.6)",
                border: `1px solid ${BORDER_MID}`, color: MUTED_COLOR,
                fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 500,
                cursor: "pointer", transition: "border-color 0.25s, color 0.25s",
                backdropFilter: "blur(12px)", whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#22d3ee"; e.currentTarget.style.color = TEXT_COLOR; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER_MID; e.currentTarget.style.color = MUTED_COLOR; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 110-14h8.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Weather Forecast
              <span style={{ display: "inline-flex", transition: "transform 0.25s", transform: showWeatherDetail ? "rotate(180deg)" : "rotate(0deg)" }}>
                <ArrowRight />
              </span>
            </button>
            <span style={{
              ...badge("rgba(16,185,129,0.12)", "#6ee7b7", "rgba(16,185,129,0.28)"),
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#10b981",
                boxShadow: "0 0 8px #10b981",
                animation: "dot-pulse 2s ease-in-out infinite",
              }} />
              Live
            </span>
          </div>
        </div>
      </header>

      {/* Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        <StatCard title="Active Batches" value="12" change={3} changeLabel="this week" trend="up" variant="primary" />
        <StatCard title="Minted on Sui" value="48" change={12} changeLabel="total minted" trend="up" variant="success" />
        <StatCard title="Pending Pickup" value="3" change={-1} changeLabel="vs last week" trend="down" variant="warning" />
        <StatCard title="Avg. Transit" value="18.5h" change={-0.5} changeLabel="improving" trend="up" variant="info" />
      </div>

      {/* Weather + Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20, marginBottom: 28 }} className="lg:grid-cols-3">
        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden" }} className="lg:col-span-2">
          <ForecastRow detail={showWeatherDetail} />
        </div>

        <div style={{
          background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 18,
          padding: 22, display: "flex", flexDirection: "column", gap: 14,
        }}>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 700, color: TITLE_COLOR, letterSpacing: "-0.02em", margin: 0 }}>
            Quick Actions
          </h3>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { label: "Mint New Batch", href: "/farmer/mint-batch", accent: "#22d3ee" },
              { label: "My Batches", href: "/farmer/batches", accent: "#3b82f6" },
              { label: "Telemetry", href: "/farmer/telemetry", accent: "#fbbf24" },
              { label: "Yield Forecast", href: "/farmer/yield-prediction", accent: "#8b5cf6" },
            ].map(({ label, href, accent }) => (
              <a key={href} href={href} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "14px 16px", borderRadius: 14,
                background: BG_HOVER, border: "1px solid transparent",
                color: MUTED_COLOR, textDecoration: "none",
                fontFamily: FONT_BODY, fontSize: 14, fontWeight: 500, lineHeight: 1.35,
                transition: "border-color 0.2s, background 0.2s, color 0.2s",
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.background = "rgba(15,35,71,0.85)"; e.currentTarget.style.color = TITLE_COLOR; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = BG_HOVER; e.currentTarget.style.color = MUTED_COLOR; }}
              >
                <span style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: `${accent}18`, color: accent,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4m11-11h-4M5 12H1m17.07-7.07l-2.83 2.83M8.76 15.24l-2.83 2.83m15.14 0l-2.83-2.83M8.76 8.76L5.93 5.93"/></svg>
                </span>
                <span style={{ flex: 1 }}>{label}</span>
                <span style={{ opacity: 0.35 }}><ArrowRight /></span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Batches */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 18, overflow: "hidden", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${BORDER}` }}>
          <h3 style={{ ...HEADING, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Recent Batches</h3>
          <a href="/farmer/batches" style={{ fontSize: 13, color: "#22d3ee", textDecoration: "none", fontWeight: 600, fontFamily: FONT_DISPLAY, transition: "color 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#67e8f9")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#22d3ee")}
          >View All →</a>
        </div>

        <div className="hidden sm:grid" style={{ gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.8fr", padding: "10px 22px", background: BG_ELEVATED, borderBottom: `1px solid ${BORDER}`, fontSize: 11, fontWeight: 700, color: DIM_COLOR, fontFamily: FONT_DISPLAY, letterSpacing: "0.06em", textTransform: "uppercase", gap: 12 }}>
          <span>Batch ID</span><span>Crop</span><span>Status</span><span>Date</span><span>Temp</span>
        </div>

        {MOCK_BATCHES.map((b) => {
          const st = STATUS_META[b.status];
          return (
            <div key={b.id} className="hidden sm:grid items-center" style={{
              gridTemplateColumns: "1.4fr 1fr 1fr 1fr 0.8fr",
              padding: "14px 22px", borderBottom: `1px solid ${BORDER}`,
              fontSize: 13.5, color: TEXT_COLOR, fontFamily: FONT_BODY, gap: 12,
              transition: "background 0.15s",
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = BG_HOVER)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontFamily: FONT_MONO, fontWeight: 600, color: TITLE_COLOR }}>{b.id}</span>
              <span>{b.crop}</span>
              <span><span style={badge(st.bg, st.fg, st.border)}>{st.label}</span></span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED_COLOR }}>{b.date}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: MUTED_COLOR }}>{b.temp}</span>
            </div>
          );
        })}

        <div className="sm:hidden" style={{ display: "flex", flexDirection: "column" }}>
          {MOCK_BATCHES.map((b) => {
            const st = STATUS_META[b.status];
            return (
              <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: `1px solid ${BORDER}`, fontFamily: FONT_BODY }}>
                <div>
                  <span style={{ fontFamily: FONT_MONO, fontWeight: 700, color: TITLE_COLOR, fontSize: 13.5, display: "block", marginBottom: 3 }}>{b.id}</span>
                  <span style={{ fontSize: 12.5, color: MUTED_COLOR }}>{b.crop} · {b.date}</span>
                </div>
                <span style={{ ...badge(st.bg, st.fg, st.border), fontSize: 10.5, padding: "3px 9px" }}>{st.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Alerts */}
      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 22 }}>
        <h3 style={{ ...HEADING, fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 14px" }}>Recent Alerts</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MOCK_ALERTS.map((a) => {
            const colors = a.type === "warning"
              ? { bg: "rgba(245,158,11,0.1)", fg: "#fcd34d", border: "rgba(245,158,11,0.25)" }
              : { bg: "rgba(6,182,212,0.1)", fg: "#67e8f9", border: "rgba(6,182,212,0.25)" };
            return (
              <div key={a.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px", borderRadius: 14, background: BG_HOVER, border: `1px solid ${colors.border}` }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors.fg, boxShadow: `0 0 8px ${colors.fg}50`, marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13.5, color: TEXT_COLOR, fontFamily: FONT_BODY, margin: 0, lineHeight: 1.5 }}>{a.msg}</p>
                  <span style={{ fontSize: 11.5, color: MUTED_COLOR, marginTop: 4, display: "block", fontFamily: FONT_MONO }}>{a.time}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
