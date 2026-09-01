import { useCallback, useEffect, useState } from 'react';

import { analyticsApi } from '../../api/analytics';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { AdminStats } from '../../types/analytics';


export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = useCallback(async () => {
    setState('loading');
    try {
      setStats(await analyticsApi.getAdminStats());
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const cards = stats ? [
    ['Users', stats.total_users],
    ['Farmers', stats.total_farmers],
    ['Logistics', stats.total_logistics],
    ['Batches', stats.total_batches],
    ['Pending chain confirmation', stats.pending_batches],
    ['In transit', stats.in_transit_batches],
    ['Telemetry records', stats.telemetry_records],
    ['Security / integrity flags', stats.flagged_anomalies],
  ] : [];
  return (
    <div className="space-y-6" data-role="admin">
      <div className="flex justify-between"><div><h1 className="text-display-lg font-bold">Administration</h1><p className="text-fg-muted">Authoritative database counts.</p></div><Button variant="outline" onClick={load}>Refresh</Button></div>
      {state === 'loading' && <Card variant="glass" padding="lg">Loading system statistics…</Card>}
      {state === 'error' && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">Could not load admin statistics.</p></Card>}
      {state === 'ready' && stats && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label, value]) => <Card key={String(label)} variant="glass" padding="md"><p className="text-fg-muted">{label}</p><p className="text-display-md font-bold">{value}</p></Card>)}</div>}
    </div>
  );
}

export default AdminDashboard;
