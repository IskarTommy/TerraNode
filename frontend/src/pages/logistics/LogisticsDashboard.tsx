import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { useShipments } from '../../hooks/useDashboardQueries';
import { useWallet } from '../../contexts/WalletContext';
import { useAuth } from '../../contexts/AuthContext';
import { ledgerApi } from '../../api/ledger';
import { CustodyFlowModal } from '../../components/Common/CustodyFlowModal';
import type { ProduceBatch, BatchStatus } from '../../types/ledger';

export function LogisticsDashboard() {
  const { data, isLoading, isError, refetch } = useShipments({ page_size: 50 });
  const batches = data?.results ?? [];
  const { address: walletAddress, connected } = useWallet();
  const { user } = useAuth();

  const [filterStatus, setFilterStatus] = useState<'ALL' | BatchStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFlowBatch, setViewFlowBatch] = useState<ProduceBatch | null>(null);

  // Claim Pickup Modal State
  const [claimTarget, setClaimTarget] = useState<ProduceBatch | null>(null);
  const [vehicleReg, setVehicleReg] = useState('GT-8421-26');
  const [driverName, setDriverName] = useState('Kwame Mensah (Carrier Driver)');
  const [pickupNotes, setPickupNotes] = useState('Inspected at farm gate, moisture verified');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  const count = (status: string) => batches.filter((batch) => batch.status === status).length;

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      const matchesStatus = filterStatus === 'ALL' || batch.status === filterStatus;
      const matchesSearch =
        `${batch.id} ${batch.crop_type} ${batch.status}`.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [batches, filterStatus, searchTerm]);

  const handleClaimPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTarget) return;

    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const activeWallet = walletAddress || user?.sui_public_key;
      await ledgerApi.transfer(claimTarget.id, {
        status: 'IN_TRANSIT',
        to_wallet: activeWallet || undefined,
        metadata: {
          vehicle_reg: vehicleReg,
          driver_name: driverName,
          pickup_notes: pickupNotes,
          carrier_wallet: activeWallet || 'off-chain-carrier',
          claimed_at: new Date().toISOString(),
        } as any,
      });

      setClaimSuccess(`Successfully claimed custody of ${claimTarget.crop_type} lot (${Number(claimTarget.weight_kg).toFixed(1)} kg)!`);
      refetch();
      setTimeout(() => {
        setClaimTarget(null);
        setClaimSuccess(null);
      }, 1600);
    } catch (err: any) {
      console.error('Pickup claim failed:', err);
      setClaimError(err?.response?.data?.error || err?.message || 'Failed to claim batch custody.');
    } finally {
      setClaiming(false);
    }
  };

  const statusBadge = (s: string) => {
    switch (s) {
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            ● In Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            ✓ Delivered
          </span>
        );
      case 'MINTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            ⏳ Ready for Pickup
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

  const renderBlockchainLink = (batch: ProduceBatch) => {
    // If real Sui object ID (0x...)
    if (batch.sui_object_id && batch.sui_object_id.startsWith('0x')) {
      return (
        <a
          href={`https://suiscan.xyz/testnet/object/${batch.sui_object_id}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-cyan-300 hover:underline truncate block mt-0.5"
          title={batch.sui_object_id}
        >
          Object: {batch.sui_object_id.slice(0, 8)}…{batch.sui_object_id.slice(-6)} ↗
        </a>
      );
    }

    // If transaction digest is stored
    const txDigest = batch.sui_tx_digest || (batch.sui_object_id && !batch.sui_object_id.startsWith('0x') ? batch.sui_object_id : null);
    if (txDigest) {
      return (
        <a
          href={`https://suiscan.xyz/testnet/tx/${txDigest}`}
          target="_blank"
          rel="noreferrer"
          className="font-mono text-xs text-emerald-400 hover:underline truncate block mt-0.5"
          title={txDigest}
        >
          Tx: {txDigest.slice(0, 8)}…{txDigest.slice(-6)} ↗
        </a>
      );
    }

    return <span className="text-xs text-fg-muted mt-0.5 block">Off-chain record</span>;
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
        <div className="flex items-center gap-2.5">
          <Link
            className="rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm inline-flex items-center gap-1.5"
            to="/logistics/transfer"
          >
            <span>+</span> Delivery Transfer
          </Link>
        </div>
      </div>

      {/* Carrier Wallet Active Banner */}
      <div className="p-3.5 rounded-2xl bg-bg-secondary/70 border border-border-primary flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'bg-amber-400'}`} />
          <span className="text-fg-secondary">
            Logistics Carrier Account: <strong className="text-fg-primary">{user?.full_name || 'AgriTransit Global Logistics'}</strong>
          </span>
          <span className="text-fg-muted">•</span>
          <span className="font-mono text-cyan-300">
            Wallet: {walletAddress ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}` : (user?.sui_public_key ? `${user.sui_public_key.slice(0, 8)}…${user.sui_public_key.slice(-6)}` : 'Not Connected')}
          </span>
        </div>
        {connected ? (
          <span className="text-[11px] font-semibold text-emerald-400 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
            ✓ Carrier Wallet Active
          </span>
        ) : (
          <span className="text-[11px] text-amber-300">
            Connect wallet below to sign on-chain custody transfers
          </span>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card variant="glass" padding="md" className="cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => setFilterStatus('IN_TRANSIT')}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Active In Transit</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/20 text-amber-400 bg-amber-500/10">
              Live Shipments
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-cyan-400 font-mono">{count('IN_TRANSIT')}</p>
          <p className="mt-1 text-xs text-fg-muted">Under active carrier custody</p>
        </Card>

        <Card variant="glass" padding="md" className="cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={() => setFilterStatus('DELIVERED')}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Delivered Lots</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
              Completed
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-emerald-400 font-mono">{count('DELIVERED')}</p>
          <p className="mt-1 text-xs text-fg-muted">Received at warehouse / silos</p>
        </Card>

        <Card variant="glass" padding="md" className="cursor-pointer hover:border-cyan-500/50 transition-colors" onClick={() => setFilterStatus('MINTED')}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Ready For Pickup</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-cyan-500/20 text-cyan-400 bg-cyan-500/10">
              Farm Gate
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">{count('MINTED')}</p>
          <p className="mt-1 text-xs text-fg-muted">Minted & waiting for collection</p>
        </Card>

        <Card variant="glass" padding="md" className="cursor-pointer hover:border-border-secondary transition-colors" onClick={() => setFilterStatus('ALL')}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Total Shipments</p>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-border-primary text-fg-muted bg-bg-tertiary">
              Supply Chain
            </span>
          </div>
          <p className="mt-2 text-3xl font-bold text-fg-primary font-mono">{batches.length}</p>
          <p className="mt-1 text-xs text-fg-muted">Verified lots on decentralized ledger</p>
        </Card>
      </div>

      {/* Main Batches List with Filter Tabs */}
      <Card variant="glass" padding="md">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-primary/60 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-fg-primary">Custody Batches & Dispatches</h2>
            <p className="text-xs text-fg-muted">Manage farm pickups and deliveries across decentralized custody</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'MINTED', 'IN_TRANSIT', 'DELIVERED'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  filterStatus === st
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'bg-bg-tertiary text-fg-secondary hover:text-fg-primary border border-border-primary/60'
                }`}
              >
                {st === 'ALL' ? 'All Batches' : st === 'MINTED' ? 'Ready for Pickup' : st === 'IN_TRANSIT' ? 'In Transit' : 'Delivered'}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <input
            type="text"
            className="w-full rounded-xl border border-border-primary bg-bg-tertiary px-4 py-2.5 text-sm text-fg-primary outline-none focus:border-cyan-500"
            placeholder="Search by crop type, batch UUID, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isLoading && !data && <p className="py-10 text-center text-fg-muted">Loading custody records…</p>}
        {isError && !data && <p className="py-10 text-center text-red-400">Custody records could not be loaded.</p>}

        <div className="space-y-3">
          {filteredBatches.map((batch) => (
            <div
              key={batch.id}
              className="grid gap-3 rounded-xl border border-border-primary/60 bg-bg-tertiary/40 p-4 sm:grid-cols-[1.4fr_.7fr_.9fr_auto] sm:items-center hover:border-border-secondary transition-colors"
            >
              <div>
                <p className="font-bold text-sm text-fg-primary capitalize flex items-center gap-2">
                  <span>{batch.crop_type}</span>
                  <span className="font-mono text-xs text-cyan-300 font-normal">({Number(batch.weight_kg).toFixed(1)} kg)</span>
                </p>
                <p className="font-mono text-xs text-fg-muted truncate mt-0.5">UUID: {batch.id}</p>
                {batch.farmer_name && (
                  <p className="text-[11px] text-fg-secondary mt-0.5">
                    Farmer: <span className="font-medium text-fg-primary">{batch.farmer_name}</span>
                  </p>
                )}
                {batch.data_integrity_hash && (
                  <p className="font-mono text-[11px] text-emerald-400/80 truncate mt-0.5">
                    Hash: {batch.data_integrity_hash.slice(0, 18)}…
                  </p>
                )}
              </div>

              <div>
                <p className="text-[11px] uppercase text-fg-muted">Status</p>
                <div className="mt-0.5">{statusBadge(batch.status)}</div>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] uppercase text-fg-muted">Blockchain Ledger</p>
                {renderBlockchainLink(batch)}
              </div>

              <div className="text-right flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setViewFlowBatch(batch)}
                  className="rounded-lg bg-bg-tertiary border border-border-primary/80 px-2.5 py-1.5 text-xs font-semibold text-fg-secondary hover:text-cyan-300 hover:border-cyan-500/40 transition-colors inline-flex items-center gap-1"
                  title="View complete chain of custody and user flow on SuiScan"
                >
                  <span className="text-cyan-400">🔗</span>
                  <span>Custody Flow</span>
                </button>

                {batch.status === 'MINTED' && (
                  <button
                    type="button"
                    onClick={() => setClaimTarget(batch)}
                    className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm inline-flex items-center gap-1"
                  >
                    <span>Claim & Pick Up</span>
                    <span>→</span>
                  </button>
                )}

                {batch.status === 'IN_TRANSIT' && (
                  <Link
                    to={`/logistics/transfer?batch=${batch.id}`}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1"
                  >
                    <span>Deliver Custody</span>
                    <span>→</span>
                  </Link>
                )}

                {batch.status === 'DELIVERED' && (
                  <span className="text-xs font-semibold text-emerald-400 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                    At Silos / Warehoused
                  </span>
                )}
              </div>
            </div>
          ))}

          {!isLoading && filteredBatches.length === 0 && (
            <div className="py-12 text-center text-fg-muted space-y-2">
              <p>No produce batches found matching the selected filter.</p>
              {filterStatus !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className="text-cyan-400 hover:underline text-sm font-medium"
                >
                  Clear filter to view all batches →
                </button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ─── Claim & Pick Up Modal ─── */}
      {claimTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-bg-secondary p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border-primary/60 pb-3">
              <div>
                <h3 className="text-lg font-bold text-fg-primary">Confirm Farm Produce Pickup</h3>
                <p className="text-xs text-fg-muted mt-0.5">Take custody of crop lot at farm gate</p>
              </div>
              <button
                type="button"
                onClick={() => setClaimTarget(null)}
                className="text-fg-muted hover:text-fg-primary text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleClaimPickup} className="space-y-4 text-sm">
              {/* Batch Summary */}
              <div className="p-3.5 rounded-xl bg-bg-tertiary/70 border border-border-primary/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-fg-primary capitalize text-base">{claimTarget.crop_type}</span>
                  <span className="font-mono text-cyan-300 font-semibold">{Number(claimTarget.weight_kg).toFixed(1)} kg</span>
                </div>
                <p className="font-mono text-xs text-fg-muted truncate">UUID: {claimTarget.id}</p>
                {claimTarget.farmer_name && (
                  <p className="text-xs text-fg-secondary">Origin Farmer: {claimTarget.farmer_name}</p>
                )}
                <div className="pt-1 border-t border-border-primary/40 flex items-center justify-between text-xs">
                  <span className="text-fg-muted">Current Custody:</span>
                  <span className="text-amber-300 font-semibold">Farmer Gate (Ready for Pickup)</span>
                </div>
              </div>

              {/* Carrier & Driver Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                    Vehicle / Truck Reg *
                  </label>
                  <input
                    className="w-full rounded-xl border border-border-primary bg-bg-tertiary p-2.5 text-fg-primary outline-none focus:border-cyan-500 text-sm font-mono"
                    value={vehicleReg}
                    onChange={(e) => setVehicleReg(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                    Driver / Personnel *
                  </label>
                  <input
                    className="w-full rounded-xl border border-border-primary bg-bg-tertiary p-2.5 text-fg-primary outline-none focus:border-cyan-500 text-sm"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-fg-muted uppercase tracking-wider mb-1">
                  Pickup Handover Notes
                </label>
                <input
                  className="w-full rounded-xl border border-border-primary bg-bg-tertiary p-2.5 text-fg-primary outline-none focus:border-cyan-500 text-sm"
                  value={pickupNotes}
                  onChange={(e) => setPickupNotes(e.target.value)}
                  placeholder="e.g. Weighbridge verified, seals intact"
                />
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs flex flex-col gap-1">
                <span className="font-semibold">Logistics Custodian Wallet:</span>
                <span className="font-mono text-[11px] break-all">
                  {walletAddress || user?.sui_public_key || 'Using Active Logistics Profile'}
                </span>
                <span className="text-[11px] text-fg-muted mt-0.5">
                  Confirming pickup updates the decentralized ledger status to IN_TRANSIT and records your custody.
                </span>
              </div>

              {claimError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {claimError}
                </div>
              )}

              {claimSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                  {claimSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimTarget(null)}
                  className="flex-1 rounded-xl border border-border-primary bg-bg-tertiary py-2.5 text-sm font-semibold text-fg-muted hover:text-fg-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claiming}
                  className="flex-1 rounded-xl bg-cyan-500 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm disabled:opacity-50"
                >
                  {claiming ? 'Accepting Custody…' : 'Confirm Pickup & Accept Custody'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custody Flow & User Provenance Modal */}
      {viewFlowBatch && (
        <CustodyFlowModal
          batch={viewFlowBatch}
          onClose={() => setViewFlowBatch(null)}
        />
      )}
    </div>
  );
}

LogisticsDashboard.displayName = 'LogisticsDashboard';
