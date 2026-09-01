import { useEffect, useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Transaction } from '@mysten/sui/transactions';

import { ledgerApi } from '../../api/ledger';
import { usersApi, type Stakeholder } from '../../api/users';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input, Select } from '../../components/Common/Input';
import { useWallet } from '../../contexts/WalletContext';
import { isUsableSuiPackageId } from '../../utils/constants';


export function TransferPage() {
  const [batchId, setBatchId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [nextStatus, setNextStatus] = useState<'IN_TRANSIT' | 'DELIVERED'>('IN_TRANSIT');
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [loadingStakeholders, setLoadingStakeholders] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [digest, setDigest] = useState<string | null>(null);
  const { connected, signAndExecute } = useWallet();

  useEffect(() => {
    usersApi.getStakeholders()
      .then(setStakeholders)
      .catch(() => setError('Could not load wallet-bound custody stakeholders.'))
      .finally(() => setLoadingStakeholders(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setDigest(null);
    const packageId = import.meta.env.VITE_SUI_PACKAGE_ID as string | undefined;
    const target = stakeholders.find((item) => item.id === targetId);
    if (!connected) {
      setError('Connect the Sui wallet bound to the current custodian account.');
      return;
    }
    if (!isUsableSuiPackageId(packageId)) {
      setError('VITE_SUI_PACKAGE_ID must identify the current weight_grams Testnet package.');
      return;
    }
    if (!target) {
      setError('Select a wallet-bound target stakeholder.');
      return;
    }
    setSubmitting(true);
    try {
      const batch = await ledgerApi.getById(batchId.trim());
      if (!batch.sui_object_id) {
        throw new Error('This batch has no verified Sui object.');
      }
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
        <p className="text-body text-fg-muted mt-1">Transfer the existing traceability object to a registered stakeholder.</p>
      </div>
      <Card variant="glass" padding="lg">
        <form onSubmit={submit} className="space-y-5 max-w-2xl">
          <Input
            label="TerraNode batch UUID"
            value={batchId}
            onChange={(event) => setBatchId(event.target.value)}
            required
          />
          <Select
            label={loadingStakeholders ? 'Loading stakeholders…' : 'New custodian'}
            value={targetId}
            onChange={setTargetId}
            placeholder="Select a wallet-bound stakeholder"
            options={stakeholders.map((item) => ({
              value: item.id,
              label: item.full_name + ' (' + item.role + ')',
            }))}
            disabled={loadingStakeholders}
          />
          <Select
            label="Lifecycle status after transfer"
            value={nextStatus}
            onChange={(value) => setNextStatus(value as 'IN_TRANSIT' | 'DELIVERED')}
            options={[
              { value: 'IN_TRANSIT', label: 'In transit' },
              { value: 'DELIVERED', label: 'Delivered' },
            ]}
          />
          {!connected && <ConnectButton />}
          {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">{error}</div>}
          {digest && (
            <a
              href={'https://explorer.sui.io/txblock/' + digest + '?network=testnet'}
              target="_blank"
              rel="noreferrer"
              className="block break-all rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-cyan-400"
            >
              Verified transfer: {digest}
            </a>
          )}
          <Button type="submit" variant="primary" loading={submitting} disabled={!connected || loadingStakeholders}>
            Sign and verify custody transfer
          </Button>
        </form>
      </Card>
    </div>
  );
}
