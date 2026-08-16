import React, { useRef, useEffect } from "react";

// TerraNode Palette Integration
const COLORS = {
  emerald: "rgba(16, 185, 129, 0.5)", // Particle color
  cyan: "rgba(6, 182, 212, 0.15)", // Connection lines
};

// Configuration for density and distance
const PARTICLE_COUNT_RATIO = 0.00003; // Controls how many particles per pixel
const CONNECTION_DISTANCE = 160; // Max distance for connecting lines

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export const CanvasBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const mousePosition = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];

    // 1. Memory Leak Prevention: Strict tracking of the animation frame
    const cancelAnimation = () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };

    // Initialize/Reset Canvas size and particles
    const initCanvas = () => {
      cancelAnimation();
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const particleCount = Math.floor(
        canvas.width * canvas.height * PARTICLE_COUNT_RATIO
      );
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4, // Slower for subtlety
          vy: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 1.5 + 0.5, // Variance in size
        });
      }
      // Start the loop
      animate();
    };

    // The Animation Loop
    const animate = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Enable subtle glow (emerald accents)
      ctx.shadowBlur = 4;
      ctx.shadowColor = COLORS.emerald;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // Movement
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off walls
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.emerald;
        ctx.fill();

        // Mouse interaction (pull nearby particles slightly)
        const dxMouse = mousePosition.current.x - p.x;
        const dyMouse = mousePosition.current.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 200) {
          p.x += dxMouse * 0.005;
          p.y += dyMouse * 0.005;
        }

        // Draw connecting lines
        // Optimization: Use separate counter to avoid redundant calculations
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            // Disable shadow for performance on lines
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            // Opacity decreases with distance
            const opacity = 1 - dist / CONNECTION_DISTANCE;
            ctx.strokeStyle = COLORS.cyan.replace(
              "0.15)",
              `${opacity * 0.15})`
            );
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // Restore shadow for next particle
            ctx.shadowBlur = 4;
            ctx.shadowColor = COLORS.emerald;
          }
        }
      }
      animationFrameId.current = requestAnimationFrame(animate);
    };

    // Interaction Listeners
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current = { x: event.clientX, y: event.clientY };
    };
    const handleMouseLeave = () => {
      mousePosition.current = { x: -1000, y: -1000 };
    };

    // Init and Bind events
    initCanvas();
    window.addEventListener("resize", initCanvas);
    window.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);

    // CRITICAL CLEANUP: Prevents memory leaks
    return () => {
      cancelAnimation();
      window.removeEventListener("resize", initCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none w-full h-full"
      style={{ background: "#060913" }} // Solid dark background base
    />
  );
};
