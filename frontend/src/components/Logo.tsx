import type { FC } from "react";

interface LogoProps {
  className?: string;
  showText?: boolean;
  textClassName?: string;
  size?: number;
}

export const Logo: FC<LogoProps> = ({
  className = "w-9 h-9",
  showText = true,
  textClassName = "text-xl font-bold tracking-tight text-white",
  size,
}) => {
  return (
    <div className="inline-flex items-center gap-3 select-none">
      {/* High-Tech Provenance Tree SVG */}
      <svg
        className={size ? undefined : className}
        style={size ? { width: size, height: size } : undefined}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Gradient: Emerald -> Cyan */}
          <linearGradient
            id="tnTreeGrad"
            x1="0"
            y1="40"
            x2="40"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#059669" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          {/* Glow Filter for Canopy Nodes */}
          <filter
            id="tnGlow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Tech Frame / Hex Shield */}
        <path
          d="M20 3L35 11.5V28.5L20 37L5 28.5V11.5L20 3Z"
          stroke="url(#tnTreeGrad)"
          strokeWidth="1.25"
          strokeOpacity="0.35"
          strokeDasharray="3 2"
        />

        {/* Tree Trunk & Circuit Branches */}
        {/* Main Trunk */}
        <path
          d="M20 33V20"
          stroke="url(#tnTreeGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Left Primary Branch */}
        <path
          d="M20 25C14 25 11 20 11 15V13"
          stroke="url(#tnTreeGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Right Primary Branch */}
        <path
          d="M20 22C26 22 29 18 29 12V10"
          stroke="url(#tnTreeGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Inner Branch */}
        <path
          d="M20 18C16 18 15 14 15 11"
          stroke="url(#tnTreeGrad)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        {/* Center Stem */}
        <path
          d="M20 20V8"
          stroke="url(#tnTreeGrad)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Provenance Network Nodes (Tree Canopy) */}
        {/* Top Center Node (Pinnacle) */}
        <circle cx="20" cy="7" r="2.5" fill="#10B981" filter="url(#tnGlow)" />
        <circle cx="20" cy="7" r="1" fill="#FFFFFF" />
        {/* Inner Left Node */}
        <circle cx="15" cy="10" r="2" fill="#06B6D4" />
        {/* Outer Left Leaf Node */}
        <circle cx="11" cy="12" r="2.5" fill="#10B981" filter="url(#tnGlow)" />
        <circle cx="11" cy="12" r="1" fill="#FFFFFF" />
        {/* Outer Right Leaf Node */}
        <circle cx="29" cy="9" r="2.5" fill="#06B6D4" filter="url(#tnGlow)" />
        <circle cx="29" cy="9" r="1" fill="#FFFFFF" />
        {/* Base Root Node */}
        <circle cx="20" cy="33" r="2" fill="#059669" />
      </svg>

      {/* Brand Name */}
      {showText && (
        <span className={textClassName}>
          Terra<span className="text-emerald-400">Node</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
