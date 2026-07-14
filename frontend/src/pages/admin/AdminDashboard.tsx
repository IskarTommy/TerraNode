import { EmptyState } from "../../components/Common/EmptyState";
import "../farmer/DashboardPlaceholder.css";

const AdminDashboard = () => {
  return (
    <div className="dashboard-placeholder-page">
      <header className="page-header">
        <h1 className="page-header-title">Admin Dashboard</h1>
        <p className="page-header-subtitle">
          System overview, user management, integrity audits.
    </p>
   </header>

      <EmptyState
        title="Admin tools coming next phase"
        description="User management, health checks, and integrity verification arrive in Phase 4."
        icon="🛡️"
      />
</div>
  );
};

export default AdminDashboard;
