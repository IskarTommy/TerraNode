import { useCallback, useEffect, useState } from 'react';

import { telemetryApi } from '../../api/telemetry';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import { Input } from '../../components/Common/Input';
import type { TelemetryRecord } from '../../types/telemetry';


function display(value: number | null, suffix: string, digits = 1) {
  return value === null ? 'Not observed' : value.toFixed(digits) + suffix;
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
      setMessage('Telemetry submission failed. Check the measurements and encryption configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  const latest = records[0];
  return (
    <div className="space-y-6" data-role="farmer">
      <div className="flex items-center justify-between gap-4">
        <div><h1 className="text-display-lg font-bold">Telemetry</h1><p className="text-fg-muted">Encrypted genuine observations and their provenance.</p></div>
        <div className="flex gap-2"><Button variant="outline" onClick={load}>Refresh</Button><Button variant="primary" onClick={() => setFormOpen((value) => !value)}>Record observation</Button></div>
      </div>
      {message && <Card variant="glass" padding="md"><p role="status">{message}</p></Card>}
      {formOpen && (
        <Card variant="glass" padding="md">
          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Temperature °C" type="number" step="0.01" value={temperature} onChange={(event) => setTemperature(event.target.value)} />
            <Input label="Soil moisture %" type="number" step="0.01" value={moisture} onChange={(event) => setMoisture(event.target.value)} />
            <Input label="Soil pH" type="number" step="0.01" value={ph} onChange={(event) => setPh(event.target.value)} />
            <Button type="submit" variant="primary" loading={submitting}>Encrypt and save</Button>
          </form>
        </Card>
      )}
      {state === 'loading' && <Card variant="glass" padding="lg">Loading telemetry…</Card>}
      {state === 'error' && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">Could not load telemetry.</p><Button variant="outline" onClick={load}>Retry</Button></Card>}
      {state === 'ready' && !latest && <Card variant="glass" padding="lg">No genuine observations are stored. No chart samples were substituted.</Card>}
      {state === 'ready' && latest && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass" padding="md"><p className="text-fg-muted">Temperature</p><p className="text-display-md">{display(latest.temperature_celsius, ' °C')}</p></Card>
          <Card variant="glass" padding="md"><p className="text-fg-muted">Soil moisture</p><p className="text-display-md">{display(latest.soil_moisture_percentage, ' %')}</p></Card>
          <Card variant="glass" padding="md"><p className="text-fg-muted">Soil pH</p><p className="text-display-md">{display(latest.soil_ph, '', 2)}</p></Card>
        </div>
      )}
      {state === 'ready' && records.map((record) => (
        <Card key={record.id} variant="glass" padding="md">
          <div className="flex flex-col lg:flex-row justify-between gap-2">
            <div><p>{new Date(record.recorded_at).toLocaleString()}</p><p className="text-body-sm text-fg-muted">Temperature: {display(record.temperature_celsius, ' °C')} · Moisture: {display(record.soil_moisture_percentage, ' %')} · pH: {display(record.soil_ph, '', 2)}</p></div>
            <div className="lg:text-right"><p className={record.source_type === 'SYNTHETIC' ? 'text-amber-300 font-bold' : 'text-fg-muted'}>{record.source_type || 'Unknown provenance'}</p><p className="font-mono text-body-xs break-all">{record.payload_sha256}</p></div>
          </div>
        </Card>
      ))}
    </div>
  );
}
