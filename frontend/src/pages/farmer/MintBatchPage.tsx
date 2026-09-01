import { useState } from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { Transaction } from '@mysten/sui/transactions';

import { analyticsApi } from '../../api/analytics';
import { ledgerApi } from '../../api/ledger';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input, Select } from '../../components/Common/Input';
import { useWallet } from '../../contexts/WalletContext';
import { isUsableSuiPackageId } from '../../utils/constants';


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

/** Collapsible helper: multiply field area × WMA yield estimate to suggest a weight. */
function WeightEstimator({
  cropType,
  onUse,
}: {
  cropType: string;
  onUse: (kg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hectares, setHectares] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<{ tons: number; kg: number } | null>(null);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const estimate = async () => {
    const ha = Number(hectares);
    if (!ha || ha <= 0) {
      setEstimateError('Enter a positive area in hectares.');
      return;
    }
    setLoading(true);
    setEstimateError(null);
    setSuggestion(null);
    try {
      const result = await analyticsApi.predictYield(cropType);
      // WMA result is in metric tons per hectare (per farmer's data)
      const totalTons = result.predicted_yield_metric_tons * ha;
      const totalKg = totalTons * 1000;
      setSuggestion({ tons: totalTons, kg: totalKg });
    } catch {
      setEstimateError(
        'Not enough telemetry data to estimate yet. Record at least 5 observations on the Telemetry page first.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-border-primary rounded-xl overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left text-body-sm text-fg-muted hover:text-fg-primary transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span>📐 Estimate weight from your field area (hectares × WMA yield)</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border-primary pt-3">
          <p className="text-body-xs text-fg-muted">
            This uses your WMA yield estimate (from your telemetry data) multiplied by your field area to
            suggest a batch weight. It is only a guide — enter the actual weighed value in the field above.
          </p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                label="Field area (hectares)"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="e.g. 2.5"
                value={hectares}
                onChange={(e) => setHectares(e.target.value)}
              />
            </div>
            <Button type="button" variant="outline" loading={loading} onClick={estimate}>
              Calculate
            </Button>
          </div>
          {estimateError && (
            <p className="text-body-xs text-amber-300">{estimateError}</p>
          )}
          {suggestion && (
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3 space-y-1">
              <p className="text-body-sm font-medium text-fg-primary">
                Estimated yield: <strong>{suggestion.tons.toFixed(3)} metric tons</strong> ({suggestion.kg.toFixed(1)} kg)
              </p>
              <p className="text-body-xs text-fg-muted">
                Based on your WMA estimate for {cropType} × {hectares} ha
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={() => onUse(suggestion.kg.toFixed(3))}
              >
                Use this weight ↑
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MintBatchPage() {
  const [cropType, setCropType] = useState('MAIZE');
  const [weightKg, setWeightKg] = useState('');
  const [telemetryId, setTelemetryId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ batchId: string; digest: string } | null>(null);
  const { connected, signAndExecute } = useWallet();

  const packageId = import.meta.env.VITE_SUI_PACKAGE_ID as string | undefined;
  const packageReady = isUsableSuiPackageId(packageId);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setResult(null);
    const weight = Number(weightKg);
    const grams = Math.round(weight * 1000);
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

      if (packageReady && connected) {
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
      } else {
        // Off-chain / Pre-mint mode
        setResult({
          batchId: prepared.id,
          digest: prepared.data_integrity_hash,
        });
      }
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
          Create a traceability record with cryptographic hash integrity and Sui blockchain custody.
        </p>
      </div>

      {/* Contract not published notice */}
      {!packageReady && (
        <Card variant="glass" padding="md">
          <div className="flex gap-3 items-start">
            <span className="text-cyan-400 text-lg">ℹ</span>
            <div>
              <p className="font-semibold text-cyan-300">Ready to Record Batches</p>
              <p className="text-body-sm text-fg-muted mt-1">
                Batches created now are recorded with cryptographic SHA-256 data integrity hashes.
                Once the Sui Move package address is configured, live blockchain transactions will also sign on-chain.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card variant="glass" padding="lg">
        <form onSubmit={submit} className="space-y-5 max-w-2xl">
          <Select label="Crop" value={cropType} onChange={setCropType} options={CROPS} />

          {/* Weight field with clear explanation */}
          <div className="space-y-2">
            <Input
              label="Verified batch weight (kg) *"
              type="number"
              min="0.001"
              step="0.001"
              placeholder="e.g. 200.000"
              value={weightKg}
              onChange={(event) => setWeightKg(event.target.value)}
              required
              helperText="The actual weighed mass of this specific batch — what you would write on a delivery note or weigh-bridge receipt."
            />
            {/* Estimator helper */}
            <WeightEstimator cropType={cropType} onUse={setWeightKg} />
          </div>

          <Input
            label="Origin telemetry UUID (optional)"
            value={telemetryId}
            onChange={(event) => setTelemetryId(event.target.value)}
            placeholder="Paste a UUID from your Telemetry page to link this batch to your field readings"
            helperText="Go to Telemetry → 'copy UUID' on any reading. This links the record to your encrypted sensor data."
          />

          {packageReady && !connected && <ConnectButton />}
          {error && (
            <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1">
              <p className="font-semibold text-emerald-300">Produce batch successfully created and verified.</p>
              <p className="text-body-sm text-fg-muted break-all">Batch ID: {result.batchId}</p>
              <p className="text-body-xs font-mono text-cyan-300 break-all">Integrity Hash: {result.digest}</p>
            </div>
          )}
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
          >
            {packageReady ? 'Sign and verify mint on Sui' : 'Create verified batch record'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
