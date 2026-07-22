import { Link } from 'react-router-dom';
import { StatCard } from '../../components/Dashboard/FarmerDashboard';
import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { cn } from '../../utils/cn';

const MOCK_SHIPMENTS = [
  { id: 'SHP-2024-001', batchId: 'BATCH-2024-003', from: 'Farmer John', to: 'Processor A', status: 'in_transit', pickup: '2024-10-22', delivery: '2024-10-25', temperature: '4°C' },
  { id: 'SHP-2024-002', batchId: 'BATCH-2024-004', from: 'Farmer Jane', to: 'Distributor B', status: 'delivered', pickup: '2024-07-12', delivery: '2024-07-15', temperature: '2°C' },
  { id: 'SHP-2024-003', batchId: 'BATCH-2024-002', from: 'Farmer Bob', to: 'Storage C', status: 'pending', pickup: '2024-09-14', delivery: '2024-09-18', temperature: '—' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  in_transit: { label: 'In Transit', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  delivered: { label: 'Delivered', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  delayed: { label: 'Delayed', color: 'text-red-500', bg: 'bg-red-500/10' },
};

export function LogisticsDashboard() {
  return (
    <div className="space-y-6 animate-fade-in" data-role="logistics">
      {/* Live Blockchain & Mesh Status Banner */}
      <div className="p-3.5 px-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            CUSTODY NETWORK ACTIVE
          </span>
          <span className="text-slate-400 hidden sm:inline">Active Nodes <strong className="text-slate-200">18</strong></span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 font-mono">Cold-Chain Monitor <strong className="text-emerald-400">Normal</strong></span>
        </div>
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Sui Gas: ~0.001 SUI</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-gradient-cyan">
            Logistics Console
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage custody handoffs, verify cold-chain logs, and track Sui batch transit.</p>
        </div>
        <Link to="/logistics/transfer">
          <Button variant="primary" size="md">
            + Transfer Custody
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Pending Transfers" value={3} change={0} changeLabel="awaiting pickup" trend="neutral" variant="primary" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>} />
        <StatCard title="In Transit" value={1} change={-2} changeLabel="vs yesterday" trend="down" variant="primary" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>} />
        <StatCard title="Delivered Today" value={2} change={100} changeLabel="vs last week" trend="up" variant="success" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" /></svg>} />
        <StatCard title="Avg. Delivery Time" value="2.3 days" change={-0.2} changeLabel="improving" trend="up" icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" padding="md" className="feature-card border border-slate-800/80">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-100 font-display">Active Shipments</h3>
            <Link to="/logistics/shipments">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {MOCK_SHIPMENTS.map((shipment) => {
              const config = STATUS_CONFIG[shipment.status];
              return (
                <div key={shipment.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-cyan-500/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200 font-mono">{shipment.id}</p>
                      <p className="text-xs text-slate-400">{shipment.batchId} • {shipment.from} → {shipment.to}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-semibold', config.color, config.bg)}>
                      {config.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card variant="glass" padding="md" className="feature-card border border-slate-800/80">
          <h3 className="text-base font-bold text-slate-100 font-display mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/logistics/transfer">
              <Button variant="outline" fullWidth className="h-20 flex-col gap-2 p-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                </div>
                <span className="text-xs font-semibold text-slate-200">Transfer Custody</span>
              </Button>
            </Link>
            <Link to="/logistics/shipments">
              <Button variant="outline" fullWidth className="h-20 flex-col gap-2 p-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <span className="text-xs font-semibold text-slate-200">View Shipments</span>
              </Button>
            </Link>
            <Link to="/logistics/tracking">
              <Button variant="outline" fullWidth className="h-20 flex-col gap-2 p-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <span className="text-xs font-semibold text-slate-200">Track Batch</span>
              </Button>
            </Link>
            <Link to="/logistics/settings">
              <Button variant="outline" fullWidth className="h-20 flex-col gap-2 p-4 text-left">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                </div>
                <span className="text-xs font-semibold text-slate-200">Settings</span>
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

LogisticsDashboard.displayName = 'LogisticsDashboard';