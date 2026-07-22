import { useEffect, useRef, useState } from "react";

export interface CountUpOptions {
  /** final number to count to (default 0) */
  to: number;
  /** suffix string appended after the number (default "") */
  suffix?: string;
  /** decimals to show (default 0) */
  decimals?: number;
  /** duration in ms (default 2200) */
  duration?: number;
}

export function useCountUp(opts: CountUpOptions, inView: boolean, reducedMotion: boolean): string {
  const { to, suffix = "", decimals = 0, duration = 2200 } = opts;
  const [display, setDisplay] = useState(() => format(reducedMotion ? to : 0, decimals, suffix));
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) {
      setDisplay(format(to, decimals, suffix));
      return;
    }
    startRef.current = null;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = eased * to;
      setDisplay(format(current, decimals, suffix));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // intentionally only re-run when inView flips true
  }, [inView, reducedMotion, to, suffix, decimals, duration]);

  return display;
}

function format(n: number, decimals: number, suffix: string): string {
  return `${n.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}${suffix}`;
}
