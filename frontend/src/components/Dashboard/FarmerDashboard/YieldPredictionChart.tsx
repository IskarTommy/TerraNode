import { cn } from '../../../utils/cn';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { Card } from '../../Common/Card';

export interface YieldPredictionDataPoint {
  year: string;
  predicted: number;
  actual?: number;
  lowerBound?: number;
  upperBound?: number;
  confidence?: number;
}

export interface YieldPredictionChartProps {
  data: YieldPredictionDataPoint[];
  loading?: boolean;
  height?: number;
  showConfidenceInterval?: boolean;
  className?: string;
}

// ── Colors ──────────────────────────────────────────────────────────────────
const PREDICTED_COLOR = '#22d3ee';
const ACTUAL_COLOR = '#10b981';
const BAND_FILL = '#22d3ee';

// ── Chart style constants (hardcoded for maximum contrast) ──────────────────
const AXIS_TICK = { fill: '#64748b', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" };
const AXIS_LINE = { stroke: '#1e293b' };
const GRID_STROKE = '#1e293b';

const TOOLTIP_STYLE: React.CSSProperties = {
  background: '#0c1e3a', border: '1px solid #334155', borderRadius: 12,
  padding: '12px 14px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)',
};
const TOOLTIP_LABEL: React.CSSProperties = {
  fontSize: 13, color: '#f1f5f9', fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: 600, marginBottom: 10,
};
const TOOLTIP_ROW: React.CSSProperties = {
  fontSize: 13, color: '#e2e8f0', display: 'flex',
  alignItems: 'center', gap: 8, padding: '3px 0',
};
const TOOLTIP_VAL: React.CSSProperties = {
  fontWeight: 700, color: '#f1f5f9', fontFamily: "'JetBrains Mono', monospace",
};

// ── Tooltip ──────────────────────────────────────────────────────────────────
function YieldTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !label) return null;
  return (
    <div style={TOOLTIP_STYLE}>
      <p style={TOOLTIP_LABEL}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} style={TOOLTIP_ROW}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
          <span style={{ color: '#94a3b8', fontWeight: 500, flex: 1 }}>{entry.name}</span>
          <span style={TOOLTIP_VAL}>{entry.value.toFixed(1)} <span style={{ fontWeight: 400, color: '#64748b' }}>t/ha</span></span>
        </div>
      ))}
    </div>
  );
}

// ── Range buttons ────────────────────────────────────────────────────────────
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

// ── Main component ──────────────────────────────────────────────────────────
export function YieldPredictionChart({
  data, loading = false, height = 320, showConfidenceInterval = true, className,
}: YieldPredictionChartProps) {
  const hasData = data.length > 0;
  const displayData = hasData ? data : [];
  const hasActual = data.some((d) => d.actual !== undefined);

  if (loading) {
    return (
      <Card variant="glass" padding="md" className={className}>
        <h3 style={HEADING_STYLE}>Yield Forecast</h3>
        <div className="animate-pulse" style={{ height, borderRadius: 12, background: 'rgba(15,35,71,0.5)' }} />
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card variant="glass" padding="md" className={className}>
        <h3 style={HEADING_STYLE}>Yield Forecast</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.2" style={{ margin: '0 auto 12px', display: 'block' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2v6a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p style={{ fontSize: 14, color: '#94a3b8', fontFamily: "'Outfit', sans-serif" }}>No yield data available</p>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Run prediction model to see forecasts</p>
          </div>
        </div>
      </Card>
    );
  }

  const showBand = showConfidenceInterval && displayData.some((d) => d.lowerBound != null && d.upperBound != null);

  return (
    <Card variant="glass" padding="md" className={className}>
      <h3 style={HEADING_STYLE}>Yield Forecast</h3>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 5, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={GRID_STROKE} vertical={false} />
            <XAxis dataKey="year" tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} />
            <YAxis tick={AXIS_TICK} axisLine={AXIS_LINE} tickLine={AXIS_LINE} tickFormatter={(v) => `${v.toFixed(1)} t/ha`} />
            <Tooltip content={<YieldTooltip />} wrapperStyle={{ outline: 'none' }} />
            <Legend wrapperStyle={{ paddingTop: 10 }} formatter={(v) => <span style={{ color: '#94a3b8', fontSize: 12, fontFamily: "'Outfit', sans-serif" }}>{v}</span>} />

            {showBand && (
              <>
                <Bar dataKey="lowerBound" name="Confidence" fill={BAND_FILL} fillOpacity={0.06} stroke="none" maxBarSize={48} />
                <Bar dataKey="upperBound" fill={BAND_FILL} fillOpacity={0.06} stroke="none" maxBarSize={48} />
              </>
            )}

            <Bar dataKey="predicted" name="Predicted" fill={PREDICTED_COLOR} fillOpacity={0.85} maxBarSize={36} radius={[6, 6, 0, 0]}>
              {displayData.map((entry, i) => (
                <Cell key={`p-${i}`} fill={PREDICTED_COLOR} fillOpacity={entry.actual !== undefined ? 1 : 0.85} />
              ))}
            </Bar>

            {hasActual && (
              <Bar dataKey="actual" name="Actual" fill={ACTUAL_COLOR} fillOpacity={0.9} maxBarSize={36} radius={[6, 6, 0, 0]}>
                {displayData.map((entry, i) => (
                  <Cell key={`a-${i}`} fill={ACTUAL_COLOR} fillOpacity={0.9} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Latest stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 20 }}>
        {displayData.slice(-1).map((latest, i) => (
          <div key={i} style={{ padding: '16px', borderRadius: 12, background: 'rgba(15,35,71,0.5)', border: '1px solid #1e293b' }}>
            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px', fontFamily: "'Space Grotesk', sans-serif" }}>Latest Prediction</p>
            <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              {latest.predicted.toFixed(1)} <span style={{ fontSize: 13, color: '#64748b', fontWeight: 400 }}>t/ha</span>
            </p>
            {latest.confidence !== undefined && (
              <p style={{ fontSize: 12, color: '#10b981', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {latest.confidence}% confidence
              </p>
            )}
            {latest.actual !== undefined && (
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Actual: {latest.actual.toFixed(1)} t/ha</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

YieldPredictionChart.displayName = 'YieldPredictionChart';

const HEADING_STYLE: React.CSSProperties = {
  fontFamily: "'Space Grotesk', sans-serif",
  fontSize: 15, fontWeight: 600, color: '#e2e8f0',
  letterSpacing: '-0.01em', lineHeight: 1.4, margin: '0 0 16px',
};
