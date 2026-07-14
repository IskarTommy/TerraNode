import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./components/Common/Toast";
import { RoleGuard, AuthGuard } from "./guards/RoleGuard";
import { DashboardLayout } from "./components/Layout/DashboardLayout";
import { Role } from "./utils/constants";

// Auth pages
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

// Farmer pages
import FarmerDashboard from "./pages/farmer/FarmerDashboard";

// Logistics pages
import LogisticsDashboard from "./pages/logistics/LogisticsDashboard";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes — authenticated users are redirected to their dashboard */}
            <Route
              path="/login"
              element={
                <AuthGuard>
                  <LoginPage />
               </AuthGuard>
              }
            />
            <Route
              path="/register"
              element={
                <AuthGuard>
                  <RegisterPage />
               </AuthGuard>
              }
            />

            {/* Farmer routes */}
            <Route
              path="/farmer/*"
              element={
                <RoleGuard allowedRoles={[Role.FARMER]}>
                  <DashboardLayout>
                    <Routes>
                      <Route path="dashboard" element={<FarmerDashboard />} />
                      <Route
                        path="telemetry"
                        element={<FarmerDashboard />}
                      />
                      <Route path="mint" element={<FarmerDashboard />} />
                      <Route
                        path="*"
                        element={<Navigate to="dashboard" replace />}
                      />
                   </Routes>
                 </DashboardLayout>
               </RoleGuard>
              }
            />

            {/* Logistics routes */}
            <Route
              path="/logistics/*"
              element={
                <RoleGuard allowedRoles={[Role.LOGISTICS]}>
                  <DashboardLayout>
                    <Routes>
                      <Route path="dashboard" element={<LogisticsDashboard />} />
                      <Route path="transfer" element={<LogisticsDashboard />} />
                      <Route
                        path="*"
                        element={<Navigate to="dashboard" replace />}
                      />
                   </Routes>
                 </DashboardLayout>
               </RoleGuard>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/*"
              element={
                <RoleGuard allowedRoles={[Role.ADMIN]}>
                  <DashboardLayout>
                    <Routes>
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="users" element={<AdminDashboard />} />
                      <Route path="audit" element={<AdminDashboard />} />
                      <Route
                        path="*"
                        element={<Navigate to="dashboard" replace />}
                      />
                   </Routes>
                 </DashboardLayout>
               </RoleGuard>
              }
            />

            {/* Root + catch-all */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
         </Routes>
       </BrowserRouter>
     </AuthProvider>
   </ToastProvider>
  );
}

export default App;
