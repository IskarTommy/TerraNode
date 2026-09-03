import { useTransferHistory } from '../../hooks/useDashboardQueries';
import type { ProduceBatch } from '../../types/ledger';

interface CustodyFlowModalProps {
  batch: ProduceBatch | null;
  onClose: () => void;
}

export function CustodyFlowModal({ batch, onClose }: CustodyFlowModalProps) {
  if (!batch) return null;

  const { data: historyData, isLoading } = useTransferHistory(batch.id);
  // Prefer transfers from direct batch response or from history query
  const transfers = (historyData && historyData.length > 0)
    ? historyData
    : (batch.transfers ?? []);

  const formatWallet = (wallet?: string | null) => {
    if (!wallet) return 'Not registered';
    if (wallet.startsWith('0x') && wallet.length > 14) {
      return `${wallet.slice(0, 8)}…${wallet.slice(-6)}`;
    }
    return wallet;
  };

  const getSuiScanTxLink = (digest?: string | null) => {
    if (!digest) return null;
    return `https://suiscan.xyz/testnet/tx/${digest}`;
  };

  const getSuiScanAccountLink = (wallet?: string | null) => {
    if (!wallet || !wallet.startsWith('0x')) return null;
    return `https://suiscan.xyz/testnet/account/${wallet}`;
  };

  const getSuiScanObjectLink = (objectId?: string | null) => {
    if (!objectId) return null;
    if (objectId.startsWith('0x')) {
      return `https://suiscan.xyz/testnet/object/${objectId}`;
    }
    return `https://suiscan.xyz/testnet/tx/${objectId}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-bg-secondary p-6 shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-primary/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">Chain of Custody Audit Trail</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                SUI TESTNET
              </span>
            </div>
            <h2 className="text-2xl font-bold text-fg-primary mt-1 capitalize flex items-center gap-2.5">
              <span>{batch.crop_type}</span>
              <span className="font-mono text-base font-normal text-fg-muted">({Number(batch.weight_kg).toFixed(1)} kg)</span>
            </h2>
            <p className="font-mono text-xs text-fg-muted truncate mt-0.5">UUID: {batch.id}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border-primary/80 bg-bg-tertiary p-2 text-fg-muted hover:text-fg-primary hover:border-border-secondary transition-colors"
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Current Custodian Summary Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-bg-tertiary/80 via-bg-tertiary/50 to-cyan-950/20 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Current Active Custodian</p>
            <p className="text-base font-bold text-fg-primary mt-0.5">
              {batch.current_custodian_name || (batch.status === 'MINTED' ? (batch.farmer_name || 'Origin Farmer') : 'Logistics Carrier')}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-fg-secondary">Wallet:</span>
              {batch.current_custodian_wallet ? (
                <a
                  href={getSuiScanAccountLink(batch.current_custodian_wallet) || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-cyan-300 hover:underline flex items-center gap-1"
                >
                  <span>{formatWallet(batch.current_custodian_wallet)}</span>
                  <span>↗</span>
                </a>
              ) : (
                <span className="text-xs text-fg-muted">Off-chain profile</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Batch Status</span>
            <span className={`mt-1 px-3 py-1 rounded-full text-xs font-bold border ${
              batch.status === 'DELIVERED'
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : batch.status === 'IN_TRANSIT'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
            }`}>
              {batch.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Flow of All Custodians & Handoffs */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-fg-secondary flex items-center justify-between">
            <span>Custody Timeline & Blockchain Handoff Flow</span>
            <span className="text-xs text-fg-muted font-normal">
              {1 + transfers.length} total state transitions
            </span>
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-border-primary">
            {/* Step 0: Origin Minted by Farmer */}
            <div className="relative group">
              {/* Dot icon */}
              <div className="absolute -left-6 top-1.5 h-5 w-5 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-[10px] text-emerald-300 font-bold">
                1
              </div>

              <div className="rounded-xl border border-border-primary/80 bg-bg-tertiary/40 p-4 space-y-2 hover:border-emerald-500/40 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Origin Farm Harvest</span>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      MINTED
                    </span>
                  </div>
                  <span className="text-xs text-fg-muted">
                    {new Date(batch.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <span className="text-fg-muted">Origin Farmer:</span>
                    <p className="font-semibold text-fg-primary">{batch.farmer_name || 'Farmer Owner'}</p>
                    {batch.farmer_email && <p className="text-fg-muted text-[11px]">{batch.farmer_email}</p>}
                  </div>

                  <div>
                    <span className="text-fg-muted">Farmer Wallet (Signer):</span>
                    <div className="mt-0.5">
                      {batch.farmer_wallet ? (
                        <a
                          href={getSuiScanAccountLink(batch.farmer_wallet) || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-cyan-300 hover:underline flex items-center gap-1"
                        >
                          <span>{formatWallet(batch.farmer_wallet)}</span>
                          <span>↗</span>
                        </a>
                      ) : (
                        <span className="text-fg-muted font-mono">Linked to Farmer Account</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Blockchain Proof */}
                <div className="pt-2 border-t border-border-primary/40 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {batch.sui_tx_digest && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">Mint Tx:</span>
                      <a
                        href={getSuiScanTxLink(batch.sui_tx_digest) || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-emerald-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>{batch.sui_tx_digest.slice(0, 10)}…</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}

                  {batch.sui_object_id && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-fg-muted">Move Object:</span>
                      <a
                        href={getSuiScanObjectLink(batch.sui_object_id) || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-cyan-300 hover:underline flex items-center gap-0.5"
                      >
                        <span>{batch.sui_object_id.slice(0, 10)}…</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}

                  {batch.data_integrity_hash && (
                    <div className="flex items-center gap-1 text-[11px] text-fg-muted font-mono">
                      <span>SHA256:</span>
                      <span className="text-emerald-400/80">{batch.data_integrity_hash.slice(0, 16)}…</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custody Transfers */}
            {isLoading && transfers.length === 0 && (
              <p className="text-xs text-fg-muted py-2">Loading custody handoff history…</p>
            )}

            {transfers.map((tx, idx) => (
              <div key={tx.id || idx} className="relative group">
                <div className="absolute -left-6 top-1.5 h-5 w-5 rounded-full bg-cyan-500/20 border-2 border-cyan-400 flex items-center justify-center text-[10px] text-cyan-300 font-bold">
                  {idx + 2}
                </div>

                <div className="rounded-xl border border-cyan-500/20 bg-bg-tertiary/50 p-4 space-y-2 hover:border-cyan-500/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        {tx.to_user_role === 'LOGISTICS' ? 'Carrier Farm Pickup & Claim' : 'Silo / Destination Delivery'}
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                        {tx.verified_on_chain ? '✓ ON-CHAIN VERIFIED' : 'LEDGER VERIFIED'}
                      </span>
                    </div>
                    <span className="text-xs text-fg-muted">
                      {new Date(tx.transferred_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Flow: From -> To */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-3 pt-1 text-xs">
                    <div>
                      <span className="text-fg-muted">From (Previous Custodian):</span>
                      <p className="font-semibold text-fg-primary">{tx.from_user_name || 'Farmer Gate'}</p>
                      <div className="mt-0.5">
                        {tx.from_wallet ? (
                          <a
                            href={getSuiScanAccountLink(tx.from_wallet) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-fg-secondary hover:text-cyan-300 hover:underline flex items-center gap-1"
                          >
                            <span>{formatWallet(tx.from_wallet)}</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <span className="text-fg-muted font-mono">Origin Custodian</span>
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:flex justify-center text-cyan-400 font-bold text-lg">
                      →
                    </div>

                    <div>
                      <span className="text-fg-muted">To (New Custodian):</span>
                      <p className="font-semibold text-cyan-300">{tx.to_user_name || 'Carrier Custodian'}</p>
                      <div className="mt-0.5">
                        {tx.to_wallet ? (
                          <a
                            href={getSuiScanAccountLink(tx.to_wallet) || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="font-mono text-cyan-300 hover:underline flex items-center gap-1"
                          >
                            <span>{formatWallet(tx.to_wallet)}</span>
                            <span>↗</span>
                          </a>
                        ) : (
                          <span className="text-fg-muted font-mono">Assigned Carrier</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Event Metadata (Vehicle, Driver, Notes) */}
                  {tx.event_metadata && Object.keys(tx.event_metadata).length > 0 && (
                    <div className="pt-2 border-t border-border-primary/40 flex flex-wrap gap-3 text-[11px] text-fg-secondary">
                      {tx.event_metadata.vehicle_reg && (
                        <span>🚛 Truck: <strong className="text-fg-primary font-mono">{tx.event_metadata.vehicle_reg}</strong></span>
                      )}
                      {tx.event_metadata.driver_name && (
                        <span>👤 Driver: <strong className="text-fg-primary">{tx.event_metadata.driver_name}</strong></span>
                      )}
                      {tx.event_metadata.pickup_notes && (
                        <span>📝 Notes: <span className="text-fg-muted italic">"{tx.event_metadata.pickup_notes}"</span></span>
                      )}
                    </div>
                  )}

                  {/* Sui Transaction Digest Link */}
                  {tx.tx_digest && (
                    <div className="pt-2 border-t border-border-primary/40 flex items-center gap-2 text-xs">
                      <span className="text-fg-muted">Sui Transaction:</span>
                      <a
                        href={getSuiScanTxLink(tx.tx_digest) || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-emerald-400 hover:underline inline-flex items-center gap-1"
                      >
                        <span>Tx: {tx.tx_digest.slice(0, 14)}…{tx.tx_digest.slice(-6)}</span>
                        <span>↗</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-border-primary/60">
          <span className="text-xs text-fg-muted">
            All transitions immutable and verifiable across decentralized ledger nodes.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

CustodyFlowModal.displayName = 'CustodyFlowModal';
