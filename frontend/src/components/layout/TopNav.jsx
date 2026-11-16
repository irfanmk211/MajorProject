import { useLocation, useNavigate } from "react-router-dom";
import { Bell, Menu, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/languageState";

const titles = {
  "/dashboard": "Dashboard",
  "/crop": "Crop Recommendation",
  "/disease": "Plant Disease Detection",
  "/soil": "Soil Monitoring",
  "/irrigation": "Smart Irrigation",
  "/weather": "Weather Forecast",
  "/farms": "Farms & Fields",
  "/devices": "Devices",
  "/profile": "Profile",
  "/about": "About Project",
  "/contact": "Contact Us",
};

export default function TopNav({ collapsed, onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const title = t(titles[location.pathname] || "AgroSmart");

  return (
    <header
      className={`sticky top-0 z-30 flex min-w-0 items-center justify-between gap-3 border-b border-slate-200/50 bg-white/90 px-4 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90 sm:px-6 sm:py-4 ${collapsed ? "md:ml-[72px]" : "md:ml-[260px]"}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={t("Open navigation")}
          className="shrink-0 rounded-xl p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10 md:hidden"
          onClick={onMenuClick}
        >
          <Menu size={22} />
        </button>
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold text-slate-800 dark:text-white sm:text-xl">{title}</h2>
          <p className="hidden truncate text-sm text-slate-500 dark:text-slate-400 sm:block">
            {t("Welcome back,")} {t(user?.name || "Farmer")}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-white/5 px-4 py-2">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder={t("Search...")}
            className="bg-transparent text-sm outline-none w-40 text-slate-700 dark:text-white placeholder:text-slate-400"
          />
        </div>
        <button
          type="button"
          aria-label={t("Open notification settings")}
          title={t("Open notification settings")}
          onClick={() => navigate("/irrigation#notification-settings")}
          className="flex h-11 w-11 items-center justify-center rounded-xl hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-agri-500 dark:hover:bg-white/5"
        >
          <Bell size={20} className="text-slate-600 dark:text-slate-300" />
        </button>
        <button
          type="button"
          aria-label={t("Open profile")}
          onClick={() => navigate("/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-agri-500 to-sky-500 text-sm font-bold text-white transition hover:ring-2 hover:ring-agri-500 focus:outline-none focus:ring-2 focus:ring-agri-500"
        >
          {(user?.fullName || user?.name || "F")[0].toUpperCase()}
        </button>
      </div>
    </header>
  );
}
