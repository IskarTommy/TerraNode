import { useCallback, useEffect, useState } from 'react';

import { analyticsApi } from '../../api/analytics';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { SystemHealth } from '../../types/analytics';


export function SystemHealthPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    try { setHealth(await analyticsApi.getSystemHealth()); }
    catch { setError(true); setHealth(null); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="space-y-6" data-role="admin">
      <div className="flex justify-between"><div><h1 className="text-display-lg font-bold">System Health</h1><p className="text-fg-muted">Live dependency checks; degraded means not proven healthy.</p></div><Button variant="outline" onClick={load}>Refresh</Button></div>
      {error && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">Health endpoint is unavailable.</p></Card>}
      {!health && !error && <Card variant="glass" padding="lg">Checking dependencies…</Card>}
      {health && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{Object.entries(health).map(([name, value]) => <Card key={name} variant="glass" padding="md"><p className="text-fg-muted">{name.replace('_', ' ')}</p><p className={value === 'healthy' ? 'text-emerald-300 font-bold' : value === 'down' ? 'text-red-300 font-bold' : 'text-amber-300 font-bold'}>{value}</p></Card>)}</div>}
    </div>
  );
}
