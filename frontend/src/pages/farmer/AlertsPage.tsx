import { Card } from '../../components/Common/Card';


export function AlertsPage() {
  return (
    <div className="space-y-6" data-role="farmer">
      <div>
        <h1 className="text-display-lg font-bold">Alerts</h1>
        <p className="text-fg-muted">Sensor threshold alerts will appear here when an alert service is configured.</p>
      </div>
      <Card variant="glass" padding="lg">
        <p className="font-semibold">No alert records are available.</p>
        <p className="text-body-sm text-fg-muted mt-2">
          TerraNode does not currently expose a persisted alert API, so the interface does not invent sensor,
          weather, battery, or blockchain alerts.
        </p>
      </Card>
    </div>
  );
}
