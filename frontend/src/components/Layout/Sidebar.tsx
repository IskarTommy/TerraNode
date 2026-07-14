import { NavLink } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Role } from "../../utils/constants";
import "./Sidebar.css";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const navByRole: Record<Role, NavItem[]> = {
  [Role.FARMER]: [
    { to: "/farmer/dashboard", label: "Overview", icon: "📊" },
    { to: "/farmer/telemetry", label: "Telemetry", icon: "🌡️" },
    { to: "/farmer/mint", label: "Mint Batch", icon: "🌾" },
  ],
  [Role.LOGISTICS]: [
    { to: "/logistics/dashboard", label: "Overview", icon: "📦" },
    { to: "/logistics/transfer", label: "Transfer Custody", icon: "🚚" },
  ],
  [Role.ADMIN]: [
    { to: "/admin/dashboard", label: "Overview", icon: "🛡️" },
    { to: "/admin/users", label: "Users", icon: "👥" },
    { to: "/admin/audit", label: "Audit", icon: "✅" },
  ],
};

const roleAccent: Record<Role, string> = {
  [Role.FARMER]: "var(--color-primary)",
  [Role.LOGISTICS]: "var(--color-secondary)",
  [Role.ADMIN]: "var(--color-accent)",
};

const roleLabel: Record<Role, string> = {
  [Role.FARMER]: "Farmer Workspace",
  [Role.LOGISTICS]: "Logistics Console",
  [Role.ADMIN]: "Admin Console",
};

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const items = navByRole[user.role] ?? [];
  const accent = roleAccent[user.role];
  const title = roleLabel[user.role];

  return (
    <aside className="sidebar" style={{ borderRightColor: `${accent}33` }}>
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon" aria-hidden="true">
          🌱
      </span>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">TerraNode</span>
          <span className="sidebar-brand-tag">{title}</span>
      </div>
   </div>

      <nav className="sidebar-nav">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link--active" : ""}`
            }
          >
            <span className="sidebar-link-icon" aria-hidden="true">
              {item.icon}
          </span>
            <span className="sidebar-link-label">{item.label}</span>
      </NavLink>
        ))}
   </nav>
 </aside>
  );
};
