import { cn } from '../../../utils/cn';
import { Card } from '../../Common/Card';
import { useCountUp } from '../../../hooks/useCountUp';
import { useInView } from '../../../hooks/useInView';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'info';
  loading?: boolean;
  layout?: 'left' | 'centered';
  animate?: boolean;
  unit?: string;
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

function CenteredTrendIndicator({ trend, value, label }: {
  trend: 'up' | 'down' | 'neutral'; value: string; label: string;
}) {
  const isPos = trend === 'up';
  const isNeu = trend === 'neutral';
  const color = isNeu ? '#64748b' : isPos ? '#10b981' : '#ef4444';
  return (
    <div className="flex items-center gap-2 text-xs justify-center">
      {!isNeu && (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {isPos
            ? <path d="M7 17l5-5m0 0l5 5m-5-5v12"/>
            : <path d="M7 7l5 5m0 0l5-5m-5 5v12"/>}
        </svg>
      )}
      <span className={cn('font-medium', isPos ? 'text-emerald-400' : !isNeu ? 'text-red-400' : 'text-slate-500')}>
        {isNeu ? '—' : value}
      </span>
      <span className="text-slate-600">·</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

function AnimatedValue({ value, unit, animate }: { value: string | number; unit?: string; animate: boolean }) {
  const [inView, ref] = useInView();
  const reducedMotion = useReducedMotion();
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  const targetVal = isFinite(numericValue) ? numericValue : 0;

  const countUpDisplay = useCountUp(
    { to: targetVal, decimals: targetVal % 1 !== 0 ? 1 : 0 },
    inView,
    reducedMotion
  );

  const display = animate && isFinite(numericValue)
    ? countUpDisplay
    : typeof value === 'number' && numericValue % 1 !== 0
      ? numericValue.toFixed(1)
      : String(value);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {unit && <span className="text-xs font-medium text-slate-500 ml-1.5">{unit}</span>}
    </span>
  );
}

export function StatCard({
  title, value, change = 0, changeLabel = '', trend = 'neutral',
  icon, variant = 'primary', loading = false, layout = 'left',
  animate = false, unit, className,
}: StatCardProps) {
  const s = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  const isCentered = layout === 'centered';

  if (loading) {
    return (
      <Card variant="glass" padding="none" className={cn(className)}>
        <div className={cn('p-6', isCentered ? 'flex flex-col gap-6' : 'flex items-start justify-between gap-4')}>
          <div className={cn('flex flex-col gap-3', isCentered ? 'items-center' : 'flex-1')}>
            <div className="h-3 w-3/5 rounded bg-slate-700/60 animate-pulse" />
            <div className={cn('h-9 rounded-lg bg-slate-700/60 animate-pulse', isCentered ? 'w-24' : 'w-2/5')} />
            <div className={cn('h-2.5 rounded bg-slate-700/40 animate-pulse', isCentered ? 'w-3/5' : 'w-3/4')} />
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-700/60 animate-pulse shrink-0" />
        </div>
      </Card>
    );
  }

  if (isCentered) {
    return (
      <Card variant="glass" padding="none"
        className={cn('relative overflow-hidden group', className)}>
        <div className="absolute inset-0 rounded-[inherit] pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${s.iconBg} 0%, transparent 60%)` }} />
        <div className="relative z-10 p-6 flex flex-col gap-6 transition-colors hover:border-slate-700">
          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              {title}
            </span>
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
                {icon}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-center justify-center text-center">
            <div className="flex items-baseline gap-1.5 justify-center">
              <span className="text-3xl font-semibold text-white tracking-tight font-display">
                <AnimatedValue value={value} unit={unit} animate={animate} />
              </span>
            </div>
            {changeLabel && (
              <CenteredTrendIndicator
                trend={trend}
                value={trend === 'neutral' ? '' : `${Math.abs(change).toFixed(1)}%`}
                label={changeLabel}
              />
            )}
          </div>
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

      <div className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${s.iconBg} 0%, transparent 60%)` }} />

      <div className="flex items-start justify-between gap-4 relative z-10 p-6">
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <p className="text-[10px] sm:text-xs font-semibold text-slate-400 tracking-wider uppercase font-display truncate leading-tight">
            {title}
          </p>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-100 font-display leading-none tracking-tight">
            <AnimatedValue value={value} unit={unit} animate={animate} />
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
