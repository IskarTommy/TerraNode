import { EmptyState } from "../../components/Common/EmptyState";
import "../farmer/DashboardPlaceholder.css";

const LogisticsDashboard = () => {
  return (
    <div className="dashboard-placeholder-page">
      <header className="page-header">
        <h1 className="page-header-title">Logistics Dashboard</h1>
        <p className="page-header-subtitle">
          Track batches in transit, accept custody transfers.
    </p>
   </header>

      <EmptyState
        title="Logistics tools coming next phase"
        description="Batch transfer flows and custody tracking arrive in Phase 4."
        icon="📦"
      />
</div>
  );
};

export default LogisticsDashboard;
