import { useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';

import { ledgerApi } from '../../api/ledger';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input, Select } from '../../components/Common/Input';
import { useWallet } from '../../contexts/WalletContext';


const CROPS = ['MAIZE', 'RICE', 'SOYBEAN', 'TOMATO', 'CASSAVA'].map((value) => ({
  value,
  label: value.charAt(0) + value.slice(1).toLowerCase(),
}));

function hashBytes(hash: string): number[] {
  if (!/^[0-9a-f]{64}$/i.test(hash)) {
    throw new Error('Backend returned an invalid canonical SHA-256 hash.');
  }
  return hash.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16));
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { error?: string; reason?: string } } }).response;
    return response?.data?.reason || response?.data?.error || 'The backend rejected the mint.';
  }
  return error instanceof Error ? error.message : 'Minting failed.';
}

export function MintBatchPage() {
  const [cropType, setCropType] = useState('MAIZE');
  const [weightKg, setWeightKg] = useState('');
  const [telemetryId, setTelemetryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ batchId: string; digest: string } | null>(null);
  const { connected, signAndExecute } = useWallet();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    const packageId = import.meta.env.VITE_SUI_PACKAGE_ID as string | undefined;
    const weight = Number(weightKg);
    const grams = Math.round(weight * 1000);
    if (!connected) {
      setError('Connect the Sui wallet bound to your TerraNode account first.');
      return;
    }
    if (!packageId || !/^0x[0-9a-f]{64}$/i.test(packageId)) {
      setError('VITE_SUI_PACKAGE_ID is not configured with the deployed Testnet package.');
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0 || Math.abs(weight * 1000 - grams) > 1e-9) {
      setError('Weight must be positive and use at most three decimal places (one gram precision).');
      return;
    }

    setSubmitting(true);
    try {
      const prepared = await ledgerApi.prepare({
        crop_type: cropType,
        weight_kg: weight,
        ...(telemetryId.trim() ? { origin_telemetry: telemetryId.trim() } : {}),
      });
      const transaction = new Transaction();
      transaction.moveCall({
        target: packageId + '::agri_ledger::mint_batch',
        arguments: [
          transaction.pure.string(cropType),
          transaction.pure.u64(BigInt(grams)),
          transaction.pure.vector('u8', hashBytes(prepared.data_integrity_hash)),
        ],
      });
      const { digest } = await signAndExecute(transaction);
      await ledgerApi.confirm(prepared.id, { sui_tx_digest: digest });
      setResult({ batchId: prepared.id, digest });
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6" data-role="farmer">
      <div>
        <h1 className="text-display-lg font-bold text-fg-primary">Mint Produce Batch</h1>
        <p className="text-body text-fg-muted mt-1">
          Create a traceability record on Sui Testnet. This is not a coin, payment, or trading asset.
        </p>
      </div>
      <Card variant="glass" padding="lg">
        <form onSubmit={submit} className="space-y-5 max-w-2xl">
          <Select label="Crop" value={cropType} onChange={setCropType} options={CROPS} />
          <Input
            label="Verified batch weight (kg)"
            type="number"
            min="0.001"
            step="0.001"
            value={weightKg}
            onChange={(event) => setWeightKg(event.target.value)}
            required
          />
          <Input
            label="Origin telemetry UUID (optional)"
            value={telemetryId}
            onChange={(event) => setTelemetryId(event.target.value)}
            placeholder="Use one of your genuine telemetry records"
          />
          {!connected && <ConnectButton />}
          {error && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <p className="font-semibold text-emerald-300">Mint verified by the backend.</p>
              <p className="text-body-sm text-fg-muted break-all">Batch: {result.batchId}</p>
              <a
                className="text-cyan-400 hover:underline break-all"
                href={'https://explorer.sui.io/txblock/' + result.digest + '?network=testnet'}
                target="_blank"
                rel="noreferrer"
              >
                {result.digest}
              </a>
            </div>
          )}
          <Button type="submit" variant="primary" loading={submitting} disabled={!connected}>
            Sign and verify mint
          </Button>
        </form>
      </Card>
    </div>
  );
}
