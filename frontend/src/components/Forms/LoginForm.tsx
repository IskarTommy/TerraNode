import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Common/Toast";
import "./LoginForm.css";

export const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const user = await login(email.trim(), password);
      showToast(`Welcome back, ${user.full_name.split(" ")[0]}!`, "success");
      const target =
        user.role === "FARMER"
          ? "/farmer/dashboard"
          : user.role === "LOGISTICS"
            ? "/logistics/dashboard"
            : "/admin/dashboard";
      navigate(target, { replace: true });
    } catch (err: any) {
      const apiMessage =
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        "Invalid email or password.";
      showToast(apiMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-wrapper">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-form-title">Sign in</h1>
        <p className="auth-form-subtitle">
          Welcome back to TerraNode. Enter your credentials to access your dashboard.
        </p>

        <div className="form-group">
          <label htmlFor="login-email" className="form-label">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            placeholder="you@farm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password" className="form-label">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            className="form-input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={isLoading}
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>

        <p className="auth-form-footer">
          Don't have an account?{" "}
          <Link to="/register" className="auth-link">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
};
