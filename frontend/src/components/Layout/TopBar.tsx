import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import "./TopBar.css";

export const TopBar = () => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  if (!user) return null;

  const initials = user.full_name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  return (
    <header className="topbar">
      <div className="topbar-spacer" />

      <div className="topbar-user">
        <button
          className="topbar-user-trigger"
          onClick={() => setMenuOpen((prev) => !prev)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <span className="topbar-avatar" aria-hidden="true">
            {initials}
        </span>
          <span className="topbar-user-meta">
            <span className="topbar-user-name">{user.full_name}</span>
            <span className="topbar-user-role">{user.role}</span>
        </span>
          <span className="topbar-caret" aria-hidden="true">
            ▾
        </span>
      </button>

        {menuOpen && (
          <div className="topbar-menu" role="menu">
            <div className="topbar-menu-info">
              <span className="topbar-menu-info-name">{user.full_name}</span>
              <span className="topbar-menu-info-email">{user.email}</span>
          </div>
            <button
              className="topbar-menu-item"
              role="menuitem"
              onClick={handleLogout}
            >
              <span className="topbar-menu-item-icon" aria-hidden="true">
                ⏻
            </span>
              Sign out
          </button>
        </div>
        )}
   </div>
 </header>
  );
};
