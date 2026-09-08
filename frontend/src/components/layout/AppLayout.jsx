import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import Footer from "./Footer";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 72 : 260;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-agri-500/30 border-t-agri-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-sky-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <TopNav sidebarWidth={sidebarWidth} />
      <main
        style={{ marginLeft: sidebarWidth }}
        className="min-h-[calc(100vh-140px)] px-4 py-6 md:px-8"
      >
        <Outlet />
      </main>
      <Footer sidebarWidth={sidebarWidth} />
    </div>
  );
}
