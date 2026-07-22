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

export function StatsBand() {
  const reducedMotion = useReducedMotion();
  const [inView, ref] = useInView({ threshold: 0.3 });

  return (
    <section ref={ref} className="stats-band" aria-label="Platform statistics">
      <div className={`stats-band-grid${inView ? " in-view" : ""}`}>
        {STATS.map((s, i) => {
          const displayed = useCountUp(
            { to: s.value, suffix: s.suffix, decimals: s.decimals ?? 0 },
            inView,
            reducedMotion
          );
          const gradientClass =
            s.gradient === "emerald"
              ? "text-gradient-emerald"
              : s.gradient === "cyan"
                ? "text-gradient-emerald"
                : "text-gradient-gold";
          return (
            <div className="stat-cell" key={i}>
              <div className={`stat-value ${gradientClass}`} aria-hidden="true">
                {displayed}
              </div>
              <div className="sr-only">{s.value.toFixed(s.decimals ?? 0)}{s.suffix}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
