import {
  LineChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area,
} from 'recharts';
import { Card } from '../../Common/Card';

export interface TelemetryDataPoint {
  timestamp: string;
  temperature?: number;
  humidity?: number;
  ph?: number;
  soilMoisture?: number;
  lightIntensity?: number;
  co2?: number;
}

export interface TelemetryChartProps {
  data: TelemetryDataPoint[];
  metrics: Array<'temperature' | 'humidity' | 'ph' | 'soilMoisture' | 'lightIntensity' | 'co2'>;
  timeRange: '1h' | '24h' | '7d' | '30d';
  onTimeRangeChange: (range: '1h' | '24h' | '7d' | '30d') => void;
  loading?: boolean;
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const METRIC_CONFIG = {
  temperature:   { label: 'Temperature',   unit: '°C',  color: 'var(--chart-palette-5)' },
  humidity:      { label: 'Humidity',      unit: '%',   color: 'var(--chart-palette-2)' },
  ph:            { label: 'pH Level',      unit: '',     color: 'var(--chart-palette-3)' },
  soilMoisture:  { label: 'Soil Moisture', unit: '%',   color: 'var(--chart-palette-1)' },
  lightIntensity:{ label: 'Light',         unit: 'lux',  color: 'var(--chart-palette-3)' },
  co2:           { label: 'CO₂',           unit: 'ppm',  color: 'var(--chart-palette-4)' },
} as const;

const TIME_RANGE_LABELS = {
  '1h': '1H', '24h': '24H', '7d': '7D', '30d': '30D',
} as const;

/* ── Tooltip ─────────────────────────────────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string;
}) {
  if (!active || !payload || !label) return null;
  const timeLabel = new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="telemetry-tooltip">
      <p className="telemetry-tooltip__time">{timeLabel}</p>
      {payload.map((entry, i) => (
        <div key={i} className="telemetry-tooltip__row">
          <span className="telemetry-tooltip__dot" style={{ background: entry.color }} />
          <span className="telemetry-tooltip__label">
            {METRIC_CONFIG[entry.name as keyof typeof METRIC_CONFIG]?.label || entry.name}
          </span>
          <span className="telemetry-tooltip__val">
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            <span className="telemetry-tooltip__unit">
              {METRIC_CONFIG[entry.name as keyof typeof METRIC_CONFIG]?.unit || ''}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string; inactive: boolean }> }) {
  if (!payload) return null;
  return (
    <div className="flex flex-wrap items-center gap-4">
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 cursor-pointer transition-opacity duration-200"
          style={{ opacity: entry.inactive ? 0.35 : 1 }}
          onClick={() => {}}>
          <span className="telemetry-legend-swatch" style={{ background: entry.color }} />
          <span className="telemetry-legend-label">
            {METRIC_CONFIG[entry.value as keyof typeof METRIC_CONFIG]?.label || entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Range buttons ─────────────────────────────────────────────────────────── */
function RangeBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`chart-range-btn${active ? ' chart-range-btn--active' : ''}`}
    >
      {label}
    </button>
  );
}

/* ── Metric chip ──────────────────────────────────────────────────────────── */
function MetricChip({ label, color, active, onClick }: {
  label: string; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`metric-chip${active ? ' metric-chip--active' : ''}`}
      style={{ '--chip-color': color } as React.CSSProperties}
    >
      <span className="metric-chip__dot" style={{ background: color }} />
      <span>{label}</span>
    </button>
  );
}

export function TelemetryChart({
  data, metrics, timeRange, onTimeRangeChange,
  loading = false, height = 320, showLegend = true, className,
}: TelemetryChartProps) {
  const hasData = data.length > 0;

  if (loading) {
    return (
      <Card variant="glass" padding="md" className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="chart-heading">Telemetry</h3>
          <div className="flex items-center gap-2">
            {Object.values(TIME_RANGE_LABELS).map((l) => <RangeBtn key={l} label={l} active={false} onClick={() => {}} />)}
          </div>
        </div>
        <div className="animate-pulse rounded-xl" style={{ height, background: 'var(--color-bg-tertiary)' }} />
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card variant="glass" padding="md" className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="chart-heading">Telemetry</h3>
          <div className="flex items-center gap-2">
            {Object.entries(TIME_RANGE_LABELS).map(([v, l]) => (
              <RangeBtn key={v} label={l} active={v === timeRange} onClick={() => onTimeRangeChange(v as '1h' | '24h' | '7d' | '30d')} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <svg className="mx-auto mb-3 text-slate-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2v6a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p className="text-sm text-fg-secondary">No telemetry data available</p>
            <p className="text-xs text-fg-muted mt-1">Connect sensors to start monitoring</p>
          </div>
        </div>
      </Card>
    );
  }

  const activeMetrics = metrics.filter((m) => data.some((d) => d[m] !== undefined));

  return (
    <Card variant="glass" padding="md" className={className}>
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="chart-heading">Sensor Telemetry</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(TIME_RANGE_LABELS).map(([v, l]) => (
              <RangeBtn key={v} label={l} active={v === timeRange} onClick={() => onTimeRangeChange(v as '1h' | '24h' | '7d' | '30d')} />
            ))}
          </div>
        </div>

        {/* Metric selector chips */}
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(METRIC_CONFIG) as Array<keyof typeof METRIC_CONFIG>).map((key) => {
            const cfg = METRIC_CONFIG[key];
            const isActive = metrics.includes(key);
            return (
              <MetricChip
                key={key}
                label={cfg.label}
                color={cfg.color.includes('var(') ? resolveChartColor(key) : cfg.color}
                active={isActive}
                onClick={() => {
                  if (isActive && metrics.length > 1) {
                    onTimeRangeChange(timeRange); // keep time range, trigger re-render
                  }
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12, fontFamily: 'var(--font-family-mono)' }}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={{ stroke: 'var(--chart-grid)' }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 12, fontFamily: 'var(--font-family-mono)' }}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={{ stroke: 'var(--chart-grid)' }}
              tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
            {showLegend && <Legend content={<CustomLegend />} wrapperStyle={{ paddingTop: 10 }} />}
            {activeMetrics.map((metric) => {
              const cfg = METRIC_CONFIG[metric];
              const color = resolveChartColor(metric);
              return (
                <Area key={metric} type="monotone" dataKey={metric} name={cfg.label}
                  stroke={color} fill={color} fillOpacity={0.08}
                  strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: color, stroke: 'var(--color-bg-primary)' }}
                  isAnimationActive={!window.matchMedia('(prefers-reduced-motion: reduce)').matches}
                  animationDuration={800}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Latest values */}
      <div className="flex flex-wrap items-center gap-4 mt-4">
        {activeMetrics.map((metric) => {
          const cfg = METRIC_CONFIG[metric];
          const color = resolveChartColor(metric);
          const latest = data[data.length - 1]?.[metric];
          if (latest === undefined) return null;
          return (
            <div key={metric} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-xs text-fg-secondary font-medium">{cfg.label}</span>
              <span className="text-sm text-fg-primary font-bold font-mono">
                {typeof latest === 'number' ? latest.toFixed(1) : latest}
                <span className="font-normal text-fg-muted ml-1">{cfg.unit}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

TelemetryChart.displayName = 'TelemetryChart';

/* ── Color resolver: maps metric keys to the concrete chart palette colors ── */
const CHART_COLOR_MAP: Record<string, string> = {
  temperature: '#06b6d4',
  humidity: '#3b82f6',
  ph: '#fbbf24',
  soilMoisture: '#10b981',
  lightIntensity: '#f59e0b',
  co2: '#8b5cf6',
};

function resolveChartColor(metric: string): string {
  return CHART_COLOR_MAP[metric] || '#22d3ee';
}
