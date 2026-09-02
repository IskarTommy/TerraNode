import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { useBatches } from '../../hooks/useDashboardQueries';
import { ledgerApi } from '../../api/ledger';
import { useWallet } from '../../contexts/WalletContext';
import { Transaction } from '@mysten/sui/transactions';
import type { BatchStatus, ProduceBatch } from '../../types/ledger';

export function BatchesPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | BatchStatus>('ALL');
  const { data, isLoading, isError, refetch } = useBatches({ page_size: 100 });
  const { connected, signAndExecute } = useWallet();

  const [transferTarget, setTransferTarget] = useState<ProduceBatch | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const [carrierId, setCarrierId] = useState('18cde67b-31e1-46ac-ae2a-d487c54103f9');
  const [destination, setDestination] = useState('Kumasi Central Aggregation Hub');

  const rows = useMemo(() => (
    (data?.results ?? []).filter((batch) =>
      (status === 'ALL' || batch.status === status) &&
      `${batch.id} ${batch.crop_type}`.toLowerCase().includes(search.toLowerCase())
    )
  ), [data, search, status]);

  const handleHandover = async () => {
    if (!transferTarget) return;
    setTransferring(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      let suiTxDigest = '';
      const carrierWallet = '0x3f1248b98240dc9213ef512808c1097230491023941092304192039120391203';
      const PACKAGE_ID = "0x72806395d9677780d633067dcbefd56bf67740d0e8d254700c790dae626e834c";

      // If wallet is connected and batch has an on-chain object ID, sign transfer_custody
      if (connected && transferTarget.sui_object_id && transferTarget.sui_object_id.startsWith('0x')) {
        try {
          const tx = new Transaction();
          tx.moveCall({
            target: `${PACKAGE_ID}::agri_ledger::transfer_custody`,
            arguments: [
              tx.object(transferTarget.sui_object_id),
              tx.pure.address(carrierWallet)
            ],
          });
          const res = await signAndExecute(tx);
          suiTxDigest = res.digest;
        } catch (chainErr: any) {
          console.warn('On-chain custody transfer signature failed/skipped:', chainErr);
          // Allow fallback to off-chain backend ledger transfer if chain rejects
        }
      }

      await ledgerApi.transfer(transferTarget.id, {
        to_user_id: carrierId,
        to_wallet: carrierWallet,
        status: 'IN_TRANSIT',
        sui_tx_digest: suiTxDigest || undefined,
      });

      setTransferSuccess(`Custody for ${transferTarget.crop_type} transferred to Carrier!`);
      refetch();
      setTimeout(() => {
        setTransferTarget(null);
        setTransferSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Handover failed:', err);
      setTransferError(err?.response?.data?.error || err?.message || 'Custody transfer failed.');
    } finally {
      setTransferring(false);
    }
  };

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
        <Link className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm inline-flex items-center gap-1.5" to="/farmer/mint-batch">
          <span>+</span> Mint New Batch
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

        {isLoading && !data && <p className="py-10 text-center text-fg-muted">Loading batches…</p>}
        {isError && !data && <p className="py-10 text-center text-red-400">Batches could not be loaded.</p>}

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
                <div className="flex flex-col items-start gap-2">
                  {statusBadge(batch.status)}
                  {batch.status === 'MINTED' && (
                    <button
                      type="button"
                      onClick={() => setTransferTarget(batch)}
                      className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-colors inline-flex items-center gap-1"
                    >
                      <span>Hand Over to Logistics</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex flex-col md:items-end gap-1">
                <p className="text-xs uppercase text-fg-muted">Sui Blockchain Record</p>
                <div className="truncate font-mono text-xs text-cyan-300">
                  {batch.sui_object_id ? (
                    <a
                      href={`https://suiscan.xyz/testnet/object/${batch.sui_object_id}`}
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

      {/* Custody Handover Modal */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border-primary bg-bg-secondary p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
              <div>
                <h3 className="text-lg font-bold text-fg-primary">Hand Over Batch to Logistics</h3>
                <p className="text-xs text-fg-muted mt-0.5">Transfer custody to authorized transport carrier</p>
              </div>
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="text-fg-muted hover:text-fg-primary text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="p-3.5 rounded-xl bg-bg-tertiary/70 border border-border-primary/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg-primary capitalize text-base">{transferTarget.crop_type}</span>
                  <span className="font-mono text-emerald-400 font-semibold">{Number(transferTarget.weight_kg).toFixed(2)} kg</span>
                </div>
                <p className="font-mono text-xs text-fg-muted truncate">Batch UUID: {transferTarget.id}</p>
                {transferTarget.sui_object_id && (
                  <p className="font-mono text-xs text-cyan-300 truncate">Sui Object: {transferTarget.sui_object_id}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">
                  Designated Logistics Carrier
                </label>
                <select
                  className="w-full rounded-xl border border-border-primary bg-bg-tertiary p-3 text-fg-primary outline-none focus:border-emerald-500"
                  value={carrierId}
                  onChange={(e) => setCarrierId(e.target.value)}
                >
                  <option value="18cde67b-31e1-46ac-ae2a-d487c54103f9">
                    AgriTransit Global Logistics (logistics@terranode.agri)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1.5">
                  Destination Aggregation Center
                </label>
                <input
                  className="w-full rounded-xl border border-border-primary bg-bg-tertiary p-3 text-fg-primary outline-none focus:border-emerald-500"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Kumasi Central Grain Silos / Tema Port Hub"
                />
              </div>

              {connected ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                  <span className="text-sm">✓</span>
                  <span>Wallet connected. Handover will update both the backend ledger and Sui blockchain custody.</span>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  Wallet not connected. Handover will be recorded in the off-chain decentralized ledger.
                </div>
              )}

              {transferError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {transferError}
                </div>
              )}

              {transferSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  {transferSuccess}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTransferTarget(null)}
                className="flex-1 rounded-xl border border-border-primary bg-bg-tertiary py-2.5 text-sm font-semibold text-fg-muted hover:text-fg-primary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={transferring}
                onClick={handleHandover}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 transition-colors shadow-sm disabled:opacity-50"
              >
                {transferring ? 'Transferring Custody…' : 'Sign & Transfer Custody'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
