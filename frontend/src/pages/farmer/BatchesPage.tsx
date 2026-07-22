import { useState } from 'react';
import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { Input } from '../../components/Common/Input';
import { cn } from '../../utils/cn';
import { formatDate } from '../../utils/formatDate';

type BatchStatus = 'growing' | 'harvested' | 'minted' | 'shipped';

const MOCK_BATCHES = [
  {
    id: 'BATCH-2024-001',
    cropType: 'Wheat',
    variety: 'Hard Red Winter',
    plantedDate: '2024-10-15',
    estimatedHarvest: '2025-06-20',
    actualHarvest: null,
    status: 'growing',
    quantity: 5000,
    unit: 'kg',
    qualityScore: 92,
    yieldEstimate: 8.5,
    txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    organicCertified: true,
    fieldId: 'FIELD-001',
    location: 'Kansas, USA',
  },
  {
    id: 'BATCH-2024-002',
    cropType: 'Corn',
    variety: 'Sweet Corn Hybrid',
    plantedDate: '2024-05-01',
    estimatedHarvest: '2024-09-15',
    actualHarvest: '2024-09-12',
    status: 'harvested',
    quantity: 12300,
    unit: 'kg',
    qualityScore: 95,
    yieldEstimate: 12.3,
    txHash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abc',
    organicCertified: false,
    fieldId: 'FIELD-002',
    location: 'Iowa, USA',
  },
  {
    id: 'BATCH-2024-003',
    cropType: 'Soybean',
    variety: 'High Protein',
    plantedDate: '2024-06-10',
    estimatedHarvest: '2024-10-25',
    actualHarvest: '2024-10-20',
    status: 'minted',
    quantity: 4200,
    unit: 'kg',
    qualityScore: 88,
    yieldEstimate: 4.2,
    txHash: '0x3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcd',
    organicCertified: true,
    fieldId: 'FIELD-003',
    location: 'Illinois, USA',
  },
  {
    id: 'BATCH-2024-004',
    cropType: 'Barley',
    variety: 'Malting Barley',
    plantedDate: '2024-03-20',
    estimatedHarvest: '2024-07-15',
    actualHarvest: '2024-07-10',
    status: 'shipped',
    quantity: 6800,
    unit: 'kg',
    qualityScore: 90,
    yieldEstimate: 6.8,
    txHash: '0x4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    organicCertified: false,
    fieldId: 'FIELD-004',
    location: 'Colorado, USA',
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  growing: { label: 'Growing', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: '🌱' },
  harvested: { label: 'Harvested', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: '🌾' },
  minted: { label: 'Minted', color: 'text-cyan-500', bg: 'bg-cyan-500/10', icon: '⛓️' },
  shipped: { label: 'Shipped', color: 'text-violet-500', bg: 'bg-violet-500/10', icon: '🚛' },
} as const;

export function BatchesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'growing' | 'harvested' | 'minted' | 'shipped'>('all');
  const [selectedBatch, setSelectedBatch] = useState<typeof MOCK_BATCHES[0] | null>(null);

  const filteredBatches = MOCK_BATCHES.filter(batch => {
    const matchesSearch = batch.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.cropType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.fieldId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">My Batches</h1>
          <p className="text-body text-fg-muted mt-1">Track all your crop batches from planting to delivery</p>
        </div>
        <Button
          variant="primary"
          leftIcon={
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          }
        >
          New Batch
        </Button>
      </div>

      <Card variant="glass" padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <Input
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'growing' | 'harvested' | 'minted' | 'shipped')}
            className="w-full sm:w-48 bg-input-bg border-input-border text-input-fg rounded-input input-padding focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary-bg"
          >
            <option value="all">All</option>
            <option value="growing">Growing</option>
            <option value="harvested">Harvested</option>
            <option value="minted">Minted</option>
            <option value="shipped">Shipped</option>
          </select>
        </div>
      </Card>

      <Card variant="glass" padding="none" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead>
              <tr className="border-b border-border-primary bg-bg-tertiary/50">
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Batch ID</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Crop</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Field</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Planted</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Harvest</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Yield</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Quality</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary/50">
              {filteredBatches.map((batch) => {
                const config = STATUS_CONFIG[batch.status];
                return (
                  <tr key={batch.id} className="hover:bg-bg-tertiary/50 transition-colors" onClick={() => setSelectedBatch(batch)}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-body-sm font-medium text-fg-primary">{batch.id}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-body-sm font-medium text-fg-primary">{batch.cropType}</p>
                        <p className="text-body-xs text-fg-muted">{batch.variety}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-body-sm text-fg-secondary">{batch.fieldId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-body-xs font-medium', config.color, config.bg)}>
                        <span aria-hidden="true">{config.icon}</span>
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-body-sm text-fg-secondary">{formatDate(batch.plantedDate)}</td>
                    <td className="px-4 py-3 text-body-sm text-fg-secondary">
                      {batch.actualHarvest ? formatDate(batch.actualHarvest) : formatDate(batch.estimatedHarvest) + (batch.actualHarvest ? '' : ' (est.)')}
                    </td>
                    <td className="px-4 py-3 text-body-sm font-medium text-fg-primary tabular-nums">
                      {batch.yieldEstimate?.toFixed(1)} t/ha
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-body-sm font-semibold text-fg-primary">{batch.qualityScore}</span>
                        <svg className="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-fg-muted hover:text-primary-fg" onClick={(e) => { e.stopPropagation(); setSelectedBatch(batch); }}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-fg-muted hover:text-cyan-500" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(batch.txHash); }}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </Button>
                        {batch.txHash && (
                          <Button variant="ghost" size="icon" className="text-fg-muted hover:text-emerald-500" onClick={(e) => { e.stopPropagation(); window.open(`https://explorer.sui.io/txblock/${batch.txHash}`, '_blank'); }}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredBatches.length === 0 && (
          <div className="p-12 text-center">
            <svg className="h-12 w-12 mx-auto text-fg-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-body text-fg-muted">No batches found</p>
            <p className="text-body-xs text-fg-muted mt-1">Try adjusting your search or filter</p>
          </div>
        )}
      </Card>

      {/* Batch Detail Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={() => setSelectedBatch(null)}>
          <div className="bg-bg-elevated rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-primary flex items-center justify-between">
              <h2 className="text-heading-sm font-bold text-fg-primary">Batch Details</h2>
              <button onClick={() => setSelectedBatch(null)} className="p-2 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-tertiary transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Batch ID', value: selectedBatch.id },
                  { label: 'Crop', value: `${selectedBatch.cropType} - ${selectedBatch.variety}` },
                  { label: 'Field', value: `${selectedBatch.fieldId} (${selectedBatch.location})` },
                  { label: 'Status', value: STATUS_CONFIG[selectedBatch.status].label },
                  { label: 'Planted', value: formatDate(selectedBatch.plantedDate) },
                  { label: 'Est. Harvest', value: formatDate(selectedBatch.estimatedHarvest) },
                  { label: 'Actual Harvest', value: selectedBatch.actualHarvest ? formatDate(selectedBatch.actualHarvest) : '—' },
                  { label: 'Quantity', value: `${selectedBatch.quantity.toLocaleString()} ${selectedBatch.unit}` },
                  { label: 'Yield Estimate', value: `${selectedBatch.yieldEstimate?.toFixed(1) || '—'} t/ha` },
                  { label: 'Quality Score', value: `${selectedBatch.qualityScore}/100` },
                  { label: 'Organic Certified', value: selectedBatch.organicCertified ? 'Yes' : 'No' },
                  { label: 'Transaction Hash', value: selectedBatch.txHash ? `${selectedBatch.txHash.slice(0, 10)}...${selectedBatch.txHash.slice(-8)}` : 'Not minted' },
                ].map((item) => (
                  <div key={item.label} className="bg-bg-tertiary/50 rounded-xl p-3">
                    <p className="text-body-xs text-fg-muted">{item.label}</p>
                    <p className="text-body-sm font-medium text-fg-primary break-all">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-primary">
                {selectedBatch.txHash && (
                  <Button
                    variant="outline"
                    leftIcon={
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    }
                    onClick={() => navigator.clipboard.writeText(selectedBatch.txHash)}
                  >
                    Copy Tx Hash
                  </Button>
                )}
                <Button variant="primary" onClick={() => setSelectedBatch(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

BatchesPage.displayName = 'BatchesPage';