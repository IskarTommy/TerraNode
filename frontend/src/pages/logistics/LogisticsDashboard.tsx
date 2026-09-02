import { Link } from 'react-router-dom';
import { Card } from '../../components/Common/Card';
import { useShipments } from '../../hooks/useDashboardQueries';

export function LogisticsDashboard() {
  const { data, isLoading, isError } = useShipments({ page_size: 50 });
  const batches = data?.results ?? [];

  const count = (status: string) => batches.filter((batch) => batch.status === status).length;

  const statusBadge = (s: string) => {
    switch (s) {
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Delivered
          </span>
        );
      case 'MINTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            Ready for Pickup
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">
            {s.replace('_', ' ')}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-role="logistics">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Custody & Dispatch Workspace</p>
          <h1 className="text-3xl font-bold text-fg-primary">Logistics Mission Control</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Track produce batches in transit, verify farm pickups, and record on-chain custody handoffs.
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm inline-flex items-center gap-1.5"
            to="/logistics/transfer"
          >
            <span>+</span> Initiate Transfer
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Active In Transit</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/20 text-amber-400 bg-amber-500/10">
              Live Shipments
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-cyan-400 font-mono">{count('IN_TRANSIT')}</p>
          <p className="mt-1 text-xs text-fg-muted">Under active carrier custody</p>
        </Card>

        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Delivered Lots</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
              Completed
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-400 font-mono">{count('DELIVERED')}</p>
          <p className="mt-1 text-xs text-fg-muted">Received at warehouse / silos</p>
        </Card>

        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Ready For Pickup</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20 text-cyan-400 bg-cyan-500/10">
              Farm Gate
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">{count('MINTED')}</p>
          <p className="mt-1 text-xs text-fg-muted">Minted & waiting for collection</p>
        </Card>

        <Card variant="glass" padding="md">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Total Shipments</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border-primary text-fg-muted bg-bg-tertiary">
              Supply Chain
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">{data?.count ?? 0}</p>
          <p className="mt-1 text-xs text-fg-muted">Verified lots on decentralized ledger</p>
        </Card>
      </div>

      {/* Main Batches List */}
      <Card variant="glass" padding="md">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary">Custody Batches & Dispatches</h2>
            <p className="text-xs text-fg-muted">All active produce lots across transport and storage custody</p>
          </div>
          <Link className="text-xs font-semibold text-cyan-400 hover:underline" to="/logistics/transfer">
            + New Transfer Handover →
          </Link>
        </div>

        {isLoading && !data && <p className="py-10 text-center text-fg-muted">Loading custody records…</p>}
        {isError && !data && <p className="py-10 text-center text-red-400">Custody records could not be loaded.</p>}

        <div className="space-y-3">
          {batches.map((batch) => (
            <div
              key={batch.id}
              className="grid gap-3 rounded-xl border border-border-primary/60 bg-bg-tertiary/40 p-4 sm:grid-cols-[1.4fr_.8fr_.8fr_auto] sm:items-center hover:border-border-secondary transition-colors"
            >
              <div>
                <p className="font-bold text-sm text-fg-primary capitalize flex items-center gap-2">
                  <span>{batch.crop_type}</span>
                  <span className="font-mono text-xs text-fg-muted font-normal">({Number(batch.weight_kg).toFixed(1)} kg)</span>
                </p>
                <p className="font-mono text-xs text-fg-muted truncate mt-0.5">UUID: {batch.id}</p>
                {batch.data_integrity_hash && (
                  <p className="font-mono text-[11px] text-emerald-400/80 truncate mt-0.5">
                    Hash: {batch.data_integrity_hash.slice(0, 20)}…
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] uppercase text-fg-muted">Status</p>
                <div className="mt-0.5">{statusBadge(batch.status)}</div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] uppercase text-fg-muted">Blockchain Object</p>
                {batch.sui_object_id ? (
                  <a
                    href={`https://suiscan.xyz/testnet/object/${batch.sui_object_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-cyan-300 hover:underline truncate block mt-0.5"
                  >
                    {batch.sui_object_id.slice(0, 8)}…{batch.sui_object_id.slice(-6)} ↗
                  </a>
                ) : (
                  <span className="text-xs text-fg-muted">Off-chain record</span>
                )}
              </div>

              <div className="text-right">
                <Link
                  className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors inline-flex items-center gap-1"
                  to={`/logistics/transfer?batch=${batch.id}`}
                >
                  <span>Handoff</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}

          {!isLoading && batches.length === 0 && (
            <div className="py-12 text-center text-fg-muted space-y-2">
              <p>No produce batches found in the supply chain.</p>
              <Link to="/logistics/transfer" className="text-cyan-400 hover:underline text-sm font-medium">
                Initiate a custody transfer →
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

LogisticsDashboard.displayName = 'LogisticsDashboard';

