import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import Footer from "./Footer";
import { useAuth } from "../../context/AuthContext";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile drawer upon route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-agri-500/30 border-t-agri-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-sky-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      <div
        className={`flex-1 transition-all duration-300 ${
          collapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        } ml-0`}
      >
        <TopNav
          collapsed={collapsed}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="min-h-[calc(100vh-140px)] px-3 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

