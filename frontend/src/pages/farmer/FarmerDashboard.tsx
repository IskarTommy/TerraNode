import { Link } from 'react-router-dom';
import { Card } from '../../components/Common/Card';
import { useBatches, useLatestTelemetry, useYieldPrediction } from '../../hooks/useDashboardQueries';
import { useAuth } from '../../contexts/AuthContext';

export function FarmerDashboard() {
  const { user } = useAuth();
  const telemetry = useLatestTelemetry();
  const batches = useBatches({ page_size: 5, ...(user?.id ? { farmer_id: user.id } : {}) });
  const prediction = useYieldPrediction();
  const latest = telemetry.data;

  // Derive status badges for climate metrics
  const getTempStatus = (temp?: number | null) => {
    if (temp == null) return { text: 'No Data', color: 'text-fg-muted bg-bg-tertiary' };
    if (temp >= 20 && temp <= 32) return { text: 'Optimal', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (temp > 32) return { text: 'High Heat', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { text: 'Cool', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  };

  const getMoistureStatus = (m?: number | null) => {
    if (m == null) return { text: 'No Data', color: 'text-fg-muted bg-bg-tertiary' };
    if (m >= 50 && m <= 80) return { text: 'Well Hydrated', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (m < 50) return { text: 'Dry Soil', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { text: 'High Moisture', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  };

  const getPhStatus = (ph?: number | null) => {
    if (ph == null) return { text: 'No Data', color: 'text-fg-muted bg-bg-tertiary' };
    if (ph >= 6.0 && ph <= 7.0) return { text: 'Ideal Neutral', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (ph < 6.0) return { text: 'Slightly Acidic', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    return { text: 'Alkaline', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  };

  const tempVal = latest?.temperature_celsius ?? prediction.data?.averages?.temp ?? null;
  const moistVal = latest?.soil_moisture_percentage ?? prediction.data?.averages?.moisture ?? null;
  const phVal = latest?.soil_ph ?? prediction.data?.averages?.ph ?? null;

  const tempStat = getTempStatus(tempVal);
  const moistStat = getMoistureStatus(moistVal);
  const phStat = getPhStatus(phVal);

  return (
    <div className="space-y-6" data-role="farmer">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Farm Overview</p>
          <h1 className="text-3xl font-bold text-fg-primary">Agricultural Mission Control</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Live IoT environmental sensors, blockchain produce batches, and predictive thesis model.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            className="rounded-xl border border-border-primary bg-bg-tertiary/60 px-4 py-2.5 text-sm font-medium text-fg-primary hover:border-emerald-500 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
            to="/farmer/telemetry"
          >
            <span>+</span> Add Reading
          </Link>
          <Link
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm inline-flex items-center gap-1.5"
            to="/farmer/mint-batch"
          >
            <span>+</span> Create Batch
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Temperature */}
        <Card variant="glass" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Soil Temperature</p>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${tempStat.color}`}>
              {tempStat.text}
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">
            {tempVal != null ? `${tempVal.toFixed(1)}°C` : '—'}
          </p>
          <p className="mt-1.5 text-xs text-fg-muted truncate">
            {latest?.recorded_at ? `Latest: ${new Date(latest.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'IoT Telemetry Connected'}
            {prediction.data?.averages?.temp != null && ` · 90d Avg: ${prediction.data.averages.temp}°C`}
          </p>
        </Card>

        {/* Soil Moisture */}
        <Card variant="glass" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Soil Moisture</p>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${moistStat.color}`}>
              {moistStat.text}
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">
            {moistVal != null ? `${moistVal.toFixed(1)}%` : '—'}
          </p>
          <p className="mt-1.5 text-xs text-fg-muted truncate">
            Target: 50%–80% {prediction.data?.averages?.moisture != null && `· 90d Avg: ${prediction.data.averages.moisture}%`}
          </p>
        </Card>

        {/* Soil pH */}
        <Card variant="glass" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Soil Acidity / pH</p>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${phStat.color}`}>
              {phStat.text}
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">
            {phVal != null ? phVal.toFixed(1) : '—'}
          </p>
          <p className="mt-1.5 text-xs text-fg-muted truncate">
            Scale: 0–14 {prediction.data?.averages?.ph != null && `· 90d Avg: ${prediction.data.averages.ph}`}
          </p>
        </Card>

        {/* Total Produce Batches */}
        <Card variant="glass" padding="md" className="relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Minted Batches</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
              Sui Testnet
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">
            {batches.data?.count ?? 0}
          </p>
          <p className="mt-1.5 text-xs text-fg-muted">
            Anchored to distributed ledger
          </p>
        </Card>
      </div>

      {/* Main Grid: Batches & Forecast */}
      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        {/* Recent Batches */}
        <Card variant="glass" padding="md">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-fg-primary">Recent Produce Batches</h2>
              <p className="text-xs text-fg-muted">Cryptographic custody and Sui blockchain verification</p>
            </div>
            <Link className="text-sm font-medium text-emerald-400 hover:underline" to="/farmer/batches">
              View all ({batches.data?.count ?? 0}) →
            </Link>
          </div>

          {batches.isLoading ? (
            <p className="py-10 text-center text-fg-muted">Loading batches…</p>
          ) : (
            <div className="space-y-2.5">
              {(batches.data?.results ?? []).map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between rounded-xl border border-border-primary/60 bg-bg-tertiary/40 p-3.5 hover:border-border-secondary transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="font-semibold text-sm text-fg-primary capitalize flex items-center gap-2">
                      <span>{batch.crop_type}</span>
                      {batch.sui_tx_digest && (
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                          Sui Verified
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-xs text-fg-muted mt-0.5 truncate">
                      {batch.id.slice(0, 10)}… · {Number(batch.weight_kg).toFixed(1)} kg
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 flex items-center gap-3">
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                      {batch.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
              {batches.data?.results.length === 0 && (
                <div className="py-10 text-center text-fg-muted space-y-2">
                  <p>No batches minted yet.</p>
                  <Link to="/farmer/mint-batch" className="text-emerald-400 hover:underline text-sm">
                    Mint your first produce batch on Sui →
                  </Link>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Yield Forecast */}
        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-fg-primary">Agronomic Yield Forecast</h2>
            <Link className="text-xs font-semibold text-emerald-400 hover:underline" to="/farmer/yield-forecast">
              Full Projections →
            </Link>
          </div>
          <p className="text-xs text-fg-muted mb-4">WMA algorithmic model computed across verified sensor readings</p>

          {prediction.isSuccess && prediction.data?.predicted_yield_metric_tons != null ? (
            <>
              <div className="p-4 rounded-xl bg-bg-tertiary/60 border border-border-primary/60 text-center">
                <p className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {prediction.data.predicted_yield_metric_tons.toFixed(2)}{' '}
                  <span className="text-sm font-normal text-fg-muted">Metric Tons</span>
                </p>
                <div className="mt-2 flex items-center justify-center gap-3 text-xs text-fg-muted">
                  <span>Confidence: <strong className="text-fg-primary font-semibold">{(prediction.data.confidence_score * 100).toFixed(0)}%</strong></span>
                  <span>·</span>
                  <span><strong>{prediction.data.data_points_analyzed}</strong> IoT Readings</span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 leading-relaxed">
                <p className="font-semibold text-emerald-400 mb-0.5">Agronomic Recommendation:</p>
                {prediction.data.recommendation}
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-3">
              <p className="text-xs text-fg-muted">At least 5 telemetry readings are required to compute a forecast.</p>
              <Link className="inline-block text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20" to="/farmer/telemetry">
                + Record Telemetry
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

FarmerDashboard.displayName = 'FarmerDashboard';
