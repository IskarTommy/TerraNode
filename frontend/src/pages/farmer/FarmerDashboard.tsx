import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ledgerApi } from '../../api/ledger';
import { telemetryApi } from '../../api/telemetry';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { ProduceBatch } from '../../types/ledger';
import type { TelemetryRecord } from '../../types/telemetry';


export function FarmerDashboard() {
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [latest, setLatest] = useState<TelemetryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const load = useCallback(async () => {
    setLoading(true);
    const [batchResult, telemetryResult] = await Promise.allSettled([
      ledgerApi.getList({ page_size: 100 }),
      telemetryApi.getLatest(),
    ]);
    const nextErrors: string[] = [];
    if (batchResult.status === 'fulfilled') setBatches(batchResult.value.results);
    else nextErrors.push('batches');
    if (telemetryResult.status === 'fulfilled') setLatest(telemetryResult.value);
    else if ((telemetryResult.reason as { response?: { status?: number } }).response?.status !== 404) nextErrors.push('latest telemetry');
    setErrors(nextErrors);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex justify-between gap-4"><div><h1 className="text-display-lg font-bold">Farmer Dashboard</h1><p className="text-fg-muted">Live TerraNode data only.</p></div><Button variant="outline" onClick={load}>Refresh</Button></div>
      {loading && <Card variant="glass" padding="lg">Loading dashboard…</Card>}
      {errors.length > 0 && <Card variant="glass" padding="md"><p role="alert" className="text-red-300">Could not load: {errors.join(', ')}.</p></Card>}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" padding="md"><p className="text-fg-muted">Total batches</p><p className="text-display-md font-bold">{batches.length}</p></Card>
          <Card variant="glass" padding="md"><p className="text-fg-muted">Verified mints</p><p className="text-display-md font-bold">{batches.filter((item) => item.status !== 'PENDING').length}</p></Card>
          <Card variant="glass" padding="md"><p className="text-fg-muted">Latest temperature</p><p className="text-display-md font-bold">{latest?.temperature_celsius == null ? 'Not observed' : latest.temperature_celsius.toFixed(1) + ' °C'}</p></Card>
        </div>
      )}
      {!loading && batches.length === 0 && !latest && <Card variant="glass" padding="lg">No operational data yet. No demo data was substituted.</Card>}
      <div className="flex flex-wrap gap-3"><Link to="/farmer/telemetry"><Button variant="primary">Record telemetry</Button></Link><Link to="/farmer/mint-batch"><Button variant="outline">Mint batch</Button></Link><Link to="/farmer/yield-prediction"><Button variant="outline">WMA estimate</Button></Link></div>
    </div>
  );
}
