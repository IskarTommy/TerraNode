import { useCallback, useEffect, useState } from 'react';

import { analyticsApi } from '../../api/analytics';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Select } from '../../components/Common/Input';
import type { PredictionResult } from '../../types/analytics';


const CROPS = ['MAIZE', 'RICE', 'SOYBEAN', 'TOMATO', 'CASSAVA'].map((value) => ({ value, label: value }));

export function YieldPredictionPage() {
  const [crop, setCrop] = useState('MAIZE');
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPrediction(await analyticsApi.predictYield(crop));
    } catch (caught) {
      setPrediction(null);
      const response = (caught as { response?: { data?: { error?: string } } }).response;
      setError(response?.data?.error || 'Could not calculate the WMA yield estimate.');
    } finally {
      setLoading(false);
    }
  }, [crop]);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex justify-between gap-4"><div><h1 className="text-display-lg font-bold">WMA Yield Estimate</h1><p className="text-fg-muted">Transparent rule-based forecast; not an AI model or guaranteed harvest.</p></div><Button variant="outline" onClick={load}>Recalculate</Button></div>
      <Card variant="glass" padding="md"><Select label="Crop profile" value={crop} onChange={setCrop} options={CROPS} /></Card>
      {loading && <Card variant="glass" padding="lg">Calculating from verified observations…</Card>}
      {error && <Card variant="glass" padding="lg"><p role="alert" className="text-amber-300">{error}</p><p className="text-fg-muted mt-2">Collect at least five genuine temperature and five genuine soil-moisture observations.</p></Card>}
      {prediction && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card variant="glass" padding="md"><p className="text-fg-muted">Rule-based estimate</p><p className="text-display-md">{prediction.predicted_yield_metric_tons.toFixed(2)} metric tons</p></Card>
            <Card variant="glass" padding="md"><p className="text-fg-muted">Confidence indicator</p><p className="text-display-md">{Math.round(prediction.confidence_score * 100)}%</p></Card>
            <Card variant="glass" padding="md"><p className="text-fg-muted">Contributing records</p><p>{prediction.contributing_observations.join(', ')}</p></Card>
          </div>
          <Card variant="glass" padding="md"><h2 className="font-semibold mb-2">Rule-based recommendation</h2><p>{prediction.recommendation}</p><p className="text-body-xs text-fg-muted mt-3">Soil pH average: {prediction.averages.ph ?? 'not observed; not substituted'}</p></Card>
        </>
      )}
    </div>
  );
}
