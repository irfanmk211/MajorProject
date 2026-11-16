import { useState, useEffect } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { Bell, X, ArrowRight } from "lucide-react";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import Footer from "./Footer";
import { useAuth } from "../../context/AuthContext";
import { registerPushNotifications } from "../../services/pushNotifications";

export default function AppLayout() {
  const { user, loading, profileComplete } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pushToast, setPushToast] = useState(null);
  const navigate = useNavigate();
  const sidebarWidth = collapsed ? 72 : 260;

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      user &&
      !user.isGuest
    ) {
      registerPushNotifications().catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    const handlePushMessage = (event) => {
      const payload = event.detail || {};
      const notification = payload.notification || {};
      const data = payload.data || {};
      setPushToast({
        title: notification.title || "AgroSmart Alert",
        body: notification.body || "New update received from your farm.",
        data,
      });
    };

    window.addEventListener("agrosmart:push-message", handlePushMessage);
    return () => window.removeEventListener("agrosmart:push-message", handlePushMessage);
  }, []);

  useEffect(() => {
    if (!pushToast) return;
    const timer = setTimeout(() => setPushToast(null), 8000);
    return () => clearTimeout(timer);
  }, [pushToast]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-agri-500/30 border-t-agri-500" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;
  if (!profileComplete && !user.isGuest) return <Navigate to="/profile-setup" replace />;

  return (
    <div className="min-h-screen overflow-x-clip bg-gradient-to-br from-slate-50 via-emerald-50/30 to-sky-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {pushToast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm rounded-2xl border border-emerald-500/30 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-emerald-500/20 dark:bg-slate-900/95 animate-in slide-in-from-top-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Bell size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-slate-800 dark:text-white">{pushToast.title}</h4>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{pushToast.body}</p>
              <button
                type="button"
                onClick={() => {
                  setPushToast(null);
                  navigate("/irrigation");
                }}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                View irrigation <ArrowRight size={13} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setPushToast(null)}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />
      <TopNav
        sidebarWidth={sidebarWidth}
        collapsed={collapsed}
        onMenuClick={() => setMobileMenuOpen(true)}
      />
      <main
        className={`min-h-[calc(100vh-140px)] min-w-0 px-4 py-5 sm:px-6 md:px-8 md:py-6 ${collapsed ? "md:ml-[72px]" : "md:ml-[260px]"}`}
      >
        <Outlet />
      </main>
      <Footer collapsed={collapsed} />
    </div>
  );
}
