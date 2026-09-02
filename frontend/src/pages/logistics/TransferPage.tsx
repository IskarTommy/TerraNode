import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { Input } from '../../components/Common/Input';
import { Select } from '../../components/Common/Input';
import { cn } from '../../utils/cn';
import { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useWallet } from '../../contexts/WalletContext';
import { ledgerApi } from '../../api/ledger';
import { useBatches } from '../../hooks/useDashboardQueries';
import { Link } from 'react-router-dom';

const CUSTODY_TYPES = [
  { value: 'transport', label: 'In Transit (Transport)' },
  { value: 'storage', label: 'Storage / Silo Custody' },
  { value: 'processing', label: 'Processing Mill' },
  { value: 'delivery', label: 'Final Delivery to Retailer' },
];

export function TransferPage() {
  const [step, setStep] = useState(1);
  const { data: batchesData, refetch } = useBatches({ page_size: 100 });
  const batches = batchesData?.results ?? [];

  const [formData, setFormData] = useState({
    batchId: '',
    custodyType: 'transport',
    fromParty: 'Farmer Tommy (iskartommy117@gmail.com)',
    toParty: '18cde67b-31e1-46ac-ae2a-d487c54103f9', // AgriTransit Logistics ID
    pickupLocation: 'Farm Gate / Field Hub',
    deliveryLocation: 'Kumasi Central Grain Silos',
    pickupDate: new Date().toISOString().split('T')[0],
    deliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    specialInstructions: 'Refrigerated transit required',
    temperatureReq: '18°C',
    quantity: '',
    unit: 'kg',
    insurance: true,
    trackingEnabled: true,
  });

  const [submitting, setSubmitting] = useState(false);
  const [transferId, setTransferId] = useState('');
  const [txDigest, setTxDigest] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

  const selectedBatch = batches.find(b => b.id === formData.batchId);

  const handleBatchSelect = (batchId: string) => {
    const b = batches.find(x => x.id === batchId);
    const isInTransit = b?.status === 'IN_TRANSIT';
    setFormData(prev => ({
      ...prev,
      batchId,
      quantity: b ? String(b.weight_kg) : prev.quantity,
      custodyType: isInTransit ? 'delivery' : 'transport',
      fromParty: isInTransit
        ? 'AgriTransit Global Logistics'
        : (b?.farmer_name ? `${b.farmer_name} (${b.crop_type})` : (b ? `Tommy (${b.crop_type})` : prev.fromParty)),
      toParty: isInTransit
        ? 'b48c494a-0022-4fa3-a53a-7b6b7ed3dd2c'
        : '18cde67b-31e1-46ac-ae2a-d487c54103f9',
      pickupLocation: isInTransit ? 'AgriTransit Transit Fleet' : 'Farm Gate / Field Hub',
      deliveryLocation: 'Kumasi Central Grain Silos & Processing Facility',
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const { connected, signAndExecute } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTransferError(null);

    try {
      let suiTxDigest = '';
      const PACKAGE_ID = "0x72806395d9677780d633067dcbefd56bf67740d0e8d254700c790dae626e834c";
      const targetWallet = formData.toParty.startsWith('0x')
        ? formData.toParty
        : '0x5b6241a78240dc9213ef512808c1097230491023941092304192039120399999';

      if (connected && selectedBatch?.sui_object_id && selectedBatch.sui_object_id.startsWith('0x')) {
        try {
          const tx = new Transaction();
          tx.moveCall({
            target: `${PACKAGE_ID}::agri_ledger::transfer_custody`,
            arguments: [
              tx.object(selectedBatch.sui_object_id),
              tx.pure.address(targetWallet)
            ],
          });

          const res = await signAndExecute(tx);
          suiTxDigest = res.digest;
          setTxDigest(res.digest);
        } catch (chainErr: any) {
          console.warn('Wallet on-chain signing skipped:', chainErr);
        }
      }

      const targetStatus = (formData.custodyType === 'delivery' || selectedBatch?.status === 'IN_TRANSIT')
        ? 'DELIVERED'
        : 'IN_TRANSIT';

      await ledgerApi.transfer(formData.batchId, {
        to_user_id: formData.toParty.startsWith('0x') ? undefined : formData.toParty,
        to_wallet: formData.toParty.startsWith('0x') ? formData.toParty : undefined,
        status: targetStatus,
        sui_tx_digest: suiTxDigest || undefined,
      });

      setTransferId('TXF-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      refetch();
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setTransferError(err?.response?.data?.error || err?.message || 'Custody transfer failed. Check batch ID or backend connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <div className="space-y-6" data-role="logistics">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">Transfer Custody</h1>
          <p className="text-body text-fg-muted mt-1">Create a new custody transfer record on the blockchain</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card variant="glass" padding="md">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-body-sm font-semibold transition-all duration-fast',
                step === stepNum
                  ? 'bg-primary-bg text-primary-fg shadow-glow-primary'
                  : step < stepNum
                    ? 'bg-emerald-500 text-white'
                    : 'bg-bg-tertiary text-fg-muted'
              )}>
                {step < stepNum ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  stepNum
                )}
              </div>
              <span className={cn(
                'hidden sm:block ml-2 text-body-xs font-medium',
                step >= stepNum ? 'text-fg-primary' : 'text-fg-muted'
              )}>
                {stepNum === 1 ? 'Transfer Details' : stepNum === 2 ? 'Party Info' : 'Review & Sign'}
              </span>
              {stepNum < 3 && (
                <div className={cn(
                  'hidden sm:block w-20 h-0.5 mx-2 rounded-full',
                  step > stepNum ? 'bg-emerald-500' : 'bg-border-primary'
                )} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Form Steps */}
      <Card variant="glass" padding="lg">
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
            <h3 className="text-heading-sm font-semibold text-fg-primary">Transfer Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-body-xs font-medium text-fg-secondary mb-1">
                  Select Produce Batch *
                </label>
                <select
                  className="w-full rounded-xl border border-border-primary bg-bg-tertiary p-3 text-fg-primary outline-none focus:border-emerald-500 text-sm"
                  value={formData.batchId}
                  onChange={(e) => handleBatchSelect(e.target.value)}
                  required
                >
                  <option value="">-- Choose batch for transfer --</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.crop_type.toUpperCase()} ({Number(b.weight_kg).toFixed(1)} kg) — {b.status} [{b.id.slice(0, 8)}…]
                    </option>
                  ))}
                </select>
                {selectedBatch && (
                  <p className="mt-1 text-xs text-emerald-400 font-mono truncate">
                    Sui Object: {selectedBatch.sui_object_id || 'Off-chain'}
                  </p>
                )}
              </div>

              <Select
                label="Custody Type *"
                error={!formData.custodyType && step > 1 ? 'Required' : undefined}
                value={formData.custodyType}
                onChange={(val) => setFormData(prev => ({ ...prev, custodyType: val }))}
                placeholder="Select custody type"
                options={CUSTODY_TYPES}
                required
              />
              <Input
                label="Quantity *"
                type="number"
                step="0.01"
                min="0"
                error={!formData.quantity && step > 1 ? 'Required' : undefined}
                value={formData.quantity}
                onChange={handleChange}
                name="quantity"
                placeholder="e.g., 5000"
                required
              />
              <Select
                label="Unit"
                value={formData.unit}
                onChange={(val) => setFormData(prev => ({ ...prev, unit: val }))}
                options={[
                  { value: 'kg', label: 'Kilograms (kg)' },
                  { value: 'tonnes', label: 'Tonnes (t)' },
                  { value: 'bushels', label: 'Bushels (bu)' },
                  { value: 'pounds', label: 'Pounds (lb)' },
                ]}
              />
              <Input
                label="Temperature Requirement"
                value={formData.temperatureReq}
                onChange={handleChange}
                name="temperatureReq"
                placeholder="e.g., 4°C for refrigerated"
                helperText="Optional: Storage temperature requirement"
              />
              <Input
                label="Special Instructions"
                value={formData.specialInstructions}
                onChange={handleChange}
                name="specialInstructions"
                placeholder="Any special handling instructions..."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={!formData.batchId}>
                Next: Party Information →
              </Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
            <h3 className="text-heading-sm font-semibold text-fg-primary">Party Information</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="From Party *"
                value={formData.fromParty}
                onChange={handleChange}
                name="fromParty"
                placeholder="Current custodian"
                readOnly
              />
              <Select
                label="To Destination / Recipient *"
                value={formData.toParty}
                onChange={(val) => setFormData(prev => ({ ...prev, toParty: val }))}
                options={[
                  { value: 'b48c494a-0022-4fa3-a53a-7b6b7ed3dd2c', label: 'Kumasi Central Agro-Silos & Processing Facility' },
                  { value: '18cde67b-31e1-46ac-ae2a-d487c54103f9', label: 'AgriTransit Global Logistics Fleet' },
                  { value: '76fadd12-58e6-4740-8b5d-148a78f81fcf', label: 'Tommy (Farmer Origin Return)' },
                  { value: '73100393-38a9-4135-9bc2-0c4e967f4f0e', label: 'Ghana Commodity Exchange (GCX) Terminal' },
                ]}
                required
              />
              <Input
                label="Pickup Location *"
                error={!formData.pickupLocation && step > 2 ? 'Required' : undefined}
                value={formData.pickupLocation}
                onChange={handleChange}
                name="pickupLocation"
                placeholder="e.g., Farm Address, Warehouse"
                required
              />
              <Input
                label="Delivery Location *"
                error={!formData.deliveryLocation && step > 2 ? 'Required' : undefined}
                value={formData.deliveryLocation}
                onChange={handleChange}
                name="deliveryLocation"
                placeholder="e.g., Processing Facility, Distribution Center"
                required
              />
              <Input
                label="Pickup Date *"
                type="date"
                error={!formData.pickupDate && step > 2 ? 'Required' : undefined}
                value={formData.pickupDate}
                onChange={handleChange}
                name="pickupDate"
                required
                min={new Date().toISOString().split('T')[0]}
              />
              <Input
                label="Estimated Delivery Date *"
                type="date"
                error={!formData.deliveryDate && step > 2 ? 'Required' : undefined}
                value={formData.deliveryDate}
                onChange={handleChange}
                name="deliveryDate"
                required
                min={formData.pickupDate || undefined}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Input
                  type="checkbox"
                  name="insurance"
                  checked={formData.insurance}
                  onChange={handleChange}
                  id="insurance"
                  className="mt-8"
                />
                <label htmlFor="insurance" className="text-body-sm text-fg-secondary cursor-pointer mt-1">
                  Add Insurance Coverage
                </label>
              </div>
              <div className="flex items-start gap-3">
                <Input
                  type="checkbox"
                  name="trackingEnabled"
                  checked={formData.trackingEnabled}
                  onChange={handleChange}
                  id="trackingEnabled"
                  className="mt-8"
                />
                <label htmlFor="trackingEnabled" className="text-body-sm text-fg-secondary cursor-pointer mt-1">
                  Enable Real-time Tracking
                </label>
              </div>
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={prevStep}>Previous</Button>
              <Button type="submit" variant="primary">Next</Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            {!transferId ? (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-bg/20 flex items-center justify-center">
                  <svg className="h-10 w-10 text-primary-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 002 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h3 className="text-heading-sm font-semibold text-fg-primary mb-2">Custody Handover Confirmation</h3>
                <p className="text-body text-fg-muted mb-6 max-w-md mx-auto">
                  Confirming this transfer updates the produce status to <strong>{formData.custodyType === 'delivery' ? 'DELIVERED' : 'IN_TRANSIT'}</strong> across the decentralized ledger.
                </p>

                {transferError && (
                  <div className="p-3.5 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs max-w-md mx-auto">
                    {transferError}
                  </div>
                )}

                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={prevStep}>
                    ← Back
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmit}
                    loading={submitting}
                  >
                    {submitting ? 'Recording Custody Transfer...' : 'Confirm & Transfer Custody'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="h-10 w-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-heading-sm font-semibold text-fg-primary mb-2">Custody Transferred Successfully!</h3>
                <p className="text-body text-fg-muted mb-4">Produce batch custody has been officially updated.</p>

                <div className="bg-bg-tertiary/50 border border-border-primary rounded-xl p-4 text-left max-w-md mx-auto space-y-2">
                  <div>
                    <p className="text-body-xs text-fg-muted mb-0.5">Transfer Reference</p>
                    <p className="font-mono text-body-sm text-fg-primary break-all">{transferId}</p>
                  </div>
                  {txDigest && (
                    <div className="pt-2 border-t border-border-primary/50">
                      <p className="text-body-xs text-fg-muted mb-0.5">Sui Blockchain Transaction</p>
                      <a
                        href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-xs text-cyan-400 hover:underline inline-flex items-center gap-1 break-all"
                      >
                        <span>Tx: {txDigest.slice(0, 16)}…</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-3 mt-6">
                  <Button variant="outline" onClick={() => { setStep(1); setTransferId(''); setTxDigest(''); }}>
                    Create Another Transfer
                  </Button>
                  <Link to="/logistics/dashboard">
                    <Button variant="primary">Go to Logistics Dashboard →</Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

TransferPage.displayName = 'TransferPage';
