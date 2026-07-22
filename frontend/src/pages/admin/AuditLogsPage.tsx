import { Card } from '../../components/Common/Card';

const MOCK_LOGS = [
  { id: '1', action: 'User login', user: 'farmer_john@example.com', timestamp: '2024-10-22T10:30:00Z', ip: '192.168.1.1' },
  { id: '2', action: 'Batch minted', user: 'farmer_jane@example.com', timestamp: '2024-10-22T09:15:00Z', ip: '192.168.1.2' },
  { id: '3', action: 'Transfer created', user: 'logistics_bob@example.com', timestamp: '2024-10-21T14:00:00Z', ip: '192.168.1.3' },
  { id: '4', action: 'Role changed', user: 'admin@example.com', timestamp: '2024-10-21T11:00:00Z', ip: '192.168.1.4' },
];

export function AuditLogsPage() {
  return (
    <div className="space-y-6" data-role="admin">
      <div>
        <h1 className="text-display-lg font-bold text-fg-primary">Audit Logs</h1>
        <p className="text-body text-fg-muted mt-1">System activity and audit trail</p>
      </div>

      <Card variant="glass" padding="md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-primary">
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">Action</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">User</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-body-xs font-semibold text-fg-muted uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-primary/50">
              {MOCK_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-bg-tertiary/50">
                  <td className="px-4 py-3 text-body-sm text-fg-primary">{log.action}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-secondary">{log.user}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-secondary">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3 text-body-sm text-fg-secondary">{log.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
