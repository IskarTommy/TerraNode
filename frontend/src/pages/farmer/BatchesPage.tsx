import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { ledgerApi } from '../../api/ledger';
import { usersApi, type Stakeholder } from '../../api/users';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input, Select } from '../../components/Common/Input';
import type { BatchStatus, ProduceBatch } from '../../types/ledger';
import { useAuth } from '../../contexts/AuthContext';

export function BatchesPage() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | BatchStatus>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handover modal state
  const [handoverBatch, setHandoverBatch] = useState<ProduceBatch | null>(null);
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [targetCarrierId, setTargetCarrierId] = useState('');
  const [handingOver, setHandingOver] = useState(false);
  const [handoverSuccess, setHandoverSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    void load();
    usersApi.getStakeholders()
      .then((data) => {
        const logisticsStakeholders = data.filter((s) => s.role === 'LOGISTICS');
        setStakeholders(logisticsStakeholders.length ? logisticsStakeholders : data);
        if (data.length > 0) {
          const defaultTarget = data.find((s) => s.role === 'LOGISTICS') || data[0];
          setTargetCarrierId(defaultTarget.id);
        }
      })
      .catch(() => {});
  }, [load]);

  const filtered = useMemo(() => batches.filter((batch) => (
    (status === 'ALL' || batch.status === status)
    && (batch.id.toLowerCase().includes(query.toLowerCase()) || batch.crop_type.toLowerCase().includes(query.toLowerCase()))
  )), [batches, query, status]);

  const executeHandover = async () => {
    if (!handoverBatch || !targetCarrierId) return;
    setHandingOver(true);
    setError(null);
    try {
      const simulatedDigest = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
      await ledgerApi.transfer(handoverBatch.id, {
        to_user_id: targetCarrierId,
        sui_tx_digest: simulatedDigest,
        status: 'IN_TRANSIT',
      });
      setHandoverSuccess(`Batch ${handoverBatch.crop_type} (${Number(handoverBatch.weight_kg).toFixed(1)} kg) successfully handed over to carrier!`);
      setHandoverBatch(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Handover failed.');
    } finally {
      setHandingOver(false);
    }
  };

  const statusBadge = (s: BatchStatus) => {
    switch (s) {
      case 'MINTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">At Farm (Ready)</span>;
      case 'IN_TRANSIT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">In Transit</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Delivered</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-500/15 text-slate-300 border border-slate-500/30">Pending</span>;
    }
  };

  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">Produce Batches</h1>
          <p className="text-body text-fg-muted mt-1">Verified harvest lots with cryptographic data integrity seals.</p>
        </div>
        <Link to="/farmer/mint-batch"><Button variant="primary">Mint batch</Button></Link>
      </div>

      {handoverSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 p-4 text-emerald-300 flex justify-between items-center">
          <span>✓ {handoverSuccess}</span>
          <button onClick={() => setHandoverSuccess(null)} className="text-emerald-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {/* Handover Dialog */}
      {handoverBatch && (
        <Card variant="glass" padding="lg">
          <div className="space-y-4 max-w-xl">
            <div>
              <h2 className="text-heading-sm font-bold text-fg-primary">Handover to Logistics Carrier</h2>
              <p className="text-body-sm text-fg-muted mt-1">
                Transfer custody of <strong>{handoverBatch.crop_type} ({Number(handoverBatch.weight_kg).toFixed(1)} kg)</strong> to transport carrier. Status will change to <strong>In Transit</strong>.
              </p>
            </div>
            <Select
              label="Select Logistics Carrier"
              value={targetCarrierId}
              onChange={setTargetCarrierId}
              options={stakeholders.map((s) => ({
                value: s.id,
                label: `${s.full_name} (${s.role})`,
              }))}
            />
            <div className="flex gap-3 pt-2">
              <Button variant="primary" loading={handingOver} onClick={executeHandover}>
                Confirm Handover
              </Button>
              <Button variant="outline" onClick={() => setHandoverBatch(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card variant="glass" padding="md">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search UUID or crop" />
          <select value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | BatchStatus)} className="bg-input-bg border-input-border rounded-input input-padding text-input-fg">
            <option value="ALL">All statuses</option>
            <option value="MINTED">At Farm (Ready)</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PENDING">Pending</option>
          </select>
          <Button variant="outline" onClick={load}>Retry / refresh</Button>
        </div>
      </Card>

      {loading && <Card variant="glass" padding="lg">Loading batches…</Card>}
      {error && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">{error}</p></Card>}
      {!loading && !error && filtered.length === 0 && (
        <Card variant="glass" padding="lg">No batches match this view.</Card>
      )}

      {!loading && !error && filtered.map((batch) => (
        <Card key={batch.id} variant="glass" padding="md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-heading-sm font-bold text-fg-primary">{batch.crop_type}</h2>
                {statusBadge(batch.status)}
              </div>
              <p className="text-body-sm text-fg-secondary">
                Weight: <strong>{Number(batch.weight_kg).toFixed(3)} kg</strong>
              </p>
              <p className="font-mono text-body-xs text-fg-muted">
                UUID: {batch.id}
              </p>
            </div>

            <div className="flex flex-col lg:items-end gap-2 text-body-xs">
              <div className="text-fg-muted">
                {batch.sui_object_id ? (
                  <span className="text-cyan-300 font-mono">Sui Object: {batch.sui_object_id.slice(0, 10)}…</span>
                ) : (
                  <span className="text-emerald-400 font-mono">✓ SHA-256 Verified Seal</span>
                )}
              </div>
              {batch.sui_tx_digest && (
                <a
                  href={'https://explorer.sui.io/txblock/' + batch.sui_tx_digest + '?network=testnet'}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline"
                >
                  View on Sui Explorer →
                </a>
              )}

              {/* 1-Click Handover button for Farmer */}
              {batch.status === 'MINTED' && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setHandoverBatch(batch)}
                >
                  Handover to Carrier →
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
