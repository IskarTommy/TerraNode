import { EmptyState } from "../../components/Common/EmptyState";
import "./DashboardPlaceholder.css";

/**
 * Placeholder until Phase 3 builds out the actual FarmerDashboard with charts and stats.
 * Lighthouse the way to /farmer/telemetry and /farmer/mint so users aren't blocked.
 */
const FarmerDashboard = () => {
  return (
    <div className="dashboard-placeholder-page">
      <header className="page-header">
        <h1 className="page-header-title">Farmer Dashboard</h1>
        <p className="page-header-subtitle">
          Welcome to your workspace. Submit telemetry, view trends, and mint produce batches.
    </p>
   </header>

      <EmptyState
        title="Dashboard widgets coming next phase"
        description="Telemetry charts, yield prediction, and recent batches will be wired up here in Phase 3."
        icon="📊"
        action={
          <a href="/farmer/telemetry" className="btn btn--primary">
            Go to Telemetry
      </a>
        }
   />
</div>
  );
};

export default FarmerDashboard;
