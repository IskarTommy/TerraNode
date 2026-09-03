import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { WalletProvider } from "./contexts/WalletContext";
import { ToastProvider } from "./components/Common/Toast";
import { RoleGuard } from "./guards/RoleGuard";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import { Role } from "./utils/constants";
import { useAuth } from "./contexts/AuthContext";
import { useWallet } from "./contexts/WalletContext";

import { FarmerDashboard } from "./pages/FarmerDashboard";
import { TelemetryPage } from "./pages/farmer/TelemetryPage";
import { MintBatchPage } from "./pages/farmer/MintBatchPage";
import { YieldPredictionPage } from "./pages/farmer/YieldPredictionPage";
import { BatchesPage } from "./pages/farmer/BatchesPage";
import { LogisticsDashboard } from "./pages/logistics/LogisticsDashboard";
import { TransferPage } from "./pages/logistics/TransferPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UsersPage } from "./pages/admin/UsersPage";
import { AuditLogsPage } from "./pages/admin/AuditLogsPage";
import { SystemHealthPage } from "./pages/admin/SystemHealthPage";
import { SettingsPage } from "./pages/common/SettingsPage";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

function AppRoutes() {
  const { user: apiUser, logout, updateUserWallet } = useAuth();
  const { connect: connectWallet, disconnect: disconnectWallet, connecting, address: walletAddress } = useWallet();

  useEffect(() => {
    if (apiUser && walletAddress && apiUser.sui_public_key !== walletAddress) {
      updateUserWallet(walletAddress);
    }
  }, [apiUser, walletAddress, updateUserWallet]);

  const user = apiUser ? {
    address: walletAddress || apiUser.sui_public_key || "0x0000000000000000000000000000000000000000",
    name: apiUser.full_name || apiUser.email?.split("@")[0] || "User",
    role: apiUser.role?.toLowerCase() as "farmer" | "logistics" | "admin" || "farmer",
    avatar: undefined,
  } : null;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Farmer routes */}
        <Route path="/farmer/*" element={
          <RoleGuard allowedRoles={[Role.FARMER]}>
            <DashboardLayout user={user} onConnectWallet={connectWallet} onDisconnectWallet={disconnectWallet} onLogout={logout} isConnecting={connecting}>
              <Routes>
                <Route path="dashboard" element={<FarmerDashboard />} />
                <Route path="telemetry" element={<TelemetryPage />} />
                <Route path="mint-batch" element={<MintBatchPage />} />
                <Route path="yield-prediction" element={<YieldPredictionPage />} />
                <Route path="yield-forecast" element={<YieldPredictionPage />} />
                <Route path="batches" element={<BatchesPage />} />
                <Route path="batches/:id" element={<BatchesPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </RoleGuard>
        } />

        {/* Logistics routes */}
        <Route path="/logistics/*" element={
          <RoleGuard allowedRoles={[Role.LOGISTICS]}>
            <DashboardLayout user={user} onConnectWallet={connectWallet} onDisconnectWallet={disconnectWallet} onLogout={logout} isConnecting={connecting}>
              <Routes>
                <Route path="dashboard" element={<LogisticsDashboard />} />
                <Route path="transfer" element={<TransferPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </RoleGuard>
        } />

        {/* Admin routes */}
        <Route path="/admin/*" element={
          <RoleGuard allowedRoles={[Role.ADMIN]}>
            <DashboardLayout user={user} onConnectWallet={connectWallet} onDisconnectWallet={disconnectWallet} onLogout={logout} isConnecting={connecting}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="system-health" element={<SystemHealthPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </DashboardLayout>
          </RoleGuard>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function App() {
 return (
 <ToastProvider>
 <AuthProvider>
 <WalletProvider>
 <AppRoutes />
 </WalletProvider>
 </AuthProvider>
 </ToastProvider>
 );
}

export default App;
