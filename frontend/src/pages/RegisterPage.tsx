import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RegisterForm } from "../components/Forms/RegisterForm";
import { useAuth } from "../contexts/AuthContext";
import "./AuthPage.css";

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/farmer/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

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
        <RegisterForm />
        <p className="auth-tagline">
          Blockchain-verified agricultural provenance.
      </p>
    </div>
  </div>
  );
};
