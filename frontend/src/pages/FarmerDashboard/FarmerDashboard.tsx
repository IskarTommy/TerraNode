import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wheat } from 'lucide-react';
import { TelemetryChart, YieldPredictionChart } from '../../components/Dashboard/FarmerDashboard';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { cn } from '../../utils/cn';

export interface TelemetryDataPoint {
  timestamp: string;
  temperature?: number;
  humidity?: number;
  ph?: number;
  soilMoisture?: number;
  lightIntensity?: number;
  co2?: number;
}

export interface YieldPredictionDataPoint {
  year: string;
  predicted: number;
  actual?: number;
  lowerBound?: number;
  upperBound?: number;
  confidence?: number;
}

export interface BatchSummary {
  id: string;
  cropType: string;
  variety: string;
  plantedDate: string;
  estimatedHarvest: string;
  status: 'growing' | 'harvested' | 'minted' | 'shipped';
  yieldEstimate?: number;
  qualityScore?: number;
}

export interface FarmerDashboardData {
  stats: {
    totalBatches: number;
    totalYield: number;
    activeSensors: number;
    mintedBatches: number;
  };
  telemetry: TelemetryDataPoint[];
  yieldPredictions: YieldPredictionDataPoint[];
  recentBatches: BatchSummary[];
}

const MOCK_TELEMETRY: TelemetryDataPoint[] = Array.from({ length: 48 }, (_, i) => ({
  timestamp: new Date(Date.now() - (47 - i) * 30 * 60 * 1000).toISOString(),
  temperature: 20 + Math.sin(i * 0.3) * 5 + Math.random() * 2,
  humidity: 60 + Math.sin(i * 0.2) * 15 + Math.random() * 5,
  ph: 6.5 + Math.sin(i * 0.15) * 0.5 + Math.random() * 0.3,
  soilMoisture: 45 + Math.sin(i * 0.25) * 10 + Math.random() * 3,
  lightIntensity: 30000 + Math.sin(i * 0.4) * 15000 + Math.random() * 5000,
  co2: 400 + Math.sin(i * 0.1) * 50 + Math.random() * 20,
}));

const MOCK_YIELD_PREDICTIONS: YieldPredictionDataPoint[] = [
  { year: '2020', predicted: 6.2, actual: 6.0, confidence: 85 },
  { year: '2021', predicted: 6.8, actual: 7.1, confidence: 88 },
  { year: '2022', predicted: 7.3, actual: 7.0, confidence: 90 },
  { year: '2023', predicted: 7.8, actual: 8.0, confidence: 92 },
  { year: '2024', predicted: 8.2, actual: 8.1, confidence: 91 },
  { year: '2025', predicted: 8.7, confidence: 89, lowerBound: 8.0, upperBound: 9.4 },
  { year: '2026', predicted: 9.1, confidence: 87, lowerBound: 8.3, upperBound: 9.9 },
];

const MOCK_BATCHES: BatchSummary[] = [
  {
    id: 'BATCH-2024-001',
    cropType: 'Wheat',
    variety: 'Hard Red Winter',
    plantedDate: '2024-10-15',
    estimatedHarvest: '2025-06-20',
    status: 'growing',
    yieldEstimate: 8.5,
    qualityScore: 92,
  },
  {
    id: 'BATCH-2024-002',
    cropType: 'Corn',
    variety: 'Sweet Corn Hybrid',
    plantedDate: '2024-05-01',
    estimatedHarvest: '2024-09-15',
    status: 'harvested',
    yieldEstimate: 12.3,
    qualityScore: 95,
  },
  {
    id: 'BATCH-2024-003',
    cropType: 'Soybean',
    variety: 'High Protein',
    plantedDate: '2024-06-10',
    estimatedHarvest: '2024-10-25',
    status: 'minted',
    yieldEstimate: 4.2,
    qualityScore: 88,
  },
  {
    id: 'BATCH-2024-004',
    cropType: 'Barley',
    variety: 'Malting Barley',
    plantedDate: '2024-03-20',
    estimatedHarvest: '2024-07-15',
    status: 'shipped',
    yieldEstimate: 6.8,
    qualityScore: 90,
  },
];

const STATUS_CONFIG = {
  growing: { label: 'Growing', color: 'text-emerald-500', bg: 'bg-emerald-500/10', icon: '🌱' },
  harvested: { label: 'Harvested', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: '🌾' },
  minted: { label: 'Minted', color: 'text-cyan-500', bg: 'bg-cyan-500/10', icon: '⛓️' },
  shipped: { label: 'Shipped', color: 'text-violet-500', bg: 'bg-violet-500/10', icon: '🚛' },
} as const;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: BatchSummary['status'] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-body-xs font-medium', config.color, config.bg)}>
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  );
}

function QuickActionButton({ icon, label, href, variant = 'outline' }: {
  icon: React.ReactNode;
  label: string;
  href: string;
  variant?: 'primary' | 'outline' | 'ghost';
}) {
  return (
    <Link to={href} className="block group">
      <Button
        variant={variant}
        fullWidth
        className="!h-auto min-h-[104px] !p-4 !flex-col !items-start !justify-between gap-3 text-left !whitespace-normal"
      >
        <div className="w-10 h-10 rounded-xl bg-bg-tertiary/60 border border-border-primary/50 flex items-center justify-center text-fg-secondary group-hover:text-primary group-hover:border-primary/40 transition-colors shrink-0">
          {icon}
        </div>
        <span className="text-body-sm font-semibold text-fg-primary leading-snug break-words">
          {label}
        </span>
      </Button>
    </Link>
  );
}

export function FarmerDashboard() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [telemetryMetrics, setTelemetryMetrics] = useState<
    Array<'temperature' | 'humidity' | 'ph' | 'soilMoisture' | 'lightIntensity' | 'co2'>
  >(['temperature', 'humidity', 'soilMoisture', 'ph']);
  const [data, setData] = useState<FarmerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData({
        stats: {
          totalBatches: 24,
          totalYield: 156.8,
          activeSensors: 12,
          mintedBatches: 8,
        },
        telemetry: MOCK_TELEMETRY,
        yieldPredictions: MOCK_YIELD_PREDICTIONS,
        recentBatches: MOCK_BATCHES,
      });
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const filteredTelemetry = data?.telemetry.slice(-(
    timeRange === '1h' ? 12 : timeRange === '24h' ? 48 : timeRange === '7d' ? 168 : 720
  ));

  return (
    <div className="space-y-6 animate-fade-in" data-role="farmer">
      {/* Live Blockchain & Mesh Status Banner */}
      <div className="p-3.5 px-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            SUI TESTNET LIVE
          </span>
          <span className="text-slate-400 hidden sm:inline">Block <strong className="text-slate-200">#14,832,561</strong></span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden md:inline">Latency <strong className="text-emerald-400">182ms</strong></span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="text-slate-400">Sensors Online <strong className="text-cyan-400">12/12</strong></span>
        </div>
        <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Auto-Sync: 15s</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-gradient-emerald">
            Farmer Workspace
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time IoT telemetry, AI yield prediction models, and Sui NFT batch provenance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/farmer/telemetry">
            <Button variant="outline" size="md">
              Live Sensor Stream
            </Button>
          </Link>
          <Link to="/farmer/mint-batch">
            <Button variant="primary" size="md">
              + Mint Harvest Batch
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" role="region" aria-label="Key metrics">
        {/* Total Batches */}
        <div className="bg-[#0B1120] border border-slate-800 p-6 rounded-2xl flex justify-between items-start shadow-lg">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Total Batches</span>
            <span className="text-4xl font-bold text-white mt-2">{loading ? '—' : data?.stats.totalBatches ?? '—'}</span>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-medium w-fit">
              <span>↑ 12.5%</span>
              <span className="text-slate-400 font-normal">vs last month</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
          </div>
        </div>

        {/* Total Yield */}
        <div className="bg-[#0B1120] border border-slate-800 p-6 rounded-2xl flex justify-between items-start shadow-lg">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Total Yield</span>
            <span className="text-4xl font-bold text-white mt-2">{loading ? '—' : `${(data?.stats.totalYield ?? 0).toFixed(1)} t/ha`}</span>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md text-xs font-medium w-fit">
              <span>↑ 8.2%</span>
              <span className="text-slate-400 font-normal">vs last season</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
        </div>

        {/* Active Sensors */}
        <div className="bg-[#0B1120] border border-slate-800 p-6 rounded-2xl flex justify-between items-start shadow-lg">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Active Sensors</span>
            <span className="text-4xl font-bold text-white mt-2">{loading ? '—' : data?.stats.activeSensors ?? '—'}</span>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-slate-500/10 text-slate-400 px-2.5 py-1 rounded-md text-xs font-medium w-fit">
              <span>— 0%</span>
              <span className="text-slate-500 font-normal">all online</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
        </div>

        {/* Minted Batches */}
        <div className="bg-[#0B1120] border border-slate-800 p-6 rounded-2xl flex justify-between items-start shadow-lg">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Minted Batches</span>
            <span className="text-4xl font-bold text-white mt-2">{loading ? '—' : data?.stats.mintedBatches ?? '—'}</span>
            <div className="mt-3 inline-flex items-center gap-1.5 bg-red-500/10 text-red-400 px-2.5 py-1 rounded-md text-xs font-medium w-fit">
              <span>↓ 5.3%</span>
              <span className="text-slate-400 font-normal">pending verification</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Telemetry & Yield */}
        <div className="lg:col-span-2 space-y-6">
          {/* Telemetry Chart */}
          <TelemetryChart
            data={filteredTelemetry || []}
            metrics={telemetryMetrics}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            loading={loading}
            height={360}
            showLegend
          />

          {/* Telemetry Metric Selector */}
          <Card variant="glass" padding="sm" className="flex flex-wrap items-center gap-3">
            <span className="text-body-xs text-fg-muted font-medium">Metrics:</span>
            <div className="flex flex-wrap gap-2">
              {(['temperature', 'humidity', 'ph', 'soilMoisture', 'lightIntensity', 'co2'] as const).map((metric) => (
                <label
                  key={metric}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-body-xs',
                    'cursor-pointer transition-colors border border-border-primary',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bg',
                    telemetryMetrics.includes(metric)
                      ? 'bg-primary-bg text-primary-fg border-primary-border'
                      : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={telemetryMetrics.includes(metric)}
                    onChange={(e) =>
                      setTelemetryMetrics((prev) =>
                        e.target.checked ? [...prev, metric] : prev.filter((m) => m !== metric)
                      )
                    }
                    className="h-3.5 w-3.5 rounded border-border-primary text-primary-bg focus-visible:ring-primary-bg"
                  />
                  <span className="capitalize">{metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Yield Prediction */}
          <YieldPredictionChart
            data={data?.yieldPredictions || []}
            loading={loading}
            height={360}
            showConfidenceInterval
          />
        </div>

        {/* Right Column - Quick Actions & Recent Batches */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card variant="glass" padding="md">
            <h3 className="text-body font-semibold text-fg-primary mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <QuickActionButton
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>}
                label="Record Telemetry"
                href="/farmer/telemetry"
                variant="outline"
              />
              <QuickActionButton
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
                label="Mint Batch"
                href="/farmer/mint-batch"
                variant="primary"
              />
              <QuickActionButton
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                label="Yield Forecast"
                href="/farmer/yield-prediction"
                variant="outline"
              />
              <QuickActionButton
                icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                label="Sensor Alerts"
                href="/farmer/alerts"
                variant="outline"
              />
            </div>
          </Card>

          {/* Recent Batches */}
          <Card variant="glass" padding="none" className="overflow-hidden">
            <div className="p-4 border-b border-border-primary flex items-center justify-between">
              <h3 className="text-body font-semibold text-fg-primary">Recent Batches</h3>
              <Link to="/farmer/batches" className="text-body-xs text-primary hover:underline font-medium">
                View all
              </Link>
            </div>
            {/* Desktop table header */}
            <div className="hidden md:grid grid-cols-[1.2fr_1.2fr_1.8fr_1.2fr_auto] gap-4 px-4 py-2.5 bg-slate-900/60 border-b border-border-primary text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Batch ID</span>
              <span>Crop & Variety</span>
              <span>Planted / Harvest</span>
              <span>Yield & Quality</span>
              <span>Status</span>
            </div>
            <div className="divide-y divide-border-primary/60">
              {data?.recentBatches.map((batch) => (
                <Link
                  key={batch.id}
                  to={`/farmer/batches/${batch.id}`}
                  className="p-4 block hover:bg-bg-tertiary/50 transition-colors group"
                >
                  <div className="grid grid-cols-[1.2fr_1.2fr_1.8fr_1.2fr_auto] gap-4 items-center">
                    {/* Column 1: Batch ID */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Wheat className="h-4 w-4 text-amber-400" strokeWidth={1.8} />
                      </div>
                      <span className="font-mono text-body-sm font-bold text-fg-primary tracking-tight truncate group-hover:text-primary transition-colors">
                        {batch.id}
                      </span>
                    </div>
                    {/* Column 2: Crop & Variety */}
                    <div className="min-w-0">
                      <span className="text-sm text-slate-300 truncate block">{batch.cropType}</span>
                      <span className="text-xs text-slate-400 truncate block">{batch.variety}</span>
                    </div>
                    {/* Column 3: Dates */}
                    <div className="text-xs text-slate-400 font-mono flex flex-wrap gap-2">
                      <span>{formatDate(batch.plantedDate)}</span>
                      <span className="text-slate-500">&rarr;</span>
                      <span>{formatDate(batch.estimatedHarvest)}</span>
                    </div>
                    {/* Column 4: Yield & Quality */}
                    <div className="text-xs flex flex-wrap gap-2">
                      {batch.yieldEstimate && (
                        <span className="font-mono text-emerald-400 font-medium">
                          {batch.yieldEstimate.toFixed(1)} t/ha
                        </span>
                      )}
                      {batch.qualityScore !== undefined && (
                        <span className="font-mono text-amber-400 font-medium">
                          Q:{batch.qualityScore}/100
                        </span>
                      )}
                    </div>
                    {/* Column 5: Status */}
                    <div className="shrink-0 flex justify-end">
                      <StatusBadge status={batch.status} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

FarmerDashboard.displayName = 'FarmerDashboard';