import { useState } from 'react';
import { Button } from '../../components/Common';

interface AlertItem {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  sensorId: string;
  location: string;
  acknowledged: boolean;
}

const INITIAL_ALERTS: AlertItem[] = [
  {
    id: 'ALT-8901',
    timestamp: '10 mins ago',
    severity: 'critical',
    title: 'Moisture Drop Below Critical Threshold',
    message: 'Sensor S-102 (Sector 4B) detected volumetric water content at 14% (Threshold: 20%). Immediate irrigation required.',
    sensorId: 'S-102',
    location: 'Sector 4B — Corn Field',
    acknowledged: false,
  },
  {
    id: 'ALT-8898',
    timestamp: '42 mins ago',
    severity: 'warning',
    title: 'Unusual Frost Hazard Warning',
    message: 'Ambient temp predicted to dip to 1.2°C at 04:00 AM UTC. Frost protection systems pre-heat recommended.',
    sensorId: 'WEATHER-STATION-1',
    location: 'North Perimeter',
    acknowledged: false,
  },
  {
    id: 'ALT-8854',
    timestamp: '2 hours ago',
    severity: 'info',
    title: 'Sui Blockchain Batch Mint Confirmed',
    message: 'Batch #TN-2026-892 successfully committed to Sui Ledger. Tx: 0x9f8a...c3d1 (Gas: 0.0012 SUI).',
    sensorId: 'SUI-CHAIN-NODE',
    location: 'Smart Contract',
    acknowledged: true,
  },
  {
    id: 'ALT-8812',
    timestamp: '5 hours ago',
    severity: 'warning',
    title: 'Sensor Battery Low (12%)',
    message: 'Telemetry Node #S-108 reported battery status at 12%. Replacement recommended before upcoming harvest cycle.',
    sensorId: 'S-108',
    location: 'Sector 2A — Soy Field',
    acknowledged: true,
  },
];

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>(INITIAL_ALERTS);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');

  const handleAcknowledge = (id: string) => {
    setAlerts(prev =>
      prev.map(a => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const handleDismiss = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.severity === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-display">System Alerts & Notifications</h1>
          <p className="text-slate-400 text-sm mt-1">Real-time IoT telemetry threshold breaches and blockchain execution events.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        {(['all', 'critical', 'warning', 'info'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              filter === tab
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            {tab} ({tab === 'all' ? alerts.length : alerts.filter(a => a.severity === tab).length})
          </button>
        ))}
      </div>

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-400 text-sm">No alerts found matching current filter.</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border transition-all ${
                alert.severity === 'critical'
                  ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/50'
                  : alert.severity === 'warning'
                  ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              } ${alert.acknowledged ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-400 animate-ping' :
                    alert.severity === 'warning' ? 'bg-amber-400' : 'bg-cyan-400'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{alert.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-400">
                        {alert.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-mono">
                      <span>Location: {alert.location}</span>
                      <span>·</span>
                      <span>Sensor: {alert.sensorId}</span>
                      <span>·</span>
                      <span>{alert.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    className="text-slate-500 hover:text-slate-300 text-xs p-1"
                    title="Dismiss alert"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
