import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Sprout,
  ScanLine,
  BarChart3,
  Droplets,
  CloudSun,
  Database,
  ArrowRight,
  Pencil,
  Tractor,
} from "lucide-react";

import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";
import { useLanguage } from "../context/languageState";
import { useAuth } from "../context/AuthContext";

const modules = [
  {
    title: "Crop Recommendation",
    desc: "Get top 5 crop suggestions from soil NPK, climate, and rainfall data",
    icon: Sprout,
    path: "/crop",
    gradient: "from-emerald-500 to-green-600",
  },
  {
    title: "Disease Detection",
    desc: "Upload leaf images for AI-powered disease detection with treatment guides",
    icon: ScanLine,
    path: "/disease",
    gradient: "from-sky-500 to-blue-600",
  },
  {
    title: "Soil Monitoring",
    desc: "Track soil moisture, nutrients and pH values.",
    icon: BarChart3,
    path: "/soil",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    title: "Smart Irrigation",
    desc: "Manage irrigation schedules efficiently.",
    icon: Droplets,
    path: "/irrigation",
    gradient: "from-cyan-500 to-teal-600",
  },
  {
    title: "Weather",
    desc: "View weather forecast for better farming decisions.",
    icon: CloudSun,
    path: "/weather",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    title: "About Project",
    desc: "Learn about the project and technologies used.",
    icon: Database,
    path: "/about",
    gradient: "from-rose-500 to-pink-600",
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <PageTransition className="mx-auto max-w-7xl space-y-8">
      {location.state?.profileSaved && (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 font-semibold text-emerald-800">
          {t("Farmer profile saved successfully. Welcome to AgroSmart!")}
        </div>
      )}
      {/* Hero Section */}
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-agri-600 via-emerald-600 to-sky-600 p-8 md:p-12"
      >
        <div className="absolute inset-0 opacity-20">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-4xl"
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 2) * 30}%`,
              }}
              animate={{
                y: [0, -10, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
              }}
            >
              🌱
            </motion.div>
          ))}
        </div>

        <div className="relative z-10 max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl md:text-4xl font-extrabold text-white leading-tight"
          >
            {t("Smart Agriculture Decision Support")}
          </motion.h1>

          <p className="mt-4 text-lg text-white/80">
            {user?.name ? `${t("Welcome,")} ${t(user.name)}. ` : ""}{t("ML-based crop recommendation and plant disease detection system.")}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <RippleButton onClick={() => navigate("/crop")}>
              {t("Crop Recommendation")}
              <ArrowRight size={18} className="ml-1 inline" />
            </RippleButton>

            <RippleButton
              variant="secondary"
              onClick={() => navigate("/disease")}
            >
              {t("Disease Detection")}
            </RippleButton>
            <button
              type="button"
              onClick={() => navigate("/profile-setup?edit=1")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              <Pencil size={17} /> {t("Edit farmer profile")}
            </button>
            <button
              type="button"
              onClick={() => navigate("/farms")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/20"
            >
              <Tractor size={17} /> {t("Farms & Fields")}
            </button>
          </div>
        </div>
      </motion.section>

      {/* Platform Modules */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-slate-800 dark:text-white">
          {t("Platform Modules")}
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module, index) => (
            <GlassCard
              key={module.title}
              delay={index * 0.08}
              onClick={() => navigate(module.path)}
              className="group cursor-pointer"
            >
              <div
                className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${module.gradient} p-3 text-white shadow-lg`}
              >
                <module.icon size={24} />
              </div>

              <h4 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-agri-600 transition-colors">
                {t(module.title)}
              </h4>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {t(module.desc)}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}