import { Card } from '../../components/Common/Card';
import { Button } from '../../components/Common/Button';
import { cn } from '../../utils/cn';

const SYSTEM_METRICS = [
  { name: 'CPU Usage', value: 65, status: 'warning' as const },
  { name: 'Memory Usage', value: 78, status: 'error' as const },
  { name: 'Disk Space', value: 45, status: 'normal' as const },
  { name: 'Network Latency', value: 34, status: 'normal' as const },
];

export function SystemHealthPage() {
  return (
    <div className="space-y-6" data-role="admin">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-lg font-bold text-fg-primary">System Health</h1>
          <p className="text-body text-fg-muted mt-1">Monitor system performance and health</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {SYSTEM_METRICS.map((metric, index) => (
          <Card key={index} variant="glass" padding="md">
            <p className="text-body-xs text-fg-muted font-medium">{metric.name}</p>
            <p className="text-display-md font-bold text-fg-primary mt-1">{metric.value}%</p>
            <span className={cn(
              'inline-block px-2 py-0.5 rounded-full text-body-xs font-medium mt-1',
              metric.status === 'normal' && 'bg-emerald-500/10 text-emerald-500',
              metric.status === 'warning' && 'bg-amber-500/10 text-amber-500',
              metric.status === 'error' && 'bg-red-500/10 text-red-500'
            )}>
              {metric.status}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="glass" padding="md">
          <h3 className="text-body font-semibold text-fg-primary mb-4">Uptime</h3>
          <p className="text-display-md font-bold text-fg-primary">99.98%</p>
          <p className="text-body-xs text-fg-muted mt-1">Last 30 days</p>
        </Card>
        <Card variant="glass" padding="md">
          <h3 className="text-body font-semibold text-fg-primary mb-4">Active Connections</h3>
          <p className="text-display-md font-bold text-fg-primary">1,247</p>
          <p className="text-body-xs text-fg-muted mt-1">Current WebSocket connections</p>
        </Card>
      </div>
    </div>
  );
}
