import { cn } from '../../../utils/cn';
import { Card } from '../../Common/Card';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
  loading?: boolean;
  className?: string;
}

const VARIANT_STYLES = {
  primary:  { iconBg: 'rgba(34,211,238,0.1)',   iconColor: '#22d3ee', border: 'rgba(34,211,238,0.2)',   trendUp: '#22d3ee', trendDown: '#ef4444' },
  success:  { iconBg: 'rgba(16,185,129,0.1)',   iconColor: '#10b981', border: 'rgba(16,185,129,0.2)',   trendUp: '#10b981', trendDown: '#ef4444' },
  warning:  { iconBg: 'rgba(245,158,11,0.1)',   iconColor: '#f59e0b', border: 'rgba(245,158,11,0.2)',   trendUp: '#f59e0b', trendDown: '#ef4444' },
  error:    { iconBg: 'rgba(239,68,68,0.1)',    iconColor: '#ef4444', border: 'rgba(239,68,68,0.2)',    trendUp: '#22d3ee', trendDown: '#ef4444' },
  neutral:  { iconBg: 'rgba(51,65,85,0.5)',     iconColor: '#94a3b8', border: 'rgba(51,65,85,0.6)',     trendUp: '#22d3ee', trendDown: '#ef4444' },
  info:     { iconBg: 'rgba(6,182,212,0.1)',    iconColor: '#06b6d4', border: 'rgba(6,182,212,0.2)',    trendUp: '#22d3ee', trendDown: '#ef4444' },
} as const;

function TrendIndicator({ trend, change, changeLabel }: {
  trend: 'up' | 'down' | 'neutral'; change: number; changeLabel: string;
}) {
  const isPos = trend === 'up';
  const isNeu = trend === 'neutral';
  const color = isNeu ? '#64748b' : isPos ? '#22d3ee' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
      {!isNeu && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isPos
            ? <path d="M7 17l5-5m0 0l5 5m-5-5v12"/>
            : <path d="M7 7l5 5m0 0l5-5m-5 5v12"/>}
        </svg>
      )}
      <span style={{ fontSize: 12, fontWeight: 600, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-0.01em' }}>
        {isNeu ? '—' : `${Math.abs(change).toFixed(1)}%`}
      </span>
      <span style={{ fontSize: 11, color: '#64748b', fontFamily: "'Outfit', sans-serif" }}>{changeLabel}</span>
    </div>
  );
}

export function StatCard({
  title, value, change = 0, changeLabel = '', trend = 'neutral',
  icon, variant = 'primary', loading = false, className,
}: StatCardProps) {
  const s = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;

  if (loading) {
    return (
      <Card variant="glass" padding="md" className={cn(className)}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            <div style={{ height: 12, width: '60%', borderRadius: 6, background: 'rgba(15,35,71,0.7)' }} />
            <div style={{ height: 32, width: '45%', borderRadius: 8, background: 'rgba(15,35,71,0.7)' }} />
            <div style={{ height: 10, width: '70%', borderRadius: 5, background: 'rgba(15,35,71,0.5)' }} />
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(15,35,71,0.7)' }} />
        </div>
      </Card>
    );
  }

  return (
    <Card
      variant="glass"
      padding="md"
      className={cn('transition-all duration-300', className)}
      style={{
        border: `1px solid ${s.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 'inherit',
        background: `linear-gradient(135deg, ${s.iconBg} 0%, transparent 60%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, position: 'relative' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 12, fontWeight: 600, color: '#64748b', letterSpacing: '0.05em',
            textTransform: 'uppercase', margin: '0 0 4px',
            fontFamily: "'Space Grotesk', sans-serif",
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </p>
          <p style={{
            fontSize: 'clamp(1.4rem, 2.2vw, 2rem)', fontWeight: 800,
            color: '#f1f5f9', letterSpacing: '-0.03em',
            fontFamily: "'Space Grotesk', sans-serif",
            lineHeight: 1.15, margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {value}
          </p>
          {changeLabel && <TrendIndicator trend={trend} change={change} changeLabel={changeLabel} />}
        </div>
        {icon && (
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: s.iconBg, color: s.iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: `1px solid ${s.border}`,
          }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

StatCard.displayName = 'StatCard';
