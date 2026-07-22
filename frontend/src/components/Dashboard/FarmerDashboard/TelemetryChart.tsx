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
  temperature:   { label: 'Temperature',   unit: '°C',  color: '#22d3ee' },
  humidity:      { label: 'Humidity',      unit: '%',   color: '#3b82f6' },
  ph:            { label: 'pH Level',      unit: '',     color: '#fbbf24' },
  soilMoisture:  { label: 'Soil Moisture', unit: '%',   color: '#10b981' },
  lightIntensity:{ label: 'Light',         unit: 'lux',  color: '#f59e0b' },
  co2:           { label: 'CO₂',           unit: 'ppm',  color: '#8b5cf6' },
} as const;

const TIME_RANGE_LABELS = {
  '1h': '1H', '24h': '24H', '7d': '7D', '30d': '30D',
} as const;

/* ── Inline styles for chart (no CSS variable dependency) ─────────────────── */
const AXIS_TICK = { fill: '#64748b', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" };
const AXIS_LINE = { stroke: '#1e293b' };
const GRID_STROKE = '#1e293b';
const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#0c1e3a', border: '1px solid #334155', borderRadius: 12,
  padding: '12px 14px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
};
const TOOLTIP_LABEL: React.CSSProperties = {
  fontSize: 11, color: '#64748b', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8,
};
const TOOLTIP_ROW: React.CSSProperties = {
  fontSize: 13, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0',
};
const TOOLTIP_VAL: React.CSSProperties = {
  fontWeight: 600, color: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace",
};

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string;
}) {
  if (!active || !payload || !label) return null;
  const timeLabel = new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={TOOLTIP_LABEL}>{timeLabel}</p>
      {payload.map((entry, i) => (
        <div key={i} style={TOOLTIP_ROW}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', fontWeight: 500, flex: 1 }}>
            {METRIC_CONFIG[entry.name as keyof typeof METRIC_CONFIG]?.label || entry.name}
          </span>
          <span style={TOOLTIP_VAL}>
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 3 }}>
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
        <div key={i} className="flex items-center gap-2 cursor-pointer"
          style={{ opacity: entry.inactive ? 0.35 : 1, transition: 'opacity 0.2s' }}
          onClick={() => {}}
        >
          <span style={{ width: 10, height: 3, borderRadius: 2, background: entry.color, display: 'inline-block' }} />
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
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
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
      fontFamily: "'Space Grotesk', sans-serif", letterSpacing: '0.02em',
      border: 'none', cursor: 'pointer', transition: 'all 0.2s ease',
      background: active ? '#22d3ee' : 'rgba(15,35,71,0.7)',
      color: active ? '#0a0f1a' : '#64748b',
    }}>
      {label}
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
          <h3 style={HEADING_STYLE}>Telemetry</h3>
          <div className="flex items-center gap-2">
            {Object.values(TIME_RANGE_LABELS).map((l) => <RangeBtn key={l} label={l} active={false} onClick={() => {}} />)}
          </div>
        </div>
        <div className="animate-pulse" style={{ height, borderRadius: 12, background: 'rgba(15,35,71,0.5)' }} />
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card variant="glass" padding="md" className={className}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={HEADING_STYLE}>Telemetry</h3>
          <div className="flex items-center gap-2">
            {Object.entries(TIME_RANGE_LABELS).map(([v, l]) => (
              <RangeBtn key={v} label={l} active={v === timeRange} onClick={() => onTimeRangeChange(v as any)} />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <svg className="mx-auto mb-3" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2v6a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p style={{ fontSize: 14, color: '#94a3b8', fontFamily: "'Outfit', sans-serif" }}>No telemetry data available</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Connect sensors to start monitoring</p>
          </div>
        </div>
      </Card>
    );
  }

  const activeMetrics = metrics.filter((m) => data.some((d) => d[m] !== undefined));

  return (
    <Card variant="glass" padding="md" className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 style={HEADING_STYLE}>Sensor Telemetry</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(TIME_RANGE_LABELS).map(([v, l]) => (
            <RangeBtn key={v} label={l} active={v === timeRange} onClick={() => onTimeRangeChange(v as any)} />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE}
              interval="preserveStartEnd"
            />
            <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
            {showLegend && <Legend content={<CustomLegend />} wrapperStyle={{ paddingTop: 10 }} />}
            {activeMetrics.map((metric) => {
              const cfg = METRIC_CONFIG[metric];
              return (
                <Area key={metric} type="monotone" dataKey={metric} name={metric}
                  stroke={cfg.color} fill={cfg.color} fillOpacity={0.08}
                  strokeWidth={2.5} dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, fill: cfg.color, stroke: '#0a0f1a' }}
                  isAnimationActive={!window.matchMedia('(prefers-reduced-motion: reduce)').matches}
                  animationDuration={800}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Latest values */}
      <div className="flex flex-wrap items-center gap-4" style={{ marginTop: 16 }}>
        {activeMetrics.map((metric) => {
          const cfg = METRIC_CONFIG[metric];
          const latest = data[data.length - 1]?.[metric];
          if (latest === undefined) return null;
          return (
            <div key={metric} className="flex items-center gap-2">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
              <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>{cfg.label}</span>
              <span style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                {typeof latest === 'number' ? latest.toFixed(1) : latest}
                <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 2 }}>{cfg.unit}</span>
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

TelemetryChart.displayName = 'TelemetryChart';

/* ── Shared heading style ──────────────────────────────────────────────────── */
const HEADING_STYLE: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 15, fontWeight: 600, color: '#e2e8f0',
  letterSpacing: '-0.01em', lineHeight: 1.4, margin: 0,
};
