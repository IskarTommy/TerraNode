import { useCountUp, useInView, useReducedMotion } from "../../hooks";

interface Stat {
  value: number;
  suffix: string;
  label: string;
  decimals?: number;
  gradient: "emerald" | "cyan" | "gold";
}

const STATS: Stat[] = [
  { value: 12_480, suffix: "+", label: "Batches Minted", gradient: "emerald" },
  { value: 847, suffix: "", label: "Active Farmers", gradient: "cyan" },
  { value: 99_97, suffix: "%", label: "Data Integrity", decimals: 2, gradient: "gold" },
  { value: 3_291, suffix: "", label: "Daily Transfers", gradient: "emerald" },
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
    <section ref={ref} className="stats-band" aria-label="Platform statistics">
      <div className={`stats-band-grid${inView ? " in-view" : ""}`}>
        {STATS.map((s, i) => (
          <StatCell key={i} stat={s} inView={inView} reducedMotion={reducedMotion} />
        ))}
      </div>
    </section>
  );
}
