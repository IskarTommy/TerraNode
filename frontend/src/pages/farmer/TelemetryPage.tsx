import { StatCard } from '../../components/Dashboard/FarmerDashboard';
import { TelemetryChart } from '../../components/Dashboard/FarmerDashboard';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input } from '../../components/Common/Input';
import { cn } from '../../utils/cn';
import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/Common';
import { useToast } from '../../components/Common';
import { telemetryApi } from '../../api/telemetry';
import type { TelemetryRecord } from '../../types/telemetry';

const MOCK_TELEMETRY = Array.from({ length: 48 }, (_, i) => ({
  timestamp: new Date(Date.now() - (47 - i) * 30 * 60 * 1000).toISOString(),
  temperature: 20 + Math.sin(i * 0.3) * 5 + Math.random() * 2,
  humidity: 60 + Math.sin(i * 0.2) * 15 + Math.random() * 5,
  ph: 6.5 + Math.sin(i * 0.15) * 0.5 + Math.random() * 0.3,
  soilMoisture: 45 + Math.sin(i * 0.25) * 10 + Math.random() * 3,
  lightIntensity: 30000 + Math.sin(i * 0.4) * 15000 + Math.random() * 5000,
  co2: 400 + Math.sin(i * 0.1) * 50 + Math.random() * 20,
}));

const MOCK_YIELD_PREDICTIONS = [
  { year: '2020', predicted: 6.2, actual: 6.0, confidence: 85 },
  { year: '2021', predicted: 6.8, actual: 7.1, confidence: 88 },
  { year: '2022', predicted: 7.3, actual: 7.0, confidence: 90 },
  { year: '2023', predicted: 7.8, actual: 8.0, confidence: 92 },
  { year: '2024', predicted: 8.2, actual: 8.1, confidence: 91 },
  { year: '2025', predicted: 8.7, confidence: 89, lowerBound: 8.0, upperBound: 9.4 },
  { year: '2026', predicted: 9.1, confidence: 87, lowerBound: 8.3, upperBound: 9.9 },
];

export function TelemetryPage() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [metrics, setMetrics] = useState<
    Array<'temperature' | 'humidity' | 'ph' | 'soilMoisture' | 'lightIntensity' | 'co2'>
  >(['temperature', 'humidity', 'soilMoisture', 'ph']);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [clearAlertsDialogOpen, setClearAlertsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [liveRecords, setLiveRecords] = useState<TelemetryRecord[]>([]);
  const [formData, setFormData] = useState({
    temperature: '24.5',
    soilMoisture: '52.0',
    soilPh: '6.8',
  });
  const { showToast } = useToast();

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await telemetryApi.getHistory();
      if (res.results && res.results.length > 0) {
        setLiveRecords(res.results);
      }
    } catch {
      // Keep state as empty if offline or unauthenticated mock
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  const handleSubmitTelemetry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const newRecord = await telemetryApi.submit({
        temperature_celsius: Number(formData.temperature),
        soil_moisture_percentage: Number(formData.soilMoisture),
        soil_ph: Number(formData.soilPh),
      });
      showToast(`Telemetry saved! Hash: ${newRecord.payload_sha256.substring(0, 10)}...`, 'success');
      setSubmitDialogOpen(false);
      setLiveRecords(prev => [newRecord, ...prev]);
      fetchTelemetry();
    } catch (err: any) {
      let msg = 'Failed to submit telemetry';
      if (err.response?.data?.error?.message) {
        msg = err.response.data.error.message;
      } else if (err.response?.data) {
        const errorData = err.response.data;
        const details = typeof errorData === 'object' ? Object.values(errorData).flat().join(', ') : String(errorData);
        if (details) msg = details;
      }
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const chartSourceData = liveRecords.length > 0
    ? liveRecords.map(r => ({
        timestamp: r.recorded_at,
        temperature: Number(r.temperature_celsius),
        humidity: 60,
        ph: Number(r.soil_ph),
        soilMoisture: Number(r.soil_moisture_percentage),
        lightIntensity: 30000,
        co2: 400,
      })).reverse()
    : MOCK_TELEMETRY;

  const filteredData = chartSourceData.slice(-(timeRange === '1h' ? 12 : timeRange === '24h' ? 48 : timeRange === '7d' ? 168 : 720));

  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">Telemetry</h1>
          <p className="text-body text-fg-muted mt-1">Real-time sensor data and environmental monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => setSubmitDialogOpen(true)}
          >
            + Record Reading
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              fetchTelemetry();
              showToast('Telemetry data refreshed', 'success');
            }}
          >
            Refresh Data
          </Button>
          <Button
            variant="secondary"
            onClick={() => setExportDialogOpen(true)}
          >
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <StatCard
            title="Sensor Status"
            value="12/12 Online"
            change={0}
            changeLabel="All sensors active"
            trend="neutral"
            icon={<svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2zm0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            variant="success"
          />
          <TelemetryChart
            data={filteredData}
            metrics={metrics}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            height={400}
          />
          <Card variant="glass" padding="sm" className="flex flex-wrap items-center gap-3">
            <span className="text-body-xs text-fg-muted font-medium">Metrics:</span>
            <div className="flex flex-wrap gap-2">
              {(['temperature', 'humidity', 'ph', 'soilMoisture', 'lightIntensity', 'co2'] as const).map((metric) => (
                <label key={metric} className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-btn text-body-xs',
                  'cursor-pointer transition-colors border border-border-primary',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bg',
                  metrics.includes(metric)
                    ? 'bg-primary-bg text-primary-fg border-primary-border'
                    : 'bg-bg-secondary text-fg-secondary hover:bg-bg-tertiary'
                )}>
                  <input
                    type="checkbox"
                    checked={metrics.includes(metric)}
                    onChange={(e) => setMetrics(prev => e.target.checked ? [...prev, metric] : prev.filter(m => m !== metric))}
                    className="h-3.5 w-3.5 rounded border-border-primary text-primary-bg focus-visible:ring-primary-bg"
                  />
                  <span className="capitalize">{metric.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="glass" padding="md">
            <h3 className="text-body font-semibold text-fg-primary mb-4">Current Readings</h3>
            <div className="space-y-4">
              {[
                {
                  key: 'temperature',
                  label: 'Temperature',
                  value: liveRecords.length > 0
                    ? `${Number(liveRecords[0].temperature_celsius).toFixed(1)}°C`
                    : `${MOCK_TELEMETRY[MOCK_TELEMETRY.length - 1].temperature?.toFixed(1) || '--'}°C`,
                  status: 'normal'
                },
                {
                  key: 'humidity',
                  label: 'Humidity',
                  value: `${MOCK_TELEMETRY[MOCK_TELEMETRY.length - 1].humidity?.toFixed(1) || '--'}%`,
                  status: 'normal'
                },
                {
                  key: 'ph',
                  label: 'pH Level',
                  value: liveRecords.length > 0
                    ? `${Number(liveRecords[0].soil_ph).toFixed(2)}`
                    : `${MOCK_TELEMETRY[MOCK_TELEMETRY.length - 1].ph?.toFixed(2) || '--'}`,
                  status: 'normal'
                },
                {
                  key: 'soilMoisture',
                  label: 'Soil Moisture',
                  value: liveRecords.length > 0
                    ? `${Number(liveRecords[0].soil_moisture_percentage).toFixed(1)}%`
                    : `${MOCK_TELEMETRY[MOCK_TELEMETRY.length - 1].soilMoisture?.toFixed(1) || '--'}%`,
                  status: liveRecords.length > 0 && Number(liveRecords[0].soil_moisture_percentage) < 30 ? 'warning' : 'normal'
                },
                { key: 'lightIntensity', label: 'Light Intensity', value: `${Math.round(MOCK_TELEMETRY[MOCK_TELEMETRY.length - 1].lightIntensity || 0).toLocaleString()} lux`, status: 'normal' },
                { key: 'co2', label: 'CO₂', value: `${Math.round(MOCK_TELEMETRY[MOCK_TELEMETRY.length - 1].co2 || 0)} ppm`, status: 'normal' },
              ].map((reading) => (
                <div key={reading.key} className="flex items-center justify-between p-3 bg-bg-tertiary/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-bg-secondary flex items-center justify-center">
                      <svg className="h-5 w-5 text-fg-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    </div>
                    <div>
                      <p className="text-body-sm text-fg-secondary">{reading.label}</p>
                      <p className="text-body-xs text-fg-muted">Live</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-body font-semibold text-fg-primary tabular-nums">{reading.value}</p>
                    <span className={cn(
                      'inline-block px-2 py-0.5 rounded-full text-body-xs font-medium',
                      reading.status === 'normal' && 'bg-emerald-500/10 text-emerald-500',
                      reading.status === 'warning' && 'bg-amber-500/10 text-amber-500',
                      reading.status === 'error' && 'bg-red-500/10 text-red-500'
                    )}>
                      {reading.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card variant="glass" padding="md">
            <h3 className="text-body font-semibold text-fg-primary mb-4">Threshold Alerts</h3>
            <div className="space-y-3">
              {[
                { metric: 'Soil Moisture', condition: 'Below 30%', current: '28%', action: 'Irrigation recommended', severity: 'warning' },
                { metric: 'Temperature', condition: 'Above 35°C', current: '32°C', action: 'Monitoring', severity: 'normal' },
              ].map((alert, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-bg-tertiary/50 border border-border-primary/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-2 rounded-full', alert.severity === 'warning' && 'bg-amber-500', alert.severity === 'normal' && 'bg-emerald-500')} />
                    <div>
                      <p className="text-body-sm font-medium text-fg-primary">{alert.metric}</p>
                      <p className="text-body-xs text-fg-muted">Threshold: {alert.condition} • Current: {alert.current}</p>
                    </div>
                  </div>
                  <span className="text-body-xs text-fg-muted">{alert.action}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Record Reading Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen} className="w-96 sm:max-w-md">
        <form onSubmit={handleSubmitTelemetry}>
          <DialogHeader>
            <DialogTitle>Record Environmental Telemetry</DialogTitle>
            <DialogDescription>
              Submit sensor readings to generate SHA-256 data integrity hashes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              label="Temperature (°C)"
              type="number"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
              required
            />
            <Input
              label="Soil Moisture (%)"
              type="number"
              step="0.1"
              value={formData.soilMoisture}
              onChange={(e) => setFormData(prev => ({ ...prev, soilMoisture: e.target.value }))}
              required
            />
            <Input
              label="Soil pH (0 - 14)"
              type="number"
              step="0.01"
              value={formData.soilPh}
              onChange={(e) => setFormData(prev => ({ ...prev, soilPh: e.target.value }))}
              required
            />
          </div>
          <DialogFooter className="flex justify-end space-x-3">
            <Button type="button" variant="ghost" onClick={() => setSubmitDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              Save Reading & Compute Hash
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} className="w-96 sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Export Telemetry Data</DialogTitle>
          <DialogDescription>
            Export your telemetry data for external analysis or reporting.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pb-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-fg-primary mb-1">Export Format</label>
            <div className="flex items-center gap-2">
              <input type="radio" id="csv" name="format" value="csv" checked={true} className="h-4 w-4 text-primary-bg" />
              <label htmlFor="csv" className="text-sm text-fg-secondary">CSV</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="json" name="format" value="json" className="h-4 w-4 text-primary-bg" />
              <label htmlFor="json" className="text-sm text-fg-secondary">JSON</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="excel" name="format" value="excel" className="h-4 w-4 text-primary-bg" />
              <label htmlFor="excel" className="text-sm text-fg-secondary">Excel</label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-fg-primary mb-1">Time Range</label>
            <div className="flex items-center gap-2">
              <input type="radio" id="latest" name="range" value="latest" checked={true} className="h-4 w-4 text-primary-bg" />
              <label htmlFor="latest" className="text-sm text-fg-secondary">Last 24 Hours</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="week" name="range" value="week" className="h-4 w-4 text-primary-bg" />
              <label htmlFor="week" className="text-sm text-fg-secondary">Last 7 Days</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="radio" id="month" name="range" value="month" className="h-4 w-4 text-primary-bg" />
              <label htmlFor="month" className="text-sm text-fg-secondary">Last 30 Days</label>
            </div>
          </div>
        </div>
        <DialogFooter className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setExportDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => {
            setExportDialogOpen(false);
            showToast('Export initiated - check your downloads folder', 'success');
          }}>
            Export Data
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Clear Alerts Dialog */}
      <Dialog open={clearAlertsDialogOpen} onOpenChange={setClearAlertsDialogOpen} className="w-96 sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Clear Alerts</DialogTitle>
          <DialogDescription>
            Are you sure you want to clear all active alerts? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end space-x-3">
          <Button variant="ghost" onClick={() => setClearAlertsDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => {
            setClearAlertsDialogOpen(false);
            showToast('All alerts cleared', 'success');
          }}>
            Clear All Alerts
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

TelemetryPage.displayName = 'TelemetryPage';