import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import "./DashboardLayout.css";

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="dashboard">
      <Sidebar />
      <div className="dashboard-shell">
        <TopBar />
        <main className="dashboard-content">{children}</main>
    </div>
  </div>
  );
};
