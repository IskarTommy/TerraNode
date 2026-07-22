import { type FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../Common/Toast";
import { Role } from "../../utils/constants";
import type { User } from "../../api/auth";
import "./LoginForm.css";

type RegisterRole = Exclude<User["role"], "ADMIN">;

export const RegisterForm = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    role: Role.FARMER as RegisterRole,
  });
  const [isLoading, setIsLoading] = useState(false);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!form.email || !form.password || !form.full_name) {
      showToast("Please fill in every field.", "warning");
      return;
    }
    if (form.password.length < 8) {
      showToast("Password must be at least 8 characters.", "warning");
      return;
    }
    if (form.password !== form.confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role: form.role,
      });
      showToast("Account created. Welcome to TerraNode!", "success");
      navigate("/farmer/dashboard", { replace: true });
    } catch (err: any) {
      const details = err?.response?.data?.error?.details;
      let message = "Registration failed.";
      if (details?.email) message = Array.isArray(details.email) ? details.email[0] : details.email;
      else if (details?.password)
        message = Array.isArray(details.password) ? details.password[0] : details.password;
      else if (err?.response?.data?.error?.message)
        message = err.response.data.error.message;
      showToast(message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-form-wrapper">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <h1 className="auth-form-title">Create your account</h1>
        <p className="auth-form-subtitle">
          Join TerraNode — choose your role to get started.
        </p>

        <div className="form-group">
          <label htmlFor="register-name" className="form-label">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            className="form-input"
            placeholder="Jane Farmer"
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            required
            autoComplete="name"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-email" className="form-label">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            className="form-input"
            placeholder="you@farm.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-password" className="form-label">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            className="form-input"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="register-confirm" className="form-label">
            Confirm password
          </label>
          <input
            id="register-confirm"
            type="password"
            className="form-input"
            placeholder="Repeat your password"
            value={form.confirmPassword}
            onChange={(e) => update("confirmPassword", e.target.value)}
            required
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>

        <div className="form-group">
          <span className="form-label">Role</span>
          <div className="role-selector">
            <label
              className={`role-option ${
                form.role === Role.FARMER ? "role-option--active" : ""
              }`}
            >
              <input
                type="radio"
                name="role"
                value={Role.FARMER}
                checked={form.role === Role.FARMER}
                onChange={() => update("role", Role.FARMER)}
                disabled={isLoading}
              />
              <span className="role-option-title">Farmer</span>
              <span className="role-option-desc">
                Submit telemetry, mint batches, track provenance.
              </span>
            </label>

            <label
              className={`role-option ${
                form.role === Role.LOGISTICS ? "role-option--active" : ""
              }`}
            >
              <input
                type="radio"
                name="role"
                value={Role.LOGISTICS}
                checked={form.role === Role.LOGISTICS}
                onChange={() => update("role", Role.LOGISTICS)}
                disabled={isLoading}
              />
              <span className="role-option-title">Logistics</span>
              <span className="role-option-desc">
                Transfer and manage batch custody in transit.
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn--primary btn--full"
          disabled={isLoading}
        >
          {isLoading ? "Creating account…" : "Create account"}
        </button>

        <p className="auth-form-footer">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
};
