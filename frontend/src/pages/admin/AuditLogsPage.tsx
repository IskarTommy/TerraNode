import { useCallback, useEffect, useState } from 'react';

import { auditApi } from '../../api/audit';
import { Button } from '../../components/Common/Button';
import { Card } from '../../components/Common/Card';
import type { AuditLogEntry } from '../../types/analytics';


export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const load = useCallback(async () => {
    setState('loading');
    try {
      setLogs((await auditApi.getList({ page_size: 100 })).results);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="space-y-6" data-role="admin">
      <div className="flex justify-between"><div><h1 className="text-display-lg font-bold">Audit Events</h1><p className="text-fg-muted">Persisted security, integrity, mint, and custody evidence.</p></div><Button variant="outline" onClick={load}>Refresh</Button></div>
      {state === 'loading' && <Card variant="glass" padding="lg">Loading audit events…</Card>}
      {state === 'error' && <Card variant="glass" padding="lg"><p role="alert" className="text-red-300">Could not load audit events.</p></Card>}
      {state === 'ready' && logs.length === 0 && <Card variant="glass" padding="lg">No audit events found.</Card>}
      {state === 'ready' && logs.map((log) => <Card key={log.id} variant="glass" padding="md"><div className="flex flex-col lg:flex-row justify-between gap-2"><div><p className="font-semibold">{log.event_type}</p><p>{log.description}</p><p className="text-body-xs text-fg-muted">{log.user_email || log.wallet_address || 'System event'}</p></div><p className="text-body-xs text-fg-muted">{new Date(log.timestamp).toLocaleString()}</p></div></Card>)}
    </div>
  );
}
