import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { analyticsApi } from '../../api/analytics';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { PredictionResult } from '../../types/analytics';


const CROP_PROFILES_META = [
  { key: 'MAIZE', label: 'Maize', optimalTemp: '24°C', optimalMoisture: '60%', optimalPh: '6.5' },
  { key: 'RICE', label: 'Rice', optimalTemp: '26°C', optimalMoisture: '75%', optimalPh: '6.0' },
  { key: 'SOYBEAN', label: 'Soybean', optimalTemp: '23°C', optimalMoisture: '55%', optimalPh: '6.5' },
  { key: 'TOMATO', label: 'Tomato', optimalTemp: '22°C', optimalMoisture: '65%', optimalPh: '6.2' },
  { key: 'CASSAVA', label: 'Cassava', optimalTemp: '27°C', optimalMoisture: '45%', optimalPh: '5.8' },
];

export function YieldPredictionPage() {
  const [crop, setCrop] = useState('MAIZE');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsMore, setNeedsMore] = useState(false);

  const activeMeta = CROP_PROFILES_META.find((c) => c.key === crop) || CROP_PROFILES_META[0];

  const load = useCallback(async () => {
    setLoading(true);
    setNeedsMore(false);
    setPrediction(null);
    try {
      setPrediction(await analyticsApi.predictYield(crop));
    } catch (caught) {
      const response = (caught as { response?: { data?: { error?: string } } }).response;
      const msg = response?.data?.error ?? '';
      if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('5 temperature')) {
        setNeedsMore(true);
      }
    } finally {
      setLoading(false);
    }
  }, [crop]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6" data-role="farmer">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-display-lg font-bold">Crop Yield Forecasting</h1>
          <p className="text-fg-muted">
            Agronomic WMA model estimating harvest output based on your verified field sensor readings.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/farmer/batches">
            <Button variant="outline">View My Batches</Button>
          </Link>
          <Button variant="outline" onClick={load}>Recalculate</Button>
        </div>
      </div>

      {/* Crop Selection Grid */}
      <div>
        <p className="text-body-sm font-medium text-fg-secondary mb-3">Crop Profile:</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {CROP_PROFILES_META.map((item) => {
            const isSelected = item.key === crop;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setCrop(item.key)}
                className={`p-3.5 rounded-xl border text-left transition-all duration-fast flex flex-col items-start gap-1.5 ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10'
                    : 'border-border-primary bg-bg-secondary/40 hover:bg-bg-secondary hover:border-border-secondary'
                }`}
              >
                <span className={`text-body-sm font-semibold ${isSelected ? 'text-primary' : 'text-fg-primary'}`}>
                  {item.label}
                </span>
                <span className="text-[11px] text-fg-muted">
                  Target: {item.optimalTemp} · {item.optimalMoisture}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && <Card variant="glass" padding="lg">Calculating agronomic forecast from sensor observations…</Card>}

      {/* Insufficient data guidance */}
      {!loading && needsMore && (
        <Card variant="glass" padding="lg">
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-fg-primary text-lg">Sensor observations needed</p>
              <p className="text-fg-muted mt-1 text-body-sm">
                The WMA yield algorithm requires at least <strong className="text-fg-primary">5 temperature and 5 soil-moisture</strong> observations from your farm.
              </p>
            </div>
            <Link to="/farmer/telemetry">
              <Button variant="primary">Record Field Readings in Telemetry →</Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Prediction Output */}
      {prediction && !loading && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="glass" padding="md">
              <p className="text-fg-muted text-body-sm">Expected Harvest Yield</p>
              <p className="text-display-md font-bold text-primary mt-1">
                {prediction.predicted_yield_metric_tons.toFixed(2)} <span className="text-body text-fg-secondary">t/ha</span>
              </p>
              <p className="text-body-xs text-fg-muted mt-1">Estimated metric tons per hectare</p>
            </Card>

            <Card variant="glass" padding="md">
              <p className="text-fg-muted text-body-sm">Data Confidence Score</p>
              <p className="text-display-md font-bold text-cyan-400 mt-1">
                {Math.round(prediction.confidence_score * 100)}%
              </p>
              <p className="text-body-xs text-fg-muted mt-1">
                Based on {prediction.contributing_observations.length ? '5 recorded observations' : 'sample window'} (scales up to 95%)
              </p>
            </Card>

            <Card variant="glass" padding="md">
              <p className="text-fg-muted text-body-sm">Active Crop Benchmark</p>
              <p className="text-display-md font-bold text-fg-primary mt-1">
                {activeMeta.label}
              </p>
              <p className="text-body-xs text-fg-muted mt-1">
                Target: {activeMeta.optimalTemp} | {activeMeta.optimalMoisture} moisture | {activeMeta.optimalPh} pH
              </p>
            </Card>
          </div>

          {/* Environmental Suitability Breakdown */}
          <Card variant="glass" padding="lg">
            <h2 className="text-heading-sm font-semibold mb-4">Farm Condition vs. Crop Target Comparison</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-lg bg-bg-tertiary/50 border border-border-primary">
                <p className="text-body-xs text-fg-muted">Measured Temperature (Avg)</p>
                <p className="text-display-sm font-bold text-fg-primary mt-1">
                  {prediction.averages.temp != null ? `${prediction.averages.temp.toFixed(1)} °C` : '—'}
                </p>
                <p className="text-body-xs text-emerald-400 mt-1">Target: {activeMeta.optimalTemp}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-bg-tertiary/50 border border-border-primary">
                <p className="text-body-xs text-fg-muted">Measured Soil Moisture (Avg)</p>
                <p className="text-display-sm font-bold text-fg-primary mt-1">
                  {prediction.averages.moisture != null ? `${prediction.averages.moisture.toFixed(1)} %` : '—'}
                </p>
                <p className="text-body-xs text-cyan-400 mt-1">Target: {activeMeta.optimalMoisture}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-bg-tertiary/50 border border-border-primary">
                <p className="text-body-xs text-fg-muted">Measured Soil pH (Avg)</p>
                <p className="text-display-sm font-bold text-fg-primary mt-1">
                  {prediction.averages.ph != null ? prediction.averages.ph.toFixed(2) : 'Not recorded'}
                </p>
                <p className="text-body-xs text-amber-400 mt-1">Target: {activeMeta.optimalPh}</p>
              </div>
            </div>

            {/* Agronomic Advisory */}
            <div className="mt-5 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-body-sm font-semibold text-primary">Agronomic Advisory:</p>
              <p className="text-body-sm text-fg-primary mt-1">
                {prediction.recommendation && prediction.recommendation !== 'No rule-based advisory was triggered.'
                  ? prediction.recommendation
                  : `Your farm's soil moisture and temperature are in favorable bounds for ${activeMeta.label}. Estimated yield is healthy.`}
              </p>
            </div>

            {/* Next Steps Buttons */}
            <div className="mt-5 pt-4 border-t border-border-primary flex flex-wrap gap-3">
              <Link to="/farmer/mint-batch">
                <Button variant="primary">Mint Harvested {activeMeta.label} Batch →</Button>
              </Link>
              <Link to="/farmer/telemetry">
                <Button variant="outline">Add More Sensor Observations</Button>
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

