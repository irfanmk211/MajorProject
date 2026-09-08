import { useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const titles = {
  "/dashboard": "Dashboard",
  "/crop": "Crop Recommendation",
  "/disease": "Plant Disease Detection",
  "/soil": "Soil Monitoring",
  "/irrigation": "Smart Irrigation",
  "/weather": "Weather Forecast",
  "/profile": "Profile",
  "/about": "About Project",
  "/contact": "Contact Us",
};

export default function TopNav({ sidebarWidth }) {
  const location = useLocation();
  const { user } = useAuth();
  const title = titles[location.pathname] || "AgroSmart";

  return (
    <header
      style={{ marginLeft: sidebarWidth }}
      className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/50 bg-white/70 px-6 py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70"
    >
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Welcome back, {user?.name || "Farmer"}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 px-4 py-2">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm outline-none w-40 text-slate-700 dark:text-white placeholder:text-slate-400"
          />
        </div>
        <button className="relative rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/5">
          <Bell size={20} className="text-slate-600 dark:text-slate-300" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-agri-500" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-agri-500 to-sky-500 text-white font-bold text-sm">
          {(user?.name || "F")[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
