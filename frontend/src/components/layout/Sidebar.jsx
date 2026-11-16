import { NavLink, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Sprout,
  ScanLine,
  Droplets,
  CloudSun,
  BarChart3,
  Tractor,
  Radio,
  User,
  Info,
  Mail,
  LogOut,
  Leaf,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/languageState";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/crop", icon: Sprout, label: "Crop Recommendation" },
  { to: "/disease", icon: ScanLine, label: "Disease Detection" },
  { to: "/soil", icon: BarChart3, label: "Soil Monitoring" },
  { to: "/irrigation", icon: Droplets, label: "Smart Irrigation" },
  { to: "/weather", icon: CloudSun, label: "Weather" },
  { to: "/farms", icon: Tractor, label: "Farms & Fields" },
  { to: "/devices", icon: Radio, label: "Devices" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/about", icon: Info, label: "About" },
  { to: "/contact", icon: Mail, label: "Contact" },
];

export default function Sidebar({ collapsed, setCollapsed, mobileMenuOpen, setMobileMenuOpen }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Could not sign out:", error);
      window.alert("Sign out failed. Please try again.");
    }
  };

  const renderNavItems = (showLabels, onNavigate) => navItems.map(({ to, icon: Icon, label }) => (
    <NavLink
      key={to}
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
          isActive
            ? "bg-gradient-to-r from-agri-500/20 to-sky-500/20 text-agri-400"
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon size={20} className="shrink-0" />
      {showLabels && <span>{t(label)}</span>}
    </NavLink>
  ));

  const renderBrand = (showName) => (
    <div className="flex items-center gap-3 border-b border-white/10 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-agri-500 to-sky-500">
        <Leaf className="text-white" size={22} />
      </div>
      {showName && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <h1 className="text-lg font-bold text-white">AgroSmart</h1>
          <p className="text-xs text-slate-400">{t("AI Farming Platform")}</p>
        </motion.div>
      )}
    </div>
  );

  const renderLogout = (showLabel) => (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 transition-all hover:bg-red-500/10"
    >
      <LogOut size={20} />
      {showLabel && <span>{t("Logout")}</span>}
    </button>
  );

  return (
    <>
    <motion.aside
      animate={{ width: collapsed ? 72 : 260 }}
      className="fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/10 bg-slate-900/95 backdrop-blur-xl md:flex"
    >
      {renderBrand(!collapsed)}

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {renderNavItems(!collapsed)}
      </nav>

      <div className="border-t border-white/10 p-3">
        {renderLogout(!collapsed)}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mt-2 flex w-full items-center justify-center rounded-xl py-2 text-slate-500 hover:bg-white/5"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </motion.aside>
    {mobileMenuOpen && (
      <div className="fixed inset-0 z-50 md:hidden">
        <button
          type="button"
          aria-label={t("Close navigation")}
          className="absolute inset-0 h-full w-full bg-slate-950/60"
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 pr-3">
            {renderBrand(true)}
            <button
              type="button"
              aria-label={t("Close navigation")}
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
          <nav aria-label={t("Main navigation")} className="flex-1 space-y-1 overflow-y-auto p-3">
            {renderNavItems(true, () => setMobileMenuOpen(false))}
          </nav>
          <div className="border-t border-white/10 p-3">
            {renderLogout(true)}
          </div>
        </aside>
      </div>
    )}
    </>
  );
}
