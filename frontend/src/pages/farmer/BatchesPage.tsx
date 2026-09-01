import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ledgerApi } from '../../api/ledger';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input } from '../../components/Common/Input';
import type { BatchStatus, ProduceBatch } from '../../types/ledger';


export function BatchesPage() {
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | BatchStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ledgerApi.getList({ page_size: 100 });
      setBatches(response.results);
    } catch {
      setError('Could not load batches from the backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const filtered = useMemo(() => batches.filter((batch) => (
    (status === 'ALL' || batch.status === status)
    && (batch.id.toLowerCase().includes(query.toLowerCase()) || batch.crop_type.toLowerCase().includes(query.toLowerCase()))
  )), [batches, query, status]);

  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">Produce Batches</h1>
          <p className="text-body text-fg-muted mt-1">Real local records and their verified Sui anchors.</p>
        </div>
        <Link to="/farmer/mint-batch"><Button variant="primary">Mint batch</Button></Link>
      </div>
      <Card variant="glass" padding="md">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search UUID or crop" />
          <select value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | BatchStatus)} className="bg-input-bg border-input-border rounded-input input-padding text-input-fg">
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="MINTED">Minted</option>
            <option value="IN_TRANSIT">In transit</option>
            <option value="DELIVERED">Delivered</option>
          </select>
          <Button variant="outline" onClick={load}>Retry / refresh</Button>
        </div>
      </Card>
      {loading && <Card variant="glass" padding="lg">Loading batches…</Card>}
      {error && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">{error}</p></Card>}
      {!loading && !error && filtered.length === 0 && (
        <Card variant="glass" padding="lg">No batches match this view. No sample records were substituted.</Card>
      )}
      {!loading && !error && filtered.map((batch) => (
        <Card key={batch.id} variant="glass" padding="md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <p className="font-mono text-body-xs text-fg-muted">{batch.id}</p>
              <h2 className="text-heading-sm text-fg-primary">{batch.crop_type}</h2>
              <p className="text-body-sm text-fg-secondary">{Number(batch.weight_kg).toFixed(3)} kg · {batch.status}</p>
            </div>
            <div className="text-body-xs text-fg-muted lg:text-right">
              <p>Object: {batch.sui_object_id || 'Not minted'}</p>
              {batch.sui_tx_digest && (
                <a href={'https://explorer.sui.io/txblock/' + batch.sui_tx_digest + '?network=testnet'} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                  View mint transaction
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
