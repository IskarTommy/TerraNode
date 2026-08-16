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
      <Card variant="glass" padding="none" className={cn(className)}>
        <div className="p-6 flex items-start justify-between gap-4">
          <div className="flex-1 flex flex-col gap-3">
            <div className="h-3 w-3/5 rounded bg-slate-700/60 animate-pulse" />
            <div className="h-9 w-2/5 rounded-lg bg-slate-700/60 animate-pulse" />
            <div className="h-2.5 w-3/4 rounded bg-slate-700/40 animate-pulse" />
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-700/60 animate-pulse shrink-0" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="glass" padding="none"
      className={cn('relative overflow-hidden', {
        'border-l-2': variant === 'primary',
        'border-l-2 border-l-emerald-500/40!': variant === 'success',
        'border-l-2 border-l-amber-500/40!': variant === 'warning',
        'border-l-2 border-l-red-500/40!': variant === 'error',
      }, className)}>

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${s.iconBg} 0%, transparent 60%)` }} />

      <div className="flex items-start justify-between gap-4 relative z-10 p-6">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-wider uppercase font-display truncate leading-tight">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-100 font-display leading-none tracking-tight">
            {value}
          </p>
          {changeLabel && <TrendIndicator trend={trend} change={change} changeLabel={changeLabel} />}
        </div>
        {icon && (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: s.iconBg, color: s.iconColor, border: `1px solid ${s.border}` }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

StatCard.displayName = 'StatCard';
