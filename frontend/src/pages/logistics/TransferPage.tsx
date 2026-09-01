import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { Input } from '../../components/Common/Input';
import { Select } from '../../components/Common/Input';
import { cn } from '../../utils/cn';
import { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useWallet } from '../../contexts/WalletContext';
import { ledgerApi } from '../../api/ledger';

const CUSTODY_TYPES = [
  { value: 'harvest', label: 'Harvest' },
  { value: 'storage', label: 'Storage' },
  { value: 'processing', label: 'Processing' },
  { value: 'transport', label: 'Transport' },
  { value: 'retail', label: 'Retail' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Pickup' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'delayed', label: 'Delayed' },
];

export function TransferPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    batchId: '',
    custodyType: '',
    fromParty: '',
    toParty: '',
    pickupLocation: '',
    deliveryLocation: '',
    pickupDate: '',
    deliveryDate: '',
    specialInstructions: '',
    temperatureReq: '',
    quantity: '',
    unit: 'kg',
    insurance: false,
    trackingEnabled: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [transferId, setTransferId] = useState('');

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

    try {
      let suiTxDigest = 'SIMULATED_TX_' + Math.random().toString(36).substring(2, 10);

      if (connected && formData.batchId.startsWith('0x')) {
        const tx = new Transaction();
        const PACKAGE_ID = "0x12d791039ab75e08f41140ccb9be4ce80b917f3eb2b52dab150831bc29afb92f";

        tx.moveCall({
          target: `${PACKAGE_ID}::agri_ledger::transfer_custody`,
          arguments: [
            tx.object(formData.batchId),
            tx.pure.address(formData.toParty.startsWith('0x') ? formData.toParty : '0x0000000000000000000000000000000000000000')
          ],
        });

        const { digest } = await signAndExecute(tx);
        suiTxDigest = digest;
      }

      await ledgerApi.transfer(formData.batchId, {
        ...(formData.toParty.startsWith('0x')
          ? { to_wallet: formData.toParty }
          : { to_user_id: formData.toParty }),
        status: formData.custodyType === 'delivery' ? 'DELIVERED' : 'IN_TRANSIT',
        sui_tx_digest: suiTxDigest,
      });

      setTransferId('TXF-' + Math.random().toString(36).substring(2, 9).toUpperCase());
      setStep(3);
    } catch (err: any) {
      console.error(err);
      alert('Custody transfer failed. Check batch ID or backend connection.');
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
              <Input
                label="Batch ID *"
                error={!formData.batchId && step > 1 ? 'Required' : undefined}
                value={formData.batchId}
                onChange={handleChange}
                name="batchId"
                placeholder="e.g., BATCH-2024-003"
                required
              />
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
              <Button type="submit" variant="primary">Next</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-6">
            <h3 className="text-heading-sm font-semibold text-fg-primary">Party Information</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="From Party *"
                error={!formData.fromParty && step > 2 ? 'Required' : undefined}
                value={formData.fromParty}
                onChange={handleChange}
                name="fromParty"
                placeholder="Current custodian"
                required
              />
              <Input
                label="To Party *"
                error={!formData.toParty && step > 2 ? 'Required' : undefined}
                value={formData.toParty}
                onChange={handleChange}
                name="toParty"
                placeholder="Next custodian"
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
                <h3 className="text-heading-sm font-semibold text-fg-primary mb-2">Wallet Signature Required</h3>
                <p className="text-body text-fg-muted mb-6 max-w-md mx-auto">
                  To record this custody transfer on the Sui blockchain, you'll need to sign the transaction with your connected wallet.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleSubmit}
                  loading={submitting}
                  leftIcon={!submitting && <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>}
                >
                  {submitting ? 'Signing Transaction...' : 'Sign & Create Transfer'}
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="h-10 w-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-heading-sm font-semibold text-fg-primary mb-2">Transfer Created Successfully!</h3>
                <p className="text-body text-fg-muted mb-4">Your custody transfer has been recorded on the Sui blockchain.</p>
                <div className="bg-bg-tertiary/50 border border-border-primary rounded-xl p-4 text-left max-w-md mx-auto">
                  <p className="text-body-xs text-fg-muted mb-1">Transfer ID</p>
                  <p className="font-mono text-body-sm text-fg-primary break-all">{transferId}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button variant="ghost" size="icon" leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2-2v8a2 2 0 002 2z" /></svg>} />
                    <Button variant="ghost" size="icon" leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.766 15.225a.75.75 0 01.044 1.052l-4.5 4.5a.75.75 0 01-1.06-.052l-2.25-2.25a.75.75 0 011.06-1.06l1.72 1.72 3.5-3.5a.75.75 0 111.06 1.06l-2.25 2.25z" /></svg>} />
                    <Button variant="ghost" size="icon" leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>} />
                  </div>
                </div>
                <div className="flex justify-center gap-3 mt-6">
                  <Button variant="outline" onClick={() => { setStep(1); setTransferId(''); setFormData({ batchId: '', custodyType: '', fromParty: '', toParty: '', pickupLocation: '', deliveryLocation: '', pickupDate: '', deliveryDate: '', specialInstructions: '', temperatureReq: '', quantity: '', unit: 'kg', insurance: false, trackingEnabled: true }); }}>
                    Create Another Transfer
                  </Button>
                  <Button variant="primary" onClick={() => { setStep(1); setTransferId(''); }}>Back to Dashboard</Button>
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
