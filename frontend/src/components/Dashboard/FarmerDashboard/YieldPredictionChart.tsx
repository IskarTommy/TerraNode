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

const PREDICTED_COLOR = 'var(--chart-palette-5)';
const PREDICTED_COLOR_RESOLVED = '#06b6d4';
const ACTUAL_COLOR = 'var(--chart-palette-1)';
const ACTUAL_COLOR_RESOLVED = '#10b981';

function YieldTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || !label) return null;
  return (
    <div className="telemetry-tooltip">
      <p className="telemetry-tooltip__time">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="telemetry-tooltip__row">
          <span className="telemetry-tooltip__dot" style={{ background: entry.color }} />
          <span className="telemetry-tooltip__label">{entry.name}</span>
          <span className="telemetry-tooltip__val">
            {entry.value.toFixed(1)}
            <span className="telemetry-tooltip__unit">t/ha</span>
          </span>
        </div>
      ))}
    </div>
  );
}

export function YieldPredictionChart({
  data, loading = false, height = 320, showConfidenceInterval = true, className,
}: YieldPredictionChartProps) {
  const hasData = data.length > 0;
  const displayData = hasData ? data : [];
  const hasActual = data.some((d) => d.actual !== undefined);

  if (loading) {
    return (
      <Card variant="glass" padding="md" className={className}>
        <h3 className="chart-heading">Yield Forecast</h3>
        <div className="animate-pulse rounded-xl" style={{ height, background: 'var(--color-bg-tertiary)' }} />
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card variant="glass" padding="md" className={className}>
        <h3 className="chart-heading">Yield Forecast</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="mx-auto mb-3 text-fg-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2v6a2 2 0 002-2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            <p className="text-sm text-fg-secondary">No yield data available</p>
            <p className="text-xs text-fg-muted mt-1">Run prediction model to see forecasts</p>
          </div>
        </div>
      </Card>
    );
  }

  const showBand = showConfidenceInterval && displayData.some((d) => d.lowerBound != null && d.upperBound != null);

  return (
    <Card variant="glass" padding="md" className={className}>
      <h3 className="chart-heading">Yield Forecast</h3>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={displayData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="year"
              tick={{ fill: 'var(--chart-axis)', fontSize: 12, fontFamily: 'var(--font-family-mono)' }}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis
              width={65}
              tick={{ fill: 'var(--chart-axis)', fontSize: 12, fontFamily: 'var(--font-family-mono)' }}
              axisLine={{ stroke: 'var(--chart-grid)' }}
              tickLine={{ stroke: 'var(--chart-grid)' }}
              tickFormatter={(v) => `${v.toFixed(1)} t/ha`} />
            <Tooltip content={<YieldTooltip />} wrapperStyle={{ outline: 'none' }} />
            <Legend wrapperStyle={{ paddingTop: 10 }}
              formatter={(v) => <span className="text-xs text-fg-secondary">{v}</span>} />

            {showBand && (
              <>
                <Bar dataKey="lowerBound" name="Confidence" fill={PREDICTED_COLOR_RESOLVED} fillOpacity={0.06} stroke="none" maxBarSize={48} />
                <Bar dataKey="upperBound" fill={PREDICTED_COLOR_RESOLVED} fillOpacity={0.06} stroke="none" maxBarSize={48} />
              </>
            )}

            <Bar dataKey="predicted" name="Predicted" fill={PREDICTED_COLOR_RESOLVED} fillOpacity={0.85} maxBarSize={36} radius={[6, 6, 0, 0]}>
              {displayData.map((entry, i) => (
                <Cell key={`p-${i}`} fill={PREDICTED_COLOR_RESOLVED} fillOpacity={entry.actual !== undefined ? 1 : 0.85} />
              ))}
            </Bar>

            {hasActual && (
              <Bar dataKey="actual" name="Actual" fill={ACTUAL_COLOR_RESOLVED} fillOpacity={0.9} maxBarSize={36} radius={[6, 6, 0, 0]}>
                {displayData.map((entry, i) => (
                  <Cell key={`a-${i}`} fill={ACTUAL_COLOR_RESOLVED} fillOpacity={0.9} />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Latest prediction stats */}
      <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {displayData.slice(-1).map((latest, i) => (
          <div key={i} className="yield-stat-card">
            <p className="yield-stat-card__label">Latest Prediction</p>
            <p className="yield-stat-card__value">
              {latest.predicted.toFixed(1)} <span className="yield-stat-card__unit">t/ha</span>
            </p>
            {latest.confidence !== undefined && (
              <p className="yield-stat-card__confidence">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {latest.confidence}% confidence
              </p>
            )}
            {latest.actual !== undefined && (
              <p className="text-xs text-fg-muted mt-1">Actual: {latest.actual.toFixed(1)} t/ha</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

YieldPredictionChart.displayName = 'YieldPredictionChart';
