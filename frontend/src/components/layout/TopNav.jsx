import { useLocation } from "react-router-dom";
import { Bell, Search, Menu } from "lucide-react";
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

export default function TopNav({ onMenuToggle }) {
  const location = useLocation();
  const { user } = useAuth();
  const title = titles[location.pathname] || "AgroSmart";

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 sm:px-6 sm:py-4 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/80">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={onMenuToggle}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 md:hidden focus:outline-none"
          aria-label="Open Menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white truncate max-w-[200px] sm:max-w-none">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 hidden xs:block">
            Welcome back, {user?.name || "Farmer"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 px-3 py-1.5">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm outline-none w-36 text-slate-700 dark:text-white placeholder:text-slate-400"
          />
        </div>
        <button className="relative rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-white/5">
          <Bell size={18} className="text-slate-600 dark:text-slate-300" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-agri-500" />
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-agri-500 to-sky-500 text-white font-bold text-xs shadow-sm">
          {(user?.name || "F")[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}

