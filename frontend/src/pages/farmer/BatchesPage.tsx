import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { useBatches } from '../../hooks/useDashboardQueries';
import type { BatchStatus } from '../../types/ledger';

export function BatchesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | BatchStatus>('ALL');
  const { data, isLoading, isError, refetch } = useBatches({ page_size: 100 });

  const rows = useMemo(() => (
    (data?.results ?? []).filter((batch) =>
      (status === 'ALL' || batch.status === status) &&
      `${batch.id} ${batch.crop_type}`.toLowerCase().includes(search.toLowerCase())
    )
  ), [data, search, status]);

  const statusBadge = (s: BatchStatus) => {
    switch (s) {
      case 'MINTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Minted on Sui</span>;
      case 'IN_TRANSIT':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">In Transit</span>;
      case 'DELIVERED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">Delivered</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/15 text-slate-400 border border-slate-500/30">Pending</span>;
    }
  };

  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Decentralized Produce Ledger</p>
          <h1 className="text-3xl font-bold text-fg-primary">My Batches</h1>
          <p className="mt-1 text-sm text-fg-muted">Verifiable agricultural lots anchored to the Sui distributed ledger.</p>
        </div>
        <Link className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition" to="/farmer/mint-batch">
          + Mint New Batch
        </Link>
      </div>

      <Card variant="glass" padding="md">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-11 flex-1 rounded-xl border border-border-primary bg-bg-tertiary px-4 text-fg-primary outline-none focus:border-emerald-500"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search crop or batch ID"
          />
          <select
            className="min-h-11 rounded-xl border border-border-primary bg-bg-tertiary px-4 text-fg-primary"
            value={status}
            onChange={(event) => setStatus(event.target.value as 'ALL' | BatchStatus)}
          >
            <option value="ALL">All statuses</option>
            <option value="MINTED">Minted on Sui</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
            <option value="PENDING">Pending</option>
          </select>
          <Button variant="outline" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {isLoading && <p className="py-10 text-center text-fg-muted">Loading batches…</p>}
        {isError && <p className="py-10 text-center text-red-400">Batches could not be loaded.</p>}

        <div className="space-y-3">
          {rows.map((batch) => (
            <article key={batch.id} className="grid gap-4 rounded-xl border border-border-primary/60 bg-bg-tertiary/40 p-5 md:grid-cols-[1.2fr_.6fr_.6fr_1.2fr] md:items-center">
              <div>
                <h3 className="font-bold text-base text-fg-primary capitalize">{batch.crop_type}</h3>
                <p className="font-mono text-xs text-fg-muted">UUID: {batch.id}</p>
                {batch.data_integrity_hash && (
                  <p className="font-mono text-[11px] text-emerald-400/80 mt-0.5">
                    Hash: {batch.data_integrity_hash.slice(0, 16)}…
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs uppercase text-fg-muted">Weight</p>
                <p className="text-sm font-semibold text-fg-primary">{Number(batch.weight_kg).toFixed(2)} kg</p>
              </div>

              <div>
                <p className="text-xs uppercase text-fg-muted mb-1">Status</p>
                {statusBadge(batch.status)}
              </div>

              <div className="min-w-0 flex flex-col md:items-end gap-1">
                <p className="text-xs uppercase text-fg-muted">Sui Blockchain Record</p>
                <div className="truncate font-mono text-xs text-cyan-300">
                  {batch.sui_object_id ? (
                    <a
                      href={`https://testnet.suivision.xyz/object/${batch.sui_object_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline flex items-center gap-1"
                    >
                      <span>Object: {batch.sui_object_id.slice(0, 8)}…{batch.sui_object_id.slice(-6)}</span>
                      <span>↗</span>
                    </a>
                  ) : (
                    <span className="text-fg-muted font-normal">Awaiting confirmation</span>
                  )}
                </div>

                {batch.sui_tx_digest && (
                  <a
                    href={`https://suiscan.xyz/testnet/tx/${batch.sui_tx_digest}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-body-xs text-emerald-400 hover:underline"
                  >
                    View Tx on SuiScan →
                  </a>
                )}
              </div>
            </article>
          ))}

          {!isLoading && rows.length === 0 && (
            <div className="py-12 text-center text-fg-muted space-y-2">
              <p>No produce batches found.</p>
              <Link to="/farmer/mint-batch" className="text-emerald-400 hover:underline text-sm font-medium">
                Mint your first batch now →
              </Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
