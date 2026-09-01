import { useRef, useEffect, useCallback } from "react";
import { useReducedMotion } from "../../hooks";
import "./Atmosphere.css";

const EPS = 0.0001;
const PARTICLE_COUNT = 64;
const CONNECT_DIST = 140;
const MOUSE_RADIUS = 180;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
}

type Variant = "immersive" | "subtle";

interface AtmosphereProps {
  variant?: Variant;
  particles?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Atmosphere({
  variant = "immersive",
  particles = true,
  className = "",
  children,
}: AtmosphereProps) {
  const reducedMotion = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef(0);
  const mouseRef = useRef<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  const showOrbs = !reducedMotion;
  const showGrid = true;
  const showParticles = particles && !reducedMotion;

  // ─── Mouse tracking (orb parallax) ────────────────────────────────
  const handleMouse = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !showOrbs) return;
    el.addEventListener("mousemove", handleMouse);
    return () => el.removeEventListener("mousemove", handleMouse);
  }, [showOrbs, handleMouse]);

  // ─── Particle network (canvas) ────────────────────────────────────
  useEffect(() => {
    if (!showParticles) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    function seed(): Particle[] {
      return Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1 + Math.random() * 1.6,
        opacity: 0.35 + Math.random() * 0.55,
      }));
    }
    let pts = seed();

    const onResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", onResize);

    const tick = () => {
      ctx!.clearRect(0, 0, width, height);

      for (const p of pts) {
        // mouse repulsion
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const d = Math.sqrt(dx * dx + dy * dy) || EPS;
        if (d < MOUSE_RADIUS) {
          const f = ((MOUSE_RADIUS - d) / MOUSE_RADIUS) * 0.018;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
        }
        p.vx *= 0.999;
        p.vy *= 0.999;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(148,230,210,${p.opacity})`;
        ctx!.fill();
      }

      // connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i], b = pts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < CONNECT_DIST) {
            const a2 = (1 - d / CONNECT_DIST) * 0.18;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.strokeStyle = `rgba(94,234,212,${a2})`;
            ctx!.lineWidth = 0.5;
            ctx!.stroke();
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else rafRef.current = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [showParticles]);

  return (
    <div
      ref={containerRef}
      data-atmosphere
      className={`atm atm--${variant} ${className}`}
      aria-hidden="true"
    >
      <div className="atm-layer atm-glow" />
      {showGrid && <div className="atm-layer atm-grid" />}

      {showOrbs && (
        <div className="atm-layer">
          <div className="atm-orb atm-orb-1" />
          <div className="atm-orb atm-orb-2" />
          <div className="atm-orb atm-orb-3" />
        <div className="atm-orb atm-orb-4" />
        <div className="atm-orb atm-orb-5" />
        </div>
      )}

      {showParticles && (
        <div className="atm-layer">
          <canvas ref={canvasRef} />
        </div>
      )}

      <div className="atm-content">{children}</div>
    </div>
  );
}
