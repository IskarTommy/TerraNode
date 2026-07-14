import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Role } from "../utils/constants";

interface RoleGuardProps {
  allowedRoles: Role[];
  children: ReactNode;
}

export const RoleGuard = ({ allowedRoles, children }: RoleGuardProps) => {
  const { isAuthenticated, user, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized) {
    return null; // AuthContext hydrates synchronously on this codebase; this branch is rarely hit
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user || !allowedRoles.includes(user.role as Role)) {
    // Authenticated but not allowed → send to the dashboard for their actual role.
    const target =
      user?.role === Role.FARMER
        ? "/farmer/dashboard"
        : user?.role === Role.LOGISTICS
          ? "/logistics/dashboard"
          : user?.role === Role.ADMIN
            ? "/admin/dashboard"
            : "/login";
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};

interface AuthGuardProps {
  children: ReactNode;
}

/** Sends authenticated users away from /login and /register to their dashboard. */
export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isAuthenticated, user } = useAuth();
  const target = user
    ? user.role === Role.FARMER
      ? "/farmer/dashboard"
      : user.role === Role.LOGISTICS
        ? "/logistics/dashboard"
        : "/admin/dashboard"
    : null;

  if (isAuthenticated && target) {
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
};
