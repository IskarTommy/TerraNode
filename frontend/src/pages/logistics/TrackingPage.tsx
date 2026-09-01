import { useState } from 'react';

import { ledgerApi } from '../../api/ledger';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { ProduceBatch } from '../../types/ledger';


export function TrackingPage() {
  const [identifier, setIdentifier] = useState('');
  const [batch, setBatch] = useState<ProduceBatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setBatch(null);
    try {
      setBatch(await ledgerApi.lookup(identifier.trim()));
    } catch {
      setError('No accessible batch matched that UUID or Sui object ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-role="logistics">
      <div>
        <h1 className="text-display-lg font-bold text-fg-primary">Custody Tracking</h1>
        <p className="text-body text-fg-muted mt-1">Look up a visible batch by TerraNode UUID or Sui object ID.</p>
      </div>
      <form onSubmit={lookup} className="flex gap-3">
        <input value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="flex-1 bg-input-bg border border-input-border rounded-input input-padding text-input-fg font-mono" required />
        <Button type="submit" variant="primary" loading={loading}>Look up</Button>
      </form>
      {error && <Card variant="glass" padding="md"><p role="alert" className="text-red-300">{error}</p></Card>}
      {batch && (
        <>
          <Card variant="glass" padding="md">
            <p className="font-mono text-body-xs text-fg-muted">{batch.id}</p>
            <h2 className="text-heading-sm text-fg-primary">{batch.crop_type}</h2>
            <p>{Number(batch.weight_kg).toFixed(3)} kg · {batch.status}</p>
            <p className="break-all text-body-xs text-fg-muted">Sui object: {batch.sui_object_id || 'Not minted'}</p>
          </Card>
          <Card variant="glass" padding="md">
            <h2 className="text-heading-sm text-fg-primary mb-4">Verified custody timeline</h2>
            {batch.transfers.length === 0 ? (
              <p className="text-fg-muted">No custody transfers recorded.</p>
            ) : batch.transfers.map((transfer) => (
              <div key={transfer.id} className="border-l-2 border-emerald-500 pl-4 py-2">
                <p className="text-fg-primary">{transfer.from_wallet} → {transfer.to_wallet}</p>
                <p className="text-body-xs text-fg-muted">{new Date(transfer.transferred_at).toLocaleString()}</p>
                <a href={'https://explorer.sui.io/txblock/' + transfer.tx_digest + '?network=testnet'} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline break-all">
                  {transfer.tx_digest}
                </a>
              </div>
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
