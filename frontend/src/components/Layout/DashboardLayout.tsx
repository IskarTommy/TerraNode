import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Atmosphere } from '../Atmosphere';
import './DashboardLayout.css';

export type UserRole = 'farmer' | 'logistics' | 'admin';

export interface User {
  address: string | null;
  name: string;
  role: UserRole;
  avatar?: string;
}

// ─── SVG Icon components ──────────────────────────────────────────────────────
function DashboardIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="3" width="7" height="7" rx="1.5" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="14" y="3" width="7" height="7" rx="1.5" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5" strokeWidth="1.6" strokeLinejoin="round"/>
      <rect x="14" y="14" width="7" height="7" rx="1.5" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}
function TelemetryIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M3 17l4-6 4 4 4-8 4 4" />
      <path strokeWidth="1.6" strokeLinecap="round" d="M3 21h18"/>
    </svg>
  );
}
function MintIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M12 5v14M5 12h14" />
    </svg>
  );
}
function YieldIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M12 2C8 2 4 6 4 11c0 3.5 2 6.5 5 8h6c3-1.5 5-4.5 5-8 0-5-4-9-8-9z" />
      <path strokeWidth="1.6" strokeLinecap="round" d="M12 11V20"/>
    </svg>
  );
}
function BatchIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M12 9v4m0 3.5h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  );
}
function SettingsIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M10.3 4.3A1.7 1.7 0 0113.4 4l.4 1.6a5 5 0 011.2.7l1.6-.3a1.7 1.7 0 011.6 2.7l-1 1.4a5 5 0 010 1.4l1 1.4a1.7 1.7 0 01-1.6 2.7l-1.6-.3a5 5 0 01-1.2.7l-.4 1.6a1.7 1.7 0 01-3.1 0l-.4-1.6a5 5 0 01-1.2-.7l-1.6.3A1.7 1.7 0 014.4 13l1-1.4a5 5 0 010-1.4l-1-1.4A1.7 1.7 0 016 7l1.6.3a5 5 0 011.2-.7l.4-1.6z" />
      <circle cx="12" cy="12" r="2.5" strokeWidth="1.6"/>
    </svg>
  );
}
function TransferIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  );
}
function ShipmentIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3m4 0h-7a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-7a2 2 0 00-2-2z" />
    </svg>
  );
}
function TrackingIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" strokeWidth="1.6"/>
      <path strokeWidth="1.6" strokeLinecap="round" d="M21 21l-4.35-4.35"/>
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" strokeWidth="1.6"/>
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function AuditIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M9 13h6M9 17h4" />
    </svg>
  );
}
function HealthIcon() {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
function BrandLogoIcon({ role }: { role: UserRole }) {
  if (role === 'farmer') {
    return (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          d="M12 2a10 10 0 00-7 17.3V22h14v-2.7A10 10 0 0012 2z" />
        <path strokeWidth="1.6" strokeLinecap="round" d="M12 7v15M9 10l3-3 3 3"/>
      </svg>
    );
  }
  if (role === 'logistics') {
    return (
      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="1" y="3" width="15" height="13" rx="1.5" strokeWidth="1.6"/>
        <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          d="M16 8h4l3 5v4h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" strokeWidth="1.6"/>
        <circle cx="18.5" cy="18.5" r="2.5" strokeWidth="1.6"/>
      </svg>
    );
  }
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5" />
    </svg>
  );
}
function LogoutIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
function WalletIcon() {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z" />
      <path strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        d="M16 3l-4-1-4 1v4h8V3z" />
      <circle cx="16" cy="14" r="1.5" fill="currentColor"/>
    </svg>
  );
}
function MenuIcon() {
  return (
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeWidth="1.8" strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16"/>
    </svg>
  );
}

// ─── Navigation items per role ────────────────────────────────────────────────
const NAV_ITEMS: Record<UserRole, Array<{ path: string; label: string; icon: React.ReactNode }>> = {
  farmer: [
    { path: '/farmer/dashboard',        label: 'Dashboard',     icon: <DashboardIcon /> },
    { path: '/farmer/telemetry',         label: 'Telemetry',     icon: <TelemetryIcon /> },
    { path: '/farmer/mint-batch',        label: 'Mint Batch',    icon: <MintIcon /> },
    { path: '/farmer/yield-prediction',  label: 'Yield Forecast',icon: <YieldIcon /> },
    { path: '/farmer/batches',           label: 'My Batches',    icon: <BatchIcon /> },
    { path: '/farmer/alerts',            label: 'Alerts',        icon: <AlertIcon /> },
    { path: '/farmer/settings',          label: 'Settings',      icon: <SettingsIcon /> },
  ],
  logistics: [
    { path: '/logistics/dashboard', label: 'Dashboard',       icon: <DashboardIcon /> },
    { path: '/logistics/transfer',  label: 'Transfer Custody',icon: <TransferIcon /> },
    { path: '/logistics/shipments', label: 'Shipments',       icon: <ShipmentIcon /> },
    { path: '/logistics/tracking',  label: 'Tracking',        icon: <TrackingIcon /> },
    { path: '/logistics/settings',  label: 'Settings',        icon: <SettingsIcon /> },
  ],
  admin: [
    { path: '/admin/dashboard',     label: 'Dashboard',    icon: <DashboardIcon /> },
    { path: '/admin/users',         label: 'Users',        icon: <UsersIcon /> },
    { path: '/admin/audit-logs',    label: 'Audit Logs',   icon: <AuditIcon /> },
    { path: '/admin/system-health', label: 'System Health',icon: <HealthIcon /> },
    { path: '/admin/settings',      label: 'Settings',     icon: <SettingsIcon /> },
  ],
};

const ROLE_LABELS: Record<UserRole, string> = {
  farmer:    'Farmer',
  logistics: 'Logistics',
  admin:     'Admin',
};

// ─── Component ────────────────────────────────────────────────────────────────
interface DashboardLayoutProps {
  user: User | null;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onLogout?: () => void;
  isConnecting: boolean;
  children: React.ReactNode;
}

export function DashboardLayout({
  user,
  onConnectWallet,
  onDisconnectWallet,
  onLogout,
  isConnecting,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role: UserRole = user?.role || 'farmer';

  useEffect(() => {
    document.documentElement.setAttribute('data-role', role);
  }, [role]);

  const closeNav = () => setSidebarOpen(false);

  return (
    <div className="dashboard-root" data-role={role}>
      <Atmosphere variant="subtle" particles={false} />

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' overlay-visible' : ''}`}
        onClick={closeNav}
        aria-hidden="true"
      />

      {/* ─── Sidebar ──────────────────────────────────────────────────── */}
      <aside className={`dashboard-sidebar${sidebarOpen ? ' sidebar-open' : ''}`} aria-label="Navigation">
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <BrandLogoIcon role={role} />
          </div>
          <div className="sidebar-brand-text">
            <div className="sidebar-brand-name">TerraNode</div>
            <span className="sidebar-brand-role">{ROLE_LABELS[role]}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" role="navigation" aria-label="Dashboard navigation">
          <div className="sidebar-nav-label">Navigation</div>
          {NAV_ITEMS[role].map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeNav}
              className={({ isActive }) =>
                `nav-link${isActive ? ' nav-link-active' : ''}`
              }
            >
              <span className="nav-link-icon">{item.icon}</span>
              <span className="nav-link-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer / User info */}
        <div className="sidebar-footer">
          {user ? (
            <div className="sidebar-user">
              <div className="sidebar-user-avatar">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-info">
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-address">
                  {user.address
                    ? `${user.address.slice(0, 6)}…${user.address.slice(-4)}`
                    : 'No wallet bound'}
                </div>
              </div>
              <button
                className="sidebar-logout-btn"
                onClick={onLogout}
                aria-label="Log out"
                title="Log out of TerraNode"
              >
                <LogoutIcon />
              </button>
            </div>
          ) : (
            <button
              className="sidebar-connect-btn"
              onClick={onConnectWallet}
              disabled={isConnecting}
            >
              <WalletIcon />
              {isConnecting ? 'Connecting…' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </aside>

      {/* ─── Main area ────────────────────────────────────────────────── */}
      <div className="dashboard-main">
        {/* Top bar — mobile only */}
        <header className="dashboard-topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          >
            <MenuIcon />
          </button>
          <span className="topbar-title">TerraNode</span>
          <div className="topbar-actions" />
        </header>

        {/* Page content */}
        <main className="dashboard-content">
          {import.meta.env.VITE_DEMO_MODE === 'true' && (
            <div
              role="status"
              className="mb-4 rounded-xl border-2 border-amber-400 bg-amber-400/15 px-4 py-3 text-center font-bold text-amber-300"
            >
              DEMO DATA MODE — synthetic records are enabled and must not be treated as real evidence.
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

DashboardLayout.displayName = 'DashboardLayout';
