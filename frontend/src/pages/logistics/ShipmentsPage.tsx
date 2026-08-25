import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { Input } from '../../components/Common/Input';
import { Select } from '../../components/Common/Input';
import { cn } from '../../utils/cn';
import { useState } from 'react';
import { formatDate } from '../../utils/formatDate';

const MOCK_SHIPMENTS = [
  {
    id: 'SHP-2024-001',
    batchId: 'BATCH-2024-003',
    fromParty: 'Green Valley Farms',
    toParty: 'Midwest Grain Processors',
    status: 'in_transit',
    pickupDate: '2024-10-22',
    deliveryDate: '2024-10-25',
    actualPickup: '2024-10-22',
    actualDelivery: null,
    origin: 'Topeka, KS',
    destination: 'Chicago, IL',
    currentLocation: 'St. Louis, MO',
    temperature: '4°C',
    humidity: '65%',
    weight: '4500 kg',
    txHash: '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890ab',
    trackingUpdates: [
      { timestamp: '2024-10-22T08:30:00Z', location: 'Topeka, KS', status: 'picked_up', description: 'Picked up from farm' },
      { timestamp: '2024-10-22T14:15:00Z', location: 'Kansas City, MO', status: 'in_transit', description: 'Departed pickup location' },
      { timestamp: '2024-10-23T09:00:00Z', location: 'St. Louis, MO', status: 'in_transit', description: 'Arrived at hub' },
      { timestamp: '2024-10-23T16:45:00Z', location: 'St. Louis, MO', status: 'in_transit', description: 'Departed hub' },
      { timestamp: '2024-10-24T11:20:00Z', location: 'Indianapolis, IN', status: 'in_transit', description: 'Passing through' },
    ],
  },
  {
    id: 'SHP-2024-002',
    batchId: 'BATCH-2024-004',
    fromParty: 'Golden Harvest Co-op',
    toParty: 'Coastal Distributors',
    status: 'delivered',
    pickupDate: '2024-07-12',
    deliveryDate: '2024-07-15',
    actualPickup: '2024-07-12',
    actualDelivery: '2024-07-15',
    origin: 'Des Moines, IA',
    destination: 'Los Angeles, CA',
    currentLocation: 'Los Angeles, CA',
    temperature: '2°C',
    humidity: '70%',
    weight: '3200 kg',
    txHash: '0x2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890abc',
    trackingUpdates: [
      { timestamp: '2024-07-12T07:00:00Z', location: 'Des Moines, IA', status: 'picked_up', description: 'Picked up from co-op' },
      { timestamp: '2024-07-12T18:30:00Z', location: 'Omaha, NE', status: 'in_transit', description: 'Departed pickup location' },
      { timestamp: '2024-07-13T14:20:00Z', location: 'Denver, CO', status: 'in_transit', description: 'Arrived at hub' },
      { timestamp: '2024-07-14T08:15:00Z', location: 'Las Vegas, NV', status: 'in_transit', description: 'Departed hub' },
      { timestamp: '2024-07-15T10:45:00Z', location: 'Los Angeles, CA', status: 'delivered', description: 'Delivered to recipient' },
    ],
  },
  {
    id: 'SHP-2024-003',
    batchId: 'BATCH-2024-002',
    fromParty: 'Prairie Fields Inc.',
    toParty: 'National Storage Solutions',
    status: 'pending',
    pickupDate: '2024-09-14',
    deliveryDate: '2024-09-18',
    actualPickup: null,
    actualDelivery: null,
    origin: 'Sioux Falls, SD',
    destination: 'Atlanta, GA',
    currentLocation: 'Sioux Falls, SD',
    temperature: '—',
    humidity: '—',
    weight: '5800 kg',
    txHash: '',
    trackingUpdates: [
      { timestamp: '2024-09-10T16:00:00Z', location: 'Sioux Falls, SD', status: 'scheduled', description: 'Pickup scheduled' },
    ],
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon?: string }> = {
  pending: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: '⏳' },
  in_transit: { label: 'In Transit', color: 'text-cyan-500', bg: 'bg-cyan-500/10', icon: '🚚' },
  delivered: { label: 'Delivered', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: '✅' },
  delayed: { label: 'Delayed', color: 'text-red-500', bg: 'bg-red-500/10', icon: '⚠️' },
  cancelled: { label: 'Cancelled', color: 'text-gray-500', bg: 'bg-gray-500/10', icon: '❌' },
};

export function ShipmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled'>('all');
  const [dateRange, setDateRange] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [selectedShipment, setSelectedShipment] = useState<typeof MOCK_SHIPMENTS[0] | null>(null);

  const filteredShipments = MOCK_SHIPMENTS.filter(shipment => {
    const matchesSearch = shipment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.fromParty.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.toParty.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;

    const now = new Date();
    const pickupDate = new Date(shipment.pickupDate);
    const matchesDateRange = dateRange === 'all' ||
      (dateRange === 'today' && pickupDate.toDateString() === now.toDateString()) ||
      (dateRange === 'week' && pickupDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)) ||
      (dateRange === 'month' && pickupDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  return (
    <div className="space-y-6" data-role="logistics">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">Shipments</h1>
          <p className="text-body text-fg-muted mt-1">Track all your shipments in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>} >
            New Shipment
          </Button>
          <Button variant="primary" leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>} >
            Export Report
          </Button>
        </div>
      </div>

      <Card variant="glass" padding="md">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <Input
              placeholder="Search shipments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex-1 min-w-0 flex gap-2">
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'Pending' },
                { value: 'in_transit', label: 'In Transit' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'delayed', label: 'Delayed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
              className="w-full sm:w-32"
              placeholder="Status"
            />
            <Select
              value={dateRange}
              onChange={(val) => setDateRange(val as any)}
              options={[
                { value: 'all', label: 'All Time' },
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
              ]}
              className="w-full sm:w-32"
              placeholder="Date Range"
            />
          </div>
        </div>
      </Card>

      <div className="overflow-hidden">
        {filteredShipments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead>
                <tr className="border-b border-border-primary bg-bg-tertiary/50">
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Shipment ID</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Batch</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Route</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Pickup</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Delivery</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Temp</th>
                  <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary/50">
                {filteredShipments.map((shipment) => {
                  const config = STATUS_CONFIG[shipment.status];
                  return (
                    <tr key={shipment.id} className="hover:bg-bg-tertiary/50 transition-cursor" onClick={() => setSelectedShipment(shipment)}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-body-sm font-medium text-fg-primary">{shipment.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-body-sm font-medium text-fg-primary">{shipment.batchId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-body-xs text-fg-secondary">{shipment.fromParty}</span>
                          <span className="text-body-xs text-fg-secondary">→</span>
                          <span className="text-body-xs text-fg-secondary">{shipment.toParty}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-body-xs font-medium', config.color, config.bg)}>
                          <span aria-hidden="true">{config.icon}</span>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-body-sm text-fg-secondary">{formatDate(shipment.pickupDate)}</td>
                      <td className="px-4 py-3 text-body-sm text-fg-secondary">{formatDate(shipment.deliveryDate)}</td>
                      <td className="px-4 py-3 text-body-sm text-fg-secondary">{shipment.currentLocation}</td>
                      <td className="px-4 py-3 text-body-sm text-fg-secondary">{shipment.temperature}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {shipment.txHash && (
                            <Button variant="ghost" size="icon" className="text-fg-muted hover:text-emerald-500" onClick={(e) => { e.stopPropagation(); window.open(`https://explorer.sui.io/txblock/${shipment.txHash}`, '_blank'); }}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="text-fg-muted hover:text-primary-fg" onClick={(e) => { e.stopPropagation(); setSelectedShipment(shipment); }}>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <svg className="h-12 w-12 mx-auto text-fg-muted mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            <p className="text-body text-fg-muted">No shipments found</p>
            <p className="text-body-xs text-fg-muted mt-1">Try adjusting your search or filter</p>
          </div>
        )}
      </div>

      {/* Shipment Detail Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in" onClick={() => setSelectedShipment(null)}>
          <div className="bg-bg-elevated rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-border-primary flex items-center justify-between">
              <h2 className="text-heading-sm font-bold text-fg-primary">Shipment Details</h2>
              <button onClick={() => setSelectedShipment(null)} className="p-2 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-tertiary transition-colors">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Shipment ID', value: selectedShipment.id },
                  { label: 'Associated Batch', value: selectedShipment.batchId },
                  { label: 'From', value: selectedShipment.fromParty },
                  { label: 'To', value: selectedShipment.toParty },
                  { label: 'Status', value: STATUS_CONFIG[selectedShipment.status].label },
                  { label: 'Origin', value: selectedShipment.origin },
                  { label: 'Destination', value: selectedShipment.destination },
                  { label: 'Current Location', value: selectedShipment.currentLocation },
                  { label: 'Pickup Date', value: formatDate(selectedShipment.pickupDate) },
                  { label: 'Actual Pickup', value: selectedShipment.actualPickup ? formatDate(selectedShipment.actualPickup) : 'Not picked up' },
                  { label: 'Delivery Date', value: formatDate(selectedShipment.deliveryDate) },
                  { label: 'Actual Delivery', value: selectedShipment.actualDelivery ? formatDate(selectedShipment.actualDelivery) : 'Not delivered' },
                  { label: 'Weight', value: selectedShipment.weight },
                  { label: 'Temperature', value: selectedShipment.temperature },
                  { label: 'Humidity', value: selectedShipment.humidity },
                  { label: 'Transaction Hash', value: selectedShipment.txHash ? `${selectedShipment.txHash.slice(0, 10)}...${selectedShipment.txHash.slice(-8)}` : 'Not recorded' },
                ].map((item) => (
                  <div key={item.label} className="bg-bg-tertiary/50 rounded-xl p-3">
                    <p className="text-body-xs text-fg-muted">{item.label}</p>
                    <p className="text-body-sm font-medium text-fg-primary break-all">{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <h3 className="text-body font-semibold text-fg-primary mb-2">Tracking Updates</h3>
                <div className="space-y-3">
                  {selectedShipment.trackingUpdates.map((update, index) => (
                    <div key={index} className="p-3 rounded-lg bg-bg-tertiary/50 border border-border-primary/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-body-sm font-medium text-fg-primary">{update.status.replace('_', ' ')}</p>
                          <p className="text-body-xs text-fg-muted">{update.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-body-xs font-mono text-fg-secondary">{new Date(update.timestamp).toLocaleString()}</p>
                          <span className={cn(
                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-body-xs',
                            update.status === 'picked_up' && 'bg-emerald-500/20 text-emerald-500',
                            update.status === 'in_transit' && 'bg-cyan-500/20 text-cyan-500',
                            update.status === 'delivered' && 'bg-emerald-500/20 text-emerald-500',
                            update.status === 'scheduled' && 'bg-amber-500/20 text-amber-500',
                          )}>
                            {update.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-primary">
                {selectedShipment.txHash && (
                  <Button variant="outline" leftIcon={<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>} onClick={() => navigator.clipboard.writeText(selectedShipment.txHash)}>
                    Copy Tx Hash
                  </Button>
                )}
                <Button variant="primary" onClick={() => setSelectedShipment(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ShipmentsPage.displayName = 'ShipmentsPage';