import { useState, useEffect } from 'react';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input, Select, Textarea } from '../../components/Common/Input';
import { cn } from '../../utils/cn';
import { Transaction } from '@mysten/sui/transactions';
import { bcs } from '@mysten/sui/bcs';
import { useWallet } from '../../contexts/WalletContext';
import { ledgerApi } from '../../api/ledger';
import { ConnectButton, useSuiClient } from '@mysten/dapp-kit';

const CROP_TYPES = [
  { value: 'maize', label: 'Maize (Corn)' },
  { value: 'cocoa', label: 'Cocoa' },
  { value: 'cassava', label: 'Cassava' },
  { value: 'yam', label: 'Yam' },
  { value: 'rice', label: 'Rice' },
  { value: 'cowpea', label: 'Cowpea (Beans)' },
  { value: 'plantain', label: 'Plantain' },
  { value: 'groundnut', label: 'Groundnut (Peanuts)' },
];

const VARIETIES: Record<string, Array<{ value: string; label: string }>> = {
  maize: [
    { value: 'obatanpa', label: 'Obatanpa (White Quality Protein Maize)' },
    { value: 'omankwa', label: 'Omankwa (Drought Tolerant Yellow Maize)' },
    { value: 'hondee', label: 'Hondee' },
    { value: 'abontem', label: 'Abontem (Extra-Early Yellow Maize)' },
  ],
  cocoa: [
    { value: 'hybrid', label: 'High-Yield Hybrid Cocoa' },
    { value: 'amelonado', label: 'Amelonado (Traditional West African Cocoa)' },
    { value: 'amazon', label: 'Upper Amazon Hybrid' },
  ],
  cassava: [
    { value: 'bankye_hemaa', label: 'Bankye Hemaa' },
    { value: 'ampong', label: 'Ampong' },
    { value: 'afisiafi', label: 'Afisiafi' },
    { value: 'sika_bankye', label: 'Sika Bankye' },
  ],
  yam: [
    { value: 'pona', label: 'Pona (White Yam)' },
    { value: 'laribako', label: 'Laribako' },
    { value: 'dente', label: 'Dente' },
    { value: 'water_yam', label: 'Water Yam (Afase)' },
  ],
  rice: [
    { value: 'agra_rice', label: 'AGRA Rice (Aromatic Lowland Rice)' },
    { value: 'jasmine_85', label: 'Jasmine 85' },
    { value: 'nerica_1', label: 'NERICA 1 (Upland Rice)' },
    { value: 'toxi_3107', label: 'Toxi 3107 (Irrigated Rice)' },
  ],
  cowpea: [
    { value: 'songotra', label: 'Songotra' },
    { value: 'zaayura', label: 'Zaayura' },
    { value: 'padi_tuya', label: 'Padi Tuya' },
  ],
  plantain: [
    { value: 'apantu', label: 'Apantu (False Horn Plantain)' },
    { value: 'apem', label: 'Apem (French Plantain)' },
    { value: 'oniaba', label: 'Oniaba' },
  ],
  groundnut: [
    { value: 'yenyawoso', label: 'Yenyawoso' },
    { value: 'azivivi', label: 'Azivivi' },
    { value: 'kpanini', label: 'Kpanini' },
  ],
};

// Ghana crop parameters for auto-calculation
const GHANA_CROP_PARAMS: Record<string, { daysToHarvest: number; baseYieldKgPerHa: number }> = {
  maize: { daysToHarvest: 105, baseYieldKgPerHa: 2500 },      // Obatanpa 3.5 months
  cocoa: { daysToHarvest: 180, baseYieldKgPerHa: 1200 },      // 6 months harvest cycle
  cassava: { daysToHarvest: 270, baseYieldKgPerHa: 12000 },   // Bankye 9 months
  yam: { daysToHarvest: 210, baseYieldKgPerHa: 10000 },       // Pona 7 months
  rice: { daysToHarvest: 115, baseYieldKgPerHa: 3500 },       // AGRA Rice ~4 months
  cowpea: { daysToHarvest: 70, baseYieldKgPerHa: 1500 },      // Beans ~2.3 months
  plantain: { daysToHarvest: 300, baseYieldKgPerHa: 9000 },   // Apantu ~10 months
  groundnut: { daysToHarvest: 90, baseYieldKgPerHa: 1800 },   // Peanuts ~3 months
};

const SOIL_YIELD_MULTIPLIERS: Record<string, number> = {
  loam: 1.15,
  clay: 1.05,
  sandy: 0.85,
  silt: 1.10,
  peaty: 0.95,
  chalky: 0.80,
};

const UNIT_TO_KG: Record<string, number> = {
  kg: 1,
  tonnes: 1000,
  pounds: 0.45359237,
  bushels: 25.4,
};

export function MintBatchPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    cropType: '',
    variety: '',
    fieldId: '',
    fieldName: '',
    location: '',
    area: '',
    plantedDate: '',
    estimatedHarvest: '',
    quantity: '',
    unit: 'kg',
    qualityGrade: 'A',
    notes: '',
    organicCertified: false,
    gpsCoordinates: '',
    soilType: '',
  });
  const [calculationNote, setCalculationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { connected, address, signAndExecute } = useWallet();
  const suiClient = useSuiClient();
  const [txHash, setTxHash] = useState('');

  const currentCropVarieties = formData.cropType ? VARIETIES[formData.cropType] : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  // Handle unit selection with automatic quantity conversion
  const handleUnitChange = (newUnit: string) => {
    const oldUnit = formData.unit;
    if (oldUnit === newUnit) return;
    const oldFactor = UNIT_TO_KG[oldUnit] || 1;
    const newFactor = UNIT_TO_KG[newUnit] || 1;
    const currentVal = parseFloat(formData.quantity);
    if (!isNaN(currentVal) && currentVal > 0) {
      const weightInKg = currentVal * oldFactor;
      const convertedVal = weightInKg / newFactor;
      const rounded = convertedVal >= 100 ? Math.round(convertedVal) : Math.round(convertedVal * 100) / 100;
      setFormData(prev => ({ ...prev, unit: newUnit, quantity: rounded.toString() }));
    } else {
      setFormData(prev => ({ ...prev, unit: newUnit }));
    }
  };

  // Auto-calculation effect when cropType, plantedDate, area, or soilType change
  useEffect(() => {
    const params = GHANA_CROP_PARAMS[formData.cropType];
    if (!params) return;

    let autoHarvest = formData.estimatedHarvest;
    if (formData.plantedDate) {
      const pDate = new Date(formData.plantedDate);
      if (!isNaN(pDate.getTime())) {
        pDate.setDate(pDate.getDate() + params.daysToHarvest);
        autoHarvest = pDate.toISOString().split('T')[0];
      }
    }

    let autoYield = formData.quantity;
    let note = '';
    const areaNum = Number(formData.area);
    if (areaNum > 0) {
      const soilMult = SOIL_YIELD_MULTIPLIERS[formData.soilType] || 1.0;
      const calculatedKg = Math.round(areaNum * params.baseYieldKgPerHa * soilMult);
      const unitFactor = UNIT_TO_KG[formData.unit] || 1;
      const displayQty = (calculatedKg / unitFactor);
      const roundedDisplay = displayQty >= 100 ? Math.round(displayQty) : Math.round(displayQty * 100) / 100;
      autoYield = roundedDisplay.toString();
      note = `Total harvest estimate: ~${calculatedKg.toLocaleString()} kg for ${areaNum} ha of ${formData.cropType.toUpperCase()} on ${formData.soilType ? formData.soilType.toUpperCase() : 'standard'} soil in Ghana. You can adjust the batch quantity below.`;
    }

    setFormData(prev => ({
      ...prev,
      estimatedHarvest: autoHarvest || prev.estimatedHarvest,
      quantity: autoYield || prev.quantity,
    }));
    setCalculationNote(note);
  }, [formData.cropType, formData.plantedDate, formData.area, formData.soilType]);

  const handleSelectChange = (field: string) => (newValue: string) => {
    if (field === 'unit') {
      handleUnitChange(newValue);
    } else {
      setFormData(prev => ({ ...prev, [field]: newValue }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Calculate normalized weight in kg and grams
      const rawQuantity = Number(formData.quantity) || 0;
      const unitFactor = UNIT_TO_KG[formData.unit] || 1;
      const weightInKg = Math.round(rawQuantity * unitFactor * 100) / 100;
      const weightGrams = BigInt(Math.max(1, Math.round(weightInKg * 1000)));

      // 1. Prepare batch on backend
      const prepareRes = await ledgerApi.prepare({
        crop_type: formData.cropType,
        weight_kg: weightInKg,
      });

      let finalTxHash = '';
      let suiObjectId = '';

      if (connected) {
        // 2. Build Sui Transaction for live Sui blockchain minting
        const tx = new Transaction();
        tx.setGasBudget(10_000_000);

        const PACKAGE_ID = import.meta.env.VITE_SUI_PACKAGE_ID || "0x72806395d9677780d633067dcbefd56bf67740d0e8d254700c790dae626e834c";
        const hashBytes = Array.from(new TextEncoder().encode(prepareRes.data_integrity_hash || "no-telemetry-hash"));

        tx.moveCall({
          target: `${PACKAGE_ID}::agri_ledger::mint_batch`,
          arguments: [
            tx.pure.string(formData.cropType),
            tx.pure.u64(weightGrams),
            tx.pure(bcs.vector(bcs.u8()).serialize(hashBytes)),
          ],
        });

        // 3. Sign and execute on-chain — wallet popup opens here
        try {
          const res = await signAndExecute(tx);
          finalTxHash = res.digest;
          const createdChange = res.objectChanges?.find((c: any) => c.type === 'created' && (c.objectType?.includes('ProduceBatch') || c.objectType?.includes('agri_ledger')));
          suiObjectId = (createdChange as any)?.objectId || res.effects?.created?.[0]?.reference?.objectId || '';
        } catch (walletErr: any) {
          console.error('Wallet error details:', walletErr);
          const errMsg = walletErr?.message || String(walletErr);
          alert('Wallet signing failed: ' + errMsg);
          setSubmitting(false);
          return;
        }
      }

      if (!finalTxHash) {
        alert('No wallet connected. Please connect your Slush wallet first.');
        setSubmitting(false);
        return;
      }

      setTxHash(finalTxHash);
      
      // 4. Confirm batch creation to backend database
      await ledgerApi.confirm(prepareRes.id, {
        sui_object_id: suiObjectId,
        sui_tx_digest: finalTxHash,
      });

      setStep(4);
    } catch (err: unknown) {
      console.error('Minting error (full):', JSON.stringify(err, Object.getOwnPropertyNames(err as object)), err);
      let message = 'Unknown error';
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const e = err as any;
        message = e?.response?.data?.error || e?.response?.data?.detail || e?.message || JSON.stringify(err);
      } else {
        message = String(err);
      }
      alert('Minting failed: ' + message);
    } finally {
      setSubmitting(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 4));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const progressSteps = [
    { label: 'Crop Details', number: 1 },
    { label: 'Field Info', number: 2 },
    { label: 'Quality & Yield', number: 3 },
    { label: 'Mint & Sign', number: 4 },
  ];

  return (
    <div className="space-y-5" data-role="farmer">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">Mint New Batch</h1>
          <p className="text-body text-fg-muted mt-1">Create a new blockchain-verified crop batch</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card variant="glass" padding="md">
        <div className="flex items-center justify-between">
          {progressSteps.map((stepInfo, idx) => (
            <div key={idx} className="flex items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-body-sm font-semibold transition-all duration-fast',
                step === stepInfo.number
                  ? 'bg-primary-bg text-primary-fg shadow-glow-primary'
                  : step < stepInfo.number
                    ? 'bg-emerald-500 text-white'
                    : 'bg-bg-tertiary text-fg-muted'
              )}>
                {step < stepInfo.number ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                ) : (
                  stepInfo.number
                )}
              </div>
              <span className={cn(
                'hidden sm:block ml-2 text-body-xs font-medium',
                step >= stepInfo.number ? 'text-fg-primary' : 'text-fg-muted'
              )}>
                {stepInfo.label}
              </span>
              {idx < progressSteps.length - 1 && (
                <div className={cn(
                  'hidden sm:block w-20 h-0.5 mx-2 rounded-full',
                  step > stepInfo.number ? 'bg-emerald-500' : 'bg-border-primary'
                )} />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Form Steps */}
      <Card variant="glass" padding="lg">
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-5">
            <h3 className="text-heading-sm font-semibold text-fg-primary">Crop Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Select
                label="Crop Type"
                error={!formData.cropType && step > 1 ? 'Required' : undefined}
                value={formData.cropType}
                onChange={handleSelectChange('cropType')}
                placeholder="Select crop type"
                options={CROP_TYPES}
                required
              />
              <Select
                label="Variety"
                error={!formData.variety && step > 1 ? 'Required' : undefined}
                value={formData.variety}
                onChange={handleSelectChange('variety')}
                placeholder="Select variety"
                options={currentCropVarieties}
                required
                disabled={!formData.cropType}
              />
              <Input
                label="Field ID"
                error={!formData.fieldId && step > 1 ? 'Required' : undefined}
                value={formData.fieldId}
                onChange={handleChange}
                name="fieldId"
                placeholder="e.g., FIELD-001"
                required
              />
              <Input
                label="Field Name"
                value={formData.fieldName}
                onChange={handleChange}
                name="fieldName"
                placeholder="e.g., North Field Section A"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary">Next</Button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-5">
            <h3 className="text-heading-sm font-semibold text-fg-primary">Field Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Location"
                error={!formData.location && step > 2 ? 'Required' : undefined}
                value={formData.location}
                onChange={handleChange}
                name="location"
                placeholder="e.g., County, State, Country"
                required
              />
              <Input
                label="Area (hectares)"
                type="number"
                step="0.01"
                min="0.01"
                error={!formData.area && step > 2 ? 'Required' : undefined}
                value={formData.area}
                onChange={handleChange}
                name="area"
                placeholder="e.g., 5.5"
                required
              />
              <Input
                label="GPS Coordinates"
                value={formData.gpsCoordinates}
                onChange={handleChange}
                name="gpsCoordinates"
                placeholder="e.g., 40.7128°N, 74.0060°W"
                helperText="Optional: Latitude, Longitude"
              />
              <Select
                label="Soil Type"
                value={formData.soilType}
                onChange={handleSelectChange('soilType')}
                placeholder="Select soil type"
                options={[
                  { value: 'loam', label: 'Loam' },
                  { value: 'clay', label: 'Clay' },
                  { value: 'sandy', label: 'Sandy' },
                  { value: 'silt', label: 'Silt' },
                  { value: 'peaty', label: 'Peaty' },
                  { value: 'chalky', label: 'Chalky' },
                ]}
              />
              <Input
                label="Planted Date"
                type="date"
                error={!formData.plantedDate && step > 2 ? 'Required' : undefined}
                value={formData.plantedDate}
                onChange={handleChange}
                name="plantedDate"
                required
                max={new Date().toISOString().split('T')[0]}
              />
              <Input
                label="Estimated Harvest"
                type="date"
                error={!formData.estimatedHarvest && step > 2 ? 'Required' : undefined}
                value={formData.estimatedHarvest}
                onChange={handleChange}
                name="estimatedHarvest"
                required
                min={formData.plantedDate || undefined}
              />
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={prevStep}>Previous</Button>
              <Button type="submit" variant="primary">Next</Button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={(e) => { e.preventDefault(); nextStep(); }} className="space-y-5">
            <h3 className="text-heading-sm font-semibold text-fg-primary">Quality & Yield Estimate</h3>
            {calculationNote && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-body-xs text-emerald-400 font-medium flex items-center gap-2">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {calculationNote}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Input
                label="Expected Quantity (kg)"
                type="number"
                step="0.1"
                min="0"
                error={!formData.quantity && step > 3 ? 'Required' : undefined}
                value={formData.quantity}
                onChange={handleChange}
                name="quantity"
                placeholder="e.g., 5000"
                required
              />
              <Select
                label="Unit"
                value={formData.unit}
                onChange={handleSelectChange('unit')}
                options={[
                  { value: 'kg', label: 'Kilograms (kg)' },
                  { value: 'tonnes', label: 'Tonnes (t)' },
                  { value: 'bushels', label: 'Bushels (bu)' },
                  { value: 'pounds', label: 'Pounds (lb)' },
                ]}
              />
              <Select
                label="Quality Grade"
                error={!formData.qualityGrade && step > 3 ? 'Required' : undefined}
                value={formData.qualityGrade}
                onChange={handleSelectChange('qualityGrade')}
                options={[
                  { value: 'A', label: 'Grade A - Premium' },
                  { value: 'B', label: 'Grade B - Standard' },
                  { value: 'C', label: 'Grade C - Economy' },
                ]}
                required
              />
              </div>
            <div className="col-span-1 sm:col-span-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="organicCertified"
                  name="organicCertified"
                  checked={formData.organicCertified}
                  onChange={handleChange}
                  className="h-5 w-5 rounded-sm border-checkbox-border bg-checkbox-bg text-checkbox-checked-fg appearance-none cursor-pointer transition-all duration-fast focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg checked:bg-emerald-500 checked:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <label htmlFor="organicCertified" className="text-body-sm text-fg-primary cursor-pointer select-none">
                  Organically Certified
                </label>
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                placeholder="Additional notes about this batch..."
                helperText="Optional"
              />
            </div>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={prevStep}>Previous</Button>
              <Button type="submit" variant="primary">Next</Button>
            </div>
          </form>
        )}

        {step === 4 && (
          <div className="space-y-5 text-center">
            {!txHash ? (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-bg/20 flex items-center justify-center">
                  <svg className="h-10 w-10 text-primary-fg" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <h3 className="text-heading-sm font-semibold text-fg-primary mb-2">Wallet Signature Required</h3>
                <p className="text-body text-fg-muted mb-6 max-w-md mx-auto">
                  To mint this batch on the Sui blockchain, you'll need to sign the transaction with your connected wallet.
                </p>
                {!connected ? (
                  <div className="flex justify-center">
                    <ConnectButton />
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleSubmit}
                    loading={submitting}
                    leftIcon={!submitting && <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>}
                  >
                    {submitting ? 'Signing Transaction...' : 'Sign & Mint Batch'}
                  </Button>
                )}
              </>
            ) : (
              <>
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="h-10 w-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-heading-sm font-semibold text-fg-primary mb-2">Batch Minted Successfully!</h3>
                <p className="text-body text-fg-muted mb-4">Your crop batch has been recorded on the Sui blockchain.</p>
                <div className="bg-bg-tertiary/50 border border-border-primary rounded-xl p-4 text-left max-w-md mx-auto space-y-2">
                  <div>
                    <p className="text-body-xs text-fg-muted mb-0.5">Sui Transaction Digest</p>
                    <a
                      href={`https://suiscan.xyz/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-body-sm text-cyan-400 hover:underline break-all inline-flex items-center gap-1"
                    >
                      <span>{txHash}</span>
                      <span>↗</span>
                    </a>
                  </div>
                </div>
                <div className="flex justify-center gap-3 mt-6">
                  <Button variant="outline" onClick={() => { setStep(1); setTxHash(''); setFormData({ cropType: '', variety: '', fieldId: '', fieldName: '', location: '', area: '', plantedDate: '', estimatedHarvest: '', quantity: '', unit: 'kg', qualityGrade: 'A', notes: '', organicCertified: false, gpsCoordinates: '', soilType: '' }); }}>
                    Mint Another Batch
                  </Button>
                  <Button variant="primary" onClick={() => { setStep(1); setTxHash(''); }}>Back to Dashboard</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

MintBatchPage.displayName = 'MintBatchPage';