import { useEffect, useState } from 'react';

import { ledgerApi } from '../../api/ledger';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { ProduceBatch } from '../../types/ledger';


export function ShipmentsPage() {
  const [records, setRecords] = useState<ProduceBatch[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = async () => {
    setState('loading');
    try {
      const response = await ledgerApi.getList({ page_size: 100 });
      setRecords(response.results.filter((item) => item.status === 'IN_TRANSIT' || item.status === 'DELIVERED'));
      setState('ready');
    } catch {
      setState('error');
    }
  };
  useEffect(() => { void load(); }, []);
  return (
    <div className="space-y-6" data-role="logistics">
      <div className="flex justify-between"><div><h1 className="text-display-lg font-bold">Shipments</h1><p className="text-fg-muted">Real in-transit and delivered custody records.</p></div><Button variant="outline" onClick={load}>Refresh</Button></div>
      {state === 'loading' && <Card variant="glass" padding="lg">Loading…</Card>}
      {state === 'error' && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">Could not load shipments.</p></Card>}
      {state === 'ready' && records.length === 0 && <Card variant="glass" padding="lg">No shipments found. No samples were substituted.</Card>}
      {state === 'ready' && records.map((batch) => (
        <Card key={batch.id} variant="glass" padding="md">
          <p className="font-mono text-body-xs text-fg-muted">{batch.id}</p>
          <p className="text-heading-sm">{batch.crop_type} · {Number(batch.weight_kg).toFixed(3)} kg</p>
          <p className="text-fg-muted">{batch.status} · {batch.transfers.length} verified transfer(s)</p>
        </Card>
      ))}
    </div>
  );
}
