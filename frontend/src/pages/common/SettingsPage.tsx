import { useState } from 'react';
import { Button } from '../../components/Common';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/Common/Toast';

export function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [suiNodeUrl, setSuiNodeUrl] = useState('https://fullnode.testnet.sui.io:443');
  const [network, setNetwork] = useState<'testnet' | 'mainnet' | 'devnet'>('testnet');
  const [telemetrySyncRate, setTelemetrySyncRate] = useState('15');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Settings saved successfully', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight font-display">System & Workspace Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Configure SUI RPC nodes, telemetry polling frequency, and account security.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* User Profile Card */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-2">User Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                readOnly
                value={user?.full_name || 'TerraNode User'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                readOnly
                value={user?.email || 'user@terranode.io'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Assigned Role</label>
              <input
                type="text"
                readOnly
                value={user?.role?.toUpperCase() || 'FARMER'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-emerald-400 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Linked Sui Address</label>
              <input
                type="text"
                readOnly
                value={user?.sui_public_key || '0x7a892b10f84c90e3d2a1b5c6789e0123456789ab'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-cyan-400 font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Blockchain Node Config */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-2">SUI Blockchain Connection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Target Network</label>
              <select
                value={network}
                onChange={e => setNetwork(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="testnet">Sui Testnet (Recommended)</option>
                <option value="mainnet">Sui Mainnet</option>
                <option value="devnet">Sui Devnet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Telemetry Sync Frequency</label>
              <select
                value={telemetrySyncRate}
                onChange={e => setTelemetrySyncRate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
              >
                <option value="5">Every 5 Seconds (Real-time)</option>
                <option value="15">Every 15 Seconds (Normal)</option>
                <option value="60">Every 60 Seconds (Economy)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-400 mb-1">RPC Node Endpoint</label>
              <input
                type="text"
                value={suiNodeUrl}
                onChange={e => setSuiNodeUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Notifications & Toggles */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-200 border-b border-slate-800 pb-2">Alert Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-slate-800/40">
              <div>
                <span className="text-sm font-medium text-slate-200">Email Threshold Notifications</span>
                <p className="text-xs text-slate-400">Receive email alerts when soil moisture or ambient temperature breaches safety limits.</p>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={e => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer p-2 rounded hover:bg-slate-800/40">
              <div>
                <span className="text-sm font-medium text-slate-200">Browser Push Notifications</span>
                <p className="text-xs text-slate-400">Instant browser notifications for live batch minting status and custody transfers.</p>
              </div>
              <input
                type="checkbox"
                checked={pushAlerts}
                onChange={e => setPushAlerts(e.target.checked)}
                className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit" variant="primary" size="md">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
