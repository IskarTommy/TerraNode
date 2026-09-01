import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { ledgerApi } from '../../api/ledger';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { ProduceBatch } from '../../types/ledger';


export function LogisticsDashboard() {
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBatches((await ledgerApi.getList({ page_size: 100 })).results);
    } catch {
      setError('Could not load custody records.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6" data-role="logistics">
      <div className="flex justify-between gap-4">
        <div><h1 className="text-display-lg font-bold text-fg-primary">Logistics Dashboard</h1><p className="text-fg-muted">Batches visible to your account.</p></div>
        <Link to="/logistics/transfer"><Button variant="primary">Transfer custody</Button></Link>
      </div>
      {loading && <Card variant="glass" padding="lg">Loading…</Card>}
      {error && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">{error}</p><Button variant="outline" onClick={load}>Retry</Button></Card>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" padding="md"><p className="text-fg-muted">Visible batches</p><p className="text-display-md font-bold">{batches.length}</p></Card>
          <Card variant="glass" padding="md"><p className="text-fg-muted">In transit</p><p className="text-display-md font-bold">{batches.filter((item) => item.status === 'IN_TRANSIT').length}</p></Card>
          <Card variant="glass" padding="md"><p className="text-fg-muted">Delivered</p><p className="text-display-md font-bold">{batches.filter((item) => item.status === 'DELIVERED').length}</p></Card>
        </div>
      )}
      {!loading && !error && batches.length === 0 && <Card variant="glass" padding="lg">No custody records. No demo shipments were substituted.</Card>}
    </div>
  );
}
