import { useAuditLogs } from '../../hooks/useDashboardQueries';
import { Card } from '../../components/Common/Card';

export function AuditLogsPage() {
  const { data, isLoading, isError } = useAuditLogs();
  return <div className="space-y-6" data-role="admin">
    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Security record</p><h1 className="text-3xl font-bold text-fg-primary">Audit logs</h1><p className="mt-1 text-sm text-fg-muted">Chronological authentication, integrity, batch, and administrator events.</p></div>
    <Card variant="glass" padding="md">{isLoading && <p className="py-10 text-center text-fg-muted">Loading audit trail…</p>}{isError && <p className="py-10 text-center text-red-400">The audit trail could not be loaded.</p>}{!isLoading && !isError && <div className="overflow-x-auto"><table className="w-full min-w-[720px]"><thead><tr className="border-b border-border-primary text-left text-xs uppercase text-fg-muted"><th className="p-3">Event</th><th className="p-3">Description</th><th className="p-3">User</th><th className="p-3">Time</th><th className="p-3">IP</th></tr></thead><tbody className="divide-y divide-border-primary/50">{(data?.results ?? []).map((event) => <tr key={event.id} className="align-top hover:bg-bg-tertiary/40"><td className="p-3 text-xs font-semibold text-cyan-400">{event.action.replaceAll('_', ' ')}</td><td className="max-w-xl p-3 text-sm text-fg-primary">{event.description}</td><td className="p-3 text-sm text-fg-secondary">{event.user || 'System'}</td><td className="p-3 text-xs text-fg-muted">{new Date(event.timestamp).toLocaleString()}</td><td className="p-3 font-mono text-xs text-fg-muted">{event.ip_address || '—'}</td></tr>)}</tbody></table>{data?.results.length === 0 && <p className="py-12 text-center text-fg-muted">No audit events have been recorded yet.</p>}</div>}</Card>
  </div>;
}
