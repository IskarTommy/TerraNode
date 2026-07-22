import { useState } from 'react';
import { Button } from '../../components/Common';

interface TrackingEvent {
  time: string;
  location: string;
  status: string;
  actor: string;
  txHash: string;
  temp: string;
  humidity: string;
}

const SAMPLE_TRACKING: Record<string, { batchId: string; crop: string; weight: string; events: TrackingEvent[] }> = {
  'TN-2026-8901': {
    batchId: 'TN-2026-8901',
    crop: 'Organic Heirloom Wheat',
    weight: '2,400 kg',
    events: [
      {
        time: '2026-07-21 02:14 UTC',
        location: 'Central Distribution Hub — Transit Station 4',
        status: 'In Transit / Cold Storage Verified',
        actor: 'SwiftLogistics Ltd (0x4a12...990b)',
        txHash: '0x8f7c9e2b10a43f87621d9e',
        temp: '4.2°C',
        humidity: '58%'
      },
      {
        time: '2026-07-20 18:30 UTC',
        location: 'GreenValley Farm — Loading Dock B',
        status: 'Custody Hand-off Signed & Transferred',
        actor: 'Farmer John Doe (0x7a89...4567)',
        txHash: '0x3b2a10c9d8e7f6543210ab',
        temp: '5.0°C',
        humidity: '60%'
      },
      {
        time: '2026-07-20 14:00 UTC',
        location: 'GreenValley Farm — Sector 4B',
        status: 'Batch Minted on Sui Blockchain',
        actor: 'TerraNode Sensor Mesh (0x1111...2222)',
        txHash: '0x1a2b3c4d5e6f7a8b9c0d1e',
        temp: '18.4°C',
        humidity: '65%'
      }
    ]
  }
};

export function TrackingPage() {
  const [searchQuery, setSearchQuery] = useState('TN-2026-8901');
  const [activeShipment, setActiveShipment] = useState(SAMPLE_TRACKING['TN-2026-8901']);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (SAMPLE_TRACKING[searchQuery]) {
      setActiveShipment(SAMPLE_TRACKING[searchQuery]);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-display">Live Provenance & Asset Tracking</h1>
        <p className="text-slate-400 text-sm mt-1">Track Sui batch NFTs, custody handoffs, and real-time cold-chain environmental sensors.</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Enter Batch ID or Sui NFT Object ID (e.g. TN-2026-8901)"
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
        />
        <Button type="submit" variant="primary">
          Track Provenance
        </Button>
      </form>

      {activeShipment && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-slate-400 block font-medium">Batch Identifier</span>
              <span className="text-lg font-bold text-cyan-400 font-mono">{activeShipment.batchId}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Crop & Commodity</span>
              <span className="text-lg font-semibold text-slate-200">{activeShipment.crop}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Verified Weight</span>
              <span className="text-lg font-semibold text-slate-200">{activeShipment.weight}</span>
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Blockchain Verification</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 mt-1">
                ✓ Verified Sui NFT
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-6">
            <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-3">Chain of Custody Timeline</h2>
            <div className="relative border-l-2 border-slate-800 ml-4 pl-6 space-y-8">
              {activeShipment.events.map((event, idx) => (
                <div key={idx} className="relative">
                  <div className={`absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full border-2 bg-slate-950 ${
                    idx === 0 ? 'border-cyan-400 bg-cyan-400/20 animate-pulse' : 'border-emerald-500 bg-emerald-500'
                  }`} />
                  <div>
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="text-sm font-semibold text-slate-100">{event.status}</h3>
                      <span className="text-xs text-slate-500 font-mono">{event.time}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{event.location}</p>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400 mt-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
                      <span>Actor: <strong className="text-slate-300">{event.actor}</strong></span>
                      <span>·</span>
                      <span>Tx: <a href={`https://suiscan.xyz/testnet/tx/${event.txHash}`} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">{event.txHash.slice(0, 10)}…</a></span>
                      <span>·</span>
                      <span className="text-emerald-400">Temp: {event.temp}</span>
                      <span>·</span>
                      <span className="text-cyan-400">Humidity: {event.humidity}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
