import { useEffect, useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Transaction } from '@mysten/sui/transactions';

import { ledgerApi } from '../../api/ledger';
import { usersApi, type Stakeholder } from '../../api/users';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Select } from '../../components/Common/Input';
import { useWallet } from '../../contexts/WalletContext';
import { isUsableSuiPackageId } from '../../utils/constants';
import type { ProduceBatch } from '../../types/ledger';

export function TransferPage() {
  const [batches, setBatches] = useState<ProduceBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [nextStatus, setNextStatus] = useState<'IN_TRANSIT' | 'DELIVERED'>('DELIVERED');
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const { connected, signAndExecute } = useWallet();

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchRes, stakeholderRes] = await Promise.all([
        ledgerApi.getList({ page_size: 100 }),
        usersApi.getStakeholders(),
      ]);
      setBatches(batchRes.results);
      setStakeholders(stakeholderRes);
      if (batchRes.results.length > 0 && !selectedBatchId) {
        setSelectedBatchId(batchRes.results[0].id);
      }
      if (stakeholderRes.length > 0 && !targetId) {
        setTargetId(stakeholderRes[0].id);
      }
    } catch {
      setError('Could not load batches or stakeholders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setDigest(null);
    const packageId = import.meta.env.VITE_SUI_PACKAGE_ID as string | undefined;
    const target = stakeholders.find((item) => item.id === targetId);
    if (!target) {
      setError('Select a target recipient stakeholder.');
      return;
    }
    if (!selectedBatchId) {
      setError('Select a batch to transfer.');
      return;
    }
    setSubmitting(true);
    try {
      const batch = await ledgerApi.getById(selectedBatchId.trim());
      
      if (isUsableSuiPackageId(packageId) && batch.sui_object_id && connected) {
        const transaction = new Transaction();
        transaction.moveCall({
          target: packageId + '::agri_ledger::transfer_custody',
          arguments: [
            transaction.object(batch.sui_object_id),
            transaction.pure.address(target.sui_public_key),
          ],
        });
        const executed = await signAndExecute(transaction);
        await ledgerApi.transfer(batch.id, {
          to_user_id: target.id,
          sui_tx_digest: executed.digest,
          status: nextStatus,
        });
        setDigest(executed.digest);
      } else {
        // Off-chain custody handover
        const simulatedDigest = '0x' + Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('');
        await ledgerApi.transfer(batch.id, {
          to_user_id: target.id,
          sui_tx_digest: simulatedDigest,
          status: nextStatus,
        });
        setDigest(simulatedDigest);
      }
      await loadData();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Custody transfer failed.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-role="logistics">
      <div>
        <h1 className="text-display-lg font-bold text-fg-primary">Transfer Custody</h1>
        <p className="text-body text-fg-muted mt-1">Hand over produce custody to the next stakeholder in the supply chain.</p>
      </div>

      <Card variant="glass" padding="lg">
        <form onSubmit={submit} className="space-y-5 max-w-2xl">
          {/* Dropdown Batch Selector */}
          <Select
            label="Select Produce Batch to Transfer"
            value={selectedBatchId}
            onChange={(val) => {
              setSelectedBatchId(val);
              const b = batches.find((item) => item.id === val);
              if (b?.status === 'MINTED') setNextStatus('IN_TRANSIT');
              else if (b?.status === 'IN_TRANSIT') setNextStatus('DELIVERED');
            }}
            options={batches.map((b) => ({
              value: b.id,
              label: `${b.crop_type} — ${Number(b.weight_kg).toFixed(1)} kg [Current Status: ${b.status}]`,
            }))}
            disabled={loading}
          />

          {selectedBatch && (
            <div className="p-3 rounded-lg bg-bg-surface/50 border border-border-subtle text-body-xs space-y-1">
              <p><strong>Batch UUID:</strong> <span className="font-mono text-cyan-300">{selectedBatch.id}</span></p>
              <p><strong>Current Status:</strong> <span className="text-emerald-300">{selectedBatch.status}</span></p>
              <p><strong>Weight:</strong> {Number(selectedBatch.weight_kg).toFixed(3)} kg</p>
            </div>
          )}

          <Select
            label="New Custodian / Recipient"
            value={targetId}
            onChange={setTargetId}
            options={stakeholders.map((item) => ({
              value: item.id,
              label: item.full_name + ' (' + item.role + ')',
            }))}
            disabled={loading}
          />

          <Select
            label="Lifecycle Status After Transfer"
            value={nextStatus}
            onChange={(value) => setNextStatus(value as 'IN_TRANSIT' | 'DELIVERED')}
            options={[
              { value: 'IN_TRANSIT', label: 'In Transit (Carrier picked up)' },
              { value: 'DELIVERED', label: 'Delivered (Arrived at destination)' },
            ]}
          />

          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">{error}</div>}
          
          {digest && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
              ✓ Custody transfer successfully recorded.
              <p className="font-mono text-body-xs text-cyan-300 mt-1 break-all">Transfer Hash: {digest}</p>
            </div>
          )}

          <Button type="submit" variant="primary" loading={submitting} disabled={loading || batches.length === 0}>
            Execute Custody Transfer
          </Button>
        </form>
      </Card>
    </div>
  );
}
