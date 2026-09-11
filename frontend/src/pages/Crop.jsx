import { useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Thermometer,
  Droplets,
  CloudRain,
  Gauge,
  Sparkles,
  Trophy,
  Medal,
  Award,
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";
import { getCropImage, getCropImagePlaceholder } from "../data/cropImages";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { API_BASE_URL } from "../config";

const fields = [
  { name: "N", label: "Nitrogen", icon: FlaskConical, min: 0, max: 140, default: 90, unit: "kg/ha" },
  { name: "P", label: "Phosphorus", icon: FlaskConical, min: 0, max: 145, default: 42, unit: "kg/ha" },
  { name: "K", label: "Potassium", icon: FlaskConical, min: 0, max: 205, default: 43, unit: "kg/ha" },
  { name: "temperature", label: "Temperature", icon: Thermometer, min: 8, max: 44, default: 25, unit: "°C" },
  { name: "humidity", label: "Humidity", icon: Droplets, min: 14, max: 100, default: 80, unit: "%" },
  { name: "ph", label: "pH Level", icon: Gauge, min: 3.5, max: 10, default: 6.5, unit: "", step: 0.1 },
  { name: "rainfall", label: "Rainfall", icon: CloudRain, min: 20, max: 300, default: 200, unit: "mm" },
];

const rankIcons = [Trophy, Medal, Award];

export default function Crop() {
  const [input, setInput] = useState(
    Object.fromEntries(fields.map((f) => [f.name, f.default]))
  );
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const predict = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);

    try {
      const values = fields.map((f) => Number(input[f.name]));
      const response = await fetch(`${API_BASE_URL}/predict-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: values }),
      });
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setResults(data);
      }
    } catch {
      alert("Cloud server is currently waking up or busy. Please try again in a moment.");
    }
    setLoading(false);
  };

  return (
    <PageTransition className="mx-auto max-w-6xl space-y-8">
      <GlassCard hover={false}>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-agri-500 to-emerald-600 p-3 text-white">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Crop Recommendation</h3>
            <p className="text-sm text-slate-500">Enter soil & climate parameters for AI prediction</p>
          </div>
        </div>

        <form onSubmit={predict}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field, i) => (
              <motion.div
                key={field.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <field.icon size={18} className="text-agri-500" />
                  <span className="font-semibold text-slate-700 dark:text-white">{field.label}</span>
                  <span className="ml-auto text-sm font-bold text-agri-600">
                    {input[field.name]}{field.unit}
                  </span>
                </div>
                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step || 1}
                  value={input[field.name]}
                  onChange={(e) =>
                    setInput({ ...input, [field.name]: e.target.value })
                  }
                  className="w-full accent-agri-500"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>{field.min}</span>
                  <span>{field.max}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <RippleButton type="submit" disabled={loading} className="px-10">
              {loading ? "Analyzing..." : "Predict Best Crops"}
            </RippleButton>
          </div>
        </form>
      </GlassCard>

      {results.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Top 5 Recommendations</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((item, i) => {
              const RankIcon = rankIcons[Math.min(i, 2)];
              return (
                <GlassCard key={i} delay={i * 0.1}>
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    <img
                      src={getCropImage(item.crop)}
                      alt={item.crop}
                      onError={(e) => {
                        e.currentTarget.src = getCropImagePlaceholder();
                      }}
                      className="h-40 w-full object-cover bg-slate-100 dark:bg-slate-800"
                    />
                    {i < 3 && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-yellow-400">
                        <RankIcon size={14} /> Rank {i + 1}
                      </div>
                    )}
                  </div>
                  <h4 className="text-lg font-bold capitalize text-slate-800 dark:text-white">
                    {item.crop}
                  </h4>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-500">Confidence</span>
                      <span className="font-bold text-agri-600">{item.prob}%</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.prob}%` }}
                        transition={{ duration: 1, delay: i * 0.15 }}
                        className="h-full rounded-full bg-gradient-to-r from-agri-500 to-sky-500"
                      />
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard hover={false}>
            <h4 className="mb-4 font-bold text-slate-800 dark:text-white">Probability Chart</h4>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={results.map((r) => ({ name: r.crop, prob: r.prob }))}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar dataKey="prob" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}
    </PageTransition>
  );
}
