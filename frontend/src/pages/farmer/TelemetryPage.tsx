import { useCallback, useEffect, useRef, useState } from 'react';

import { telemetryApi } from '../../api/telemetry';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input } from '../../components/Common/Input';
import type { TelemetryRecord } from '../../types/telemetry';


function display(value: number | null, suffix: string, digits = 1) {
  return value === null ? '—' : value.toFixed(digits) + suffix;
}

function CopyUUID({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copy = () => {
    void navigator.clipboard.writeText(id);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy telemetry UUID (use when minting a batch)"
      className="ml-1 text-fg-muted hover:text-primary transition-colors text-body-xs underline underline-offset-2"
    >
      {copied ? '✓ copied' : 'copy UUID'}
    </button>
  );
}

export function TelemetryPage() {
  const [records, setRecords] = useState<TelemetryRecord[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [temperature, setTemperature] = useState('');
  const [moisture, setMoisture] = useState('');
  const [ph, setPh] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState('loading');
    try {
      setRecords((await telemetryApi.getHistory({ page_size: 100 })).results);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await telemetryApi.submit({
        ...(temperature ? { temperature_celsius: Number(temperature) } : {}),
        ...(moisture ? { soil_moisture_percentage: Number(moisture) } : {}),
        ...(ph ? { soil_ph: Number(ph) } : {}),
      });
      setMessage('Encrypted telemetry stored and integrity hash verified.');
      setFormOpen(false);
      setTemperature('');
      setMoisture('');
      setPh('');
      await load();
    } catch {
      setMessage('Submission failed. Check that at least one measurement is filled in and the encryption key is set.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasEnough = records.length >= 5;
  const latest = records[0];

  return (
    <div className="space-y-6" data-role="farmer">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg font-bold">Telemetry</h1>
          <p className="text-fg-muted">Your field sensor readings, encrypted and hash-verified on entry.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>Refresh</Button>
          <Button variant="primary" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancel' : 'Record observation'}
          </Button>
        </div>
      </div>

      {/* Status message */}
      {message && (
        <Card variant="glass" padding="md">
          <p role="status" className={message.includes('failed') ? 'text-red-300' : 'text-emerald-300'}>
            {message}
          </p>
        </Card>
      )}

      {/* Record form */}
      {formOpen && (
        <Card variant="glass" padding="md">
          <p className="text-body-sm text-fg-muted mb-4">
            Fill in what you have — all three fields are optional individually, but at least one must have a value.
            Each record is encrypted with AES-256-GCM before being stored.
          </p>
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Temperature (°C)"
              type="number"
              step="0.01"
              min="-10"
              max="60"
              placeholder="e.g. 27.5"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              helperText="Air or soil temperature in degrees Celsius"
            />
            <Input
              label="Soil moisture (%)"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="e.g. 55.0"
              value={moisture}
              onChange={(e) => setMoisture(e.target.value)}
              helperText="Volumetric water content as a percentage"
            />
            <Input
              label="Soil pH"
              type="number"
              step="0.01"
              min="0"
              max="14"
              placeholder="e.g. 6.5"
              value={ph}
              onChange={(e) => setPh(e.target.value)}
              helperText="pH scale 0–14; 7 is neutral"
            />
            <div className="sm:col-span-3">
              <Button type="submit" variant="primary" loading={submitting}>Encrypt and save</Button>
            </div>
          </form>
        </Card>
      )}

      {state === 'loading' && <Card variant="glass" padding="lg">Loading telemetry…</Card>}
      {state === 'error' && (
        <Card variant="glass" padding="lg">
          <p role="alert" className="text-red-300">Could not load telemetry.</p>
          <Button variant="outline" onClick={load}>Retry</Button>
        </Card>
      )}

      {/* Empty state with explanation */}
      {state === 'ready' && records.length === 0 && (
        <Card variant="glass" padding="lg">
          <p className="font-semibold text-fg-primary mb-2">No observations recorded yet</p>
          <p className="text-body-sm text-fg-muted">
            Click <strong className="text-fg-primary">"Record observation"</strong> above to add your first field
            reading. Each entry stores your temperature, soil moisture, and pH encrypted at rest — no plaintext
            values are ever written to the database.
          </p>
          <p className="text-body-sm text-fg-muted mt-3">
            You need at least <strong className="text-fg-primary">5 observations</strong> with both temperature and
            soil moisture before the WMA Yield Estimate can run.
          </p>
        </Card>
      )}

      {/* Latest readings summary */}
      {state === 'ready' && latest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" padding="md">
            <p className="text-fg-muted text-body-sm">Latest temperature</p>
            <p className="text-display-md font-bold">{display(latest.temperature_celsius, ' °C')}</p>
          </Card>
          <Card variant="glass" padding="md">
            <p className="text-fg-muted text-body-sm">Latest soil moisture</p>
            <p className="text-display-md font-bold">{display(latest.soil_moisture_percentage, ' %')}</p>
          </Card>
          <Card variant="glass" padding="md">
            <p className="text-fg-muted text-body-sm">Latest soil pH</p>
            <p className="text-display-md font-bold">{display(latest.soil_ph, '', 2)}</p>
          </Card>
        </div>
      )}

      {/* Yield progress hint */}
      {state === 'ready' && records.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <div className="flex-1 bg-bg-tertiary rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(100, (records.length / 5) * 100)}%` }}
            />
          </div>
          <p className="text-body-xs text-fg-muted whitespace-nowrap">
            {hasEnough
              ? '✓ Enough data for WMA yield estimate'
              : `${records.length} / 5 observations for yield estimate`}
          </p>
        </div>
      )}

      {/* Record list */}
      {state === 'ready' && records.map((record) => (
        <Card key={record.id} variant="glass" padding="md">
          <div className="flex flex-col lg:flex-row justify-between gap-2">
            <div>
              <p className="text-body-sm font-medium">{new Date(record.recorded_at).toLocaleString()}</p>
              <p className="text-body-sm text-fg-muted">
                Temp: {display(record.temperature_celsius, ' °C')} ·
                Moisture: {display(record.soil_moisture_percentage, ' %')} ·
                pH: {display(record.soil_ph, '', 2)}
              </p>
              <p className="font-mono text-body-xs text-fg-muted mt-1 break-all">
                SHA-256: {record.payload_sha256}
              </p>
            </div>
            <div className="lg:text-right flex-shrink-0">
              <p className={record.source_type === 'SYNTHETIC' ? 'text-amber-300 font-bold text-body-sm' : 'text-fg-muted text-body-sm'}>
                {record.source_type || 'Unknown'}
              </p>
              <p className="font-mono text-body-xs text-fg-muted mt-0.5">
                ID: {record.id.slice(0, 8)}…
                <CopyUUID id={record.id} />
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
