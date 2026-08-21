import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Wheat, 
  Layers, 
  Sprout, 
  Radio, 
  Gem, 
  PlusCircle, 
  LineChart, 
  BellRing, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Truck,
  ArrowRight
} from 'lucide-react';
import { TelemetryChart, YieldPredictionChart } from '../../components/Dashboard/FarmerDashboard';
import { Button } from '../../components/Common/Button';
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
  { id: 'BATCH-2024-001', cropType: 'Wheat', variety: 'Hard Red Winter', plantedDate: '2024-10-15', estimatedHarvest: '2025-06-20', status: 'growing', yieldEstimate: 8.5, qualityScore: 92 },
  { id: 'BATCH-2024-002', cropType: 'Corn', variety: 'Sweet Corn Hybrid', plantedDate: '2024-05-01', estimatedHarvest: '2024-09-15', status: 'harvested', yieldEstimate: 12.3, qualityScore: 95 },
  { id: 'BATCH-2024-003', cropType: 'Soybean', variety: 'High Protein', plantedDate: '2024-06-10', estimatedHarvest: '2024-10-25', status: 'minted', yieldEstimate: 4.2, qualityScore: 88 },
  { id: 'BATCH-2024-004', cropType: 'Barley', variety: 'Malting Barley', plantedDate: '2024-03-20', estimatedHarvest: '2024-07-15', status: 'shipped', yieldEstimate: 6.8, qualityScore: 90 },
];

const STATUS_CONFIG = {
  growing: { label: 'Growing', color: 'text-emerald-400', dot: 'bg-emerald-400' },
  harvested: { label: 'Harvested', color: 'text-amber-400', dot: 'bg-amber-400' },
  minted: { label: 'Minted', color: 'text-cyan-400', dot: 'bg-cyan-400' },
  shipped: { label: 'Shipped', color: 'text-violet-400', dot: 'bg-violet-400' },
} as const;

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }: { status: BatchSummary['status'] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

// --- High-End Reusable Stat Card (Centered Numbers) ---
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  unit?: string;
  trend: { type: 'up' | 'down'; value: string };
  trendLabel: string;
  loading: boolean;
}

function StatCard({ icon: Icon, label, value, unit, trend, trendLabel, loading }: StatCardProps) {
  return (
    <div className="bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-6 transition-colors hover:border-slate-700 group">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {label}
        </span>
        <div className="w-8 h-8 rounded-lg bg-slate-800/50 flex items-center justify-center text-slate-400 group-hover:text-slate-200 transition-colors">
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
      </div>
      
      {/* Centered numbers and trend */}
      <div className="flex flex-col gap-2 items-center justify-center text-center">
        <div className="flex items-baseline gap-1.5 justify-center">
          {loading ? (
            <div className="w-24 h-8 bg-slate-800/60 rounded animate-pulse" />
          ) : (
            <>
              <span className="text-3xl font-semibold text-white tracking-tight tabular-nums">
                {value}
              </span>
              {unit && <span className="text-xs font-medium text-slate-500">{unit}</span>}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs justify-center">
          <span className={cn(
            "inline-flex items-center gap-1 font-medium",
            trend.type === 'up' ? "text-emerald-400" : "text-red-400"
          )}>
            {trend.type === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend.value}
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-500">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}

// --- High-End Reusable Quick Action ---
interface QuickActionCardProps {
  icon: React.ElementType;
  label: string;
  href: string;
  variant: 'primary' | 'outline';
}

function QuickActionCard({ icon: Icon, label, href, variant }: QuickActionCardProps) {
  const isPrimary = variant === 'primary';
  return (
    <Link
      to={href}
      className={cn(
        "group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 hover:-translate-y-0.5",
        isPrimary
          ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15"
          : "bg-[#0b0f17] border-slate-800/80 hover:border-slate-700"
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
          isPrimary ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800/50 text-slate-400 group-hover:text-slate-200"
        )}>
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </div>
        <span className={cn(
          "text-sm font-medium",
          isPrimary ? "text-emerald-100" : "text-slate-200"
        )}>
          {label}
        </span>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
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
        stats: { totalBatches: 24, totalYield: 156.8, activeSensors: 12, mintedBatches: 8 },
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
    <div className="space-y-8 max-w-[1400px] mx-auto" data-role="farmer">
      {/* Minimalist Status Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 text-xs font-mono text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-slate-300 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            SUI TESTNET LIVE
          </span>
          <span className="hidden sm:inline">Block #14,832,561</span>
          <span className="hidden md:inline">Latency 182ms</span>
          <span className="hidden md:inline text-cyan-400">Sensors 12/12</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>Auto-Sync: 15s</span>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Farmer Workspace
          </h1>
          <p className="text-slate-500 text-sm mt-1.5 font-light">
            Real-time IoT telemetry, AI yield models, and Sui NFT batch provenance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/farmer/telemetry">
            <Button variant="outline" size="md">Live Sensor Stream</Button>
          </Link>
          <Link to="/farmer/mint-batch">
            <Button variant="primary" size="md">+ Mint Harvest Batch</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" role="region" aria-label="Key metrics">
        <StatCard icon={Layers} label="Total Batches" value={data?.stats.totalBatches ?? 0} trend={{ type: 'up', value: '12.5%' }} trendLabel="vs last month" loading={loading} />
        <StatCard icon={Sprout} label="Total Yield" value={(data?.stats.totalYield ?? 0).toFixed(1)} unit="t/ha" trend={{ type: 'up', value: '8.2%' }} trendLabel="vs last season" loading={loading} />
        <StatCard icon={Radio} label="Active Sensors" value={data?.stats.activeSensors ?? 0} trend={{ type: 'up', value: '100%' }} trendLabel="all online" loading={loading} />
        <StatCard icon={Gem} label="Minted Batches" value={data?.stats.mintedBatches ?? 0} trend={{ type: 'down', value: '5.3%' }} trendLabel="pending verif." loading={loading} />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Telemetry Chart Card */}
          <div className="bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
               <div>
                 <h3 className="text-sm font-medium text-slate-200">Sensor Telemetry</h3>
                 <p className="text-xs text-slate-500 mt-1">Real-time IoT data streams</p>
               </div>
            </div>
            <TelemetryChart
              data={filteredTelemetry || []}
              metrics={telemetryMetrics}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              loading={loading}
              height={320}
              showLegend
            />
          </div>

          {/* Yield Prediction Card */}
          <div className="bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-6">
             <div className="mb-6">
               <h3 className="text-sm font-medium text-slate-200">Yield Prediction</h3>
               <p className="text-xs text-slate-500 mt-1">AI model forecast vs actual historical yield</p>
             </div>
             <YieldPredictionChart
               data={data?.yieldPredictions || []}
               loading={loading}
               height={320}
               showConfidenceInterval
             />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-medium text-slate-200">Quick Actions</h3>
              <span className="text-xs text-slate-600 font-medium">Shortcuts</span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <QuickActionCard icon={PlusCircle} label="Mint Batch" href="/farmer/mint-batch" variant="primary" />
              <QuickActionCard icon={Activity} label="Record Telemetry" href="/farmer/telemetry" variant="outline" />
              <QuickActionCard icon={LineChart} label="Yield Forecast" href="/farmer/yield-prediction" variant="outline" />
              <QuickActionCard icon={BellRing} label="Sensor Alerts" href="/farmer/alerts" variant="outline" />
            </div>
          </div>

          {/* Recent Batches Table */}
          <div className="bg-[#0b0f17] border border-slate-800/80 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
              <h3 className="text-sm font-medium text-slate-200">Recent Batches</h3>
              <Link to="/farmer/batches" className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            
            <div className="divide-y divide-slate-800/60">
              {data?.recentBatches.map((batch) => (
                <Link
                  key={batch.id}
                  to={`/farmer/batches/${batch.id}`}
                  className="block p-6 hover:bg-slate-800/30 transition-colors group"
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                       <span className="font-mono text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                         {batch.id}
                       </span>
                    </div>
                    <StatusBadge status={batch.status} />
                  </div>
                  
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-300 mb-1">{batch.cropType}</p>
                      <p className="text-xs text-slate-500">{batch.variety}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 mb-1">
                        {formatDate(batch.plantedDate)} → {formatDate(batch.estimatedHarvest)}
                      </p>
                      <div className="flex items-center gap-3 justify-end text-xs font-medium">
                        {batch.yieldEstimate && (
                          <span className="text-emerald-400">{batch.yieldEstimate.toFixed(1)} t/ha</span>
                        )}
                        {batch.qualityScore !== undefined && (
                          <span className="text-amber-400">Q: {batch.qualityScore}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

FarmerDashboard.displayName = 'FarmerDashboard';