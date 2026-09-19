import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Sprout,
  ScanLine,
  Droplets,
  CloudSun,
  BarChart3,
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

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/crop", icon: Sprout, label: "Crop Recommendation" },
  { to: "/disease", icon: ScanLine, label: "Disease Detection" },
  { to: "/soil", icon: BarChart3, label: "Soil Monitoring" },
  { to: "/irrigation", icon: Droplets, label: "Smart Irrigation" },
  { to: "/weather", icon: CloudSun, label: "Weather" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/about", icon: Info, label: "About" },
  { to: "/contact", icon: Mail, label: "Contact" },
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
    if (setMobileOpen) setMobileOpen(false);
  };

  const handleNavClick = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Blur Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar (Desktop Docked + Mobile Slide-In Drawer) */}
      <motion.aside
        initial={false}
        animate={{
          width: collapsed ? 72 : 260,
        }}
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-white/10 bg-slate-900/95 backdrop-blur-2xl transition-transform duration-300 md:translate-x-0 ${
          mobileOpen ? "translate-x-0 !w-72" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-agri-500 to-sky-500 shadow-md">
              <Leaf className="text-white" size={22} />
            </div>
            {(!collapsed || mobileOpen) && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="text-lg font-bold text-white tracking-tight">AgroSmart</h1>
                <p className="text-xs text-slate-400">AI Farming Platform</p>
              </motion.div>
            )}
          </div>

          {/* Close button on Mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-agri-500/20 to-sky-500/20 text-agri-400 font-semibold"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={20} className="shrink-0" />
              {(!collapsed || mobileOpen) && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={20} />
            {(!collapsed || mobileOpen) && <span>Logout</span>}
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-2 hidden md:flex w-full items-center justify-center rounded-xl py-2 text-slate-500 hover:bg-white/5"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </motion.aside>
    </>
  );
}

