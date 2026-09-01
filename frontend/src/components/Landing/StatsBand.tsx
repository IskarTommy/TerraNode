import { useCountUp, useInView, useReducedMotion } from "../../hooks";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
  gradient: "emerald" | "cyan" | "gold";
}

const STATS: Stat[] = [
  { value: 256, suffix: "", label: "AES-GCM key bits", gradient: "emerald" },
  { value: 96, suffix: "", label: "Unique nonce bits", gradient: "cyan" },
  { value: 4, suffix: "", label: "Custody states", gradient: "gold" },
  { value: 600, suffix: "s", label: "Prediction cache TTL", gradient: "emerald" },
];

function StatCell({ stat, inView, reducedMotion }: { stat: Stat; inView: boolean; reducedMotion: boolean }) {
  const displayed = useCountUp(
    { to: stat.value, suffix: stat.suffix, decimals: stat.decimals ?? 0 },
    inView,
    reducedMotion
  );
  const gradientClass =
    stat.gradient === "emerald"
      ? "text-gradient-emerald"
      : stat.gradient === "cyan"
        ? "text-gradient-emerald"
        : "text-gradient-gold";

  return (
    <div className="stat-cell">
      <div className={`stat-value ${gradientClass}`} aria-hidden="true">
        {displayed}
      </div>
      <div className="sr-only">{stat.value.toFixed(stat.decimals ?? 0)}{stat.suffix}</div>
      <div className="stat-label">{stat.label}</div>
    </div>
  );
}

export function StatsBand() {
  const reducedMotion = useReducedMotion();
  const [inView, ref] = useInView({ threshold: 0.3 });

  return (
    <section ref={ref} className="stats-band" aria-label="Security and data design facts">
      <div className={`stats-band-grid${inView ? " in-view" : ""}`}>
        {STATS.map((s, i) => (
          <StatCell key={i} stat={s} inView={inView} reducedMotion={reducedMotion} />
        ))}
      </div>
    </section>
  );
}
