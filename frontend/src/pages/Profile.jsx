import { useState } from "react";
import { motion } from "framer-motion";
import {
  MapPin,
  Ruler,
  Sprout,
  Settings,
  Moon,
  Sun,
  Mail,
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Profile() {
  const { user } = useAuth();
  const { dark, toggle } = useTheme();
  const [crops, setCrops] = useState(user?.crops?.join(", ") || "Rice, Wheat");

  return (
    <PageTransition className="mx-auto max-w-4xl space-y-8">
      <GlassCard>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-agri-500 to-sky-500 text-4xl font-bold text-white shadow-xl"
          >
            {(user?.name || "F")[0].toUpperCase()}
          </motion.div>
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">{user?.name}</h2>
            <p className="text-slate-500 flex items-center justify-center sm:justify-start gap-1 mt-1">
              <Mail size={14} /> {user?.email}
            </p>
            <span className="mt-2 inline-block rounded-full bg-agri-100 dark:bg-agri-900/30 px-3 py-0.5 text-xs font-bold text-agri-700 dark:text-agri-400">
              {user?.role || "Farmer"}
            </span>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: MapPin, label: "Farm Location", value: user?.location || "Not set" },
          { icon: Ruler, label: "Farm Size", value: user?.farmSize || "Not set" },
          { icon: Sprout, label: "Preferred Crops", value: crops || "Not set" },
          { icon: Mail, label: "Email", value: user?.email || "Not set" },
        ].map((item, i) => (
          <GlassCard key={item.label} delay={i * 0.08}>
            <div className="flex items-start gap-3">
              <item.icon className="text-agri-500 mt-0.5" size={20} />
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="font-semibold text-slate-800 dark:text-white">{item.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false}>
        <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Settings size={20} /> Settings
        </h4>

        <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-white/5 p-4">
          <div className="flex items-center gap-3">
            {dark ? <Moon className="text-sky-400" size={22} /> : <Sun className="text-yellow-500" size={22} />}
            <div>
              <p className="font-semibold text-slate-800 dark:text-white">Dark Mode</p>
              <p className="text-sm text-slate-500">Toggle application theme</p>
            </div>
          </div>
          <button
            onClick={toggle}
            className={`relative h-7 w-14 rounded-full transition-colors ${dark ? "bg-agri-500" : "bg-slate-300"}`}
          >
            <motion.div
              animate={{ x: dark ? 28 : 4 }}
              className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
            />
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Preferred Crops</label>
          <input
            value={crops}
            onChange={(e) => setCrops(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-500/30 text-slate-800 dark:text-white"
          />
        </div>

        <div className="mt-6">
          <RippleButton>Save Changes</RippleButton>
        </div>
      </GlassCard>
    </PageTransition>
  );
}
