import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LoginForm } from "../components/Forms/LoginForm";
import { useAuth } from "../contexts/AuthContext";
import "./AuthPage.css";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const target =
        user.role === "FARMER"
          ? "/farmer/dashboard"
          : user.role === "LOGISTICS"
            ? "/logistics/dashboard"
            : "/admin/dashboard";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden="true" />
      <div className="auth-page-content">
        <div className="auth-brand">
          <span className="auth-brand-mark" aria-hidden="true">
            🌱
         </span>
          <span className="auth-brand-name">TerraNode</span>
      </div>
        <LoginForm />
        <p className="auth-tagline">
          Blockchain-verified agricultural provenance.
      </p>
    </div>
  </div>
  );
};
