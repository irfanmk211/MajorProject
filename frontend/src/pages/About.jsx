import { motion } from "framer-motion";
import {
  Target,
  Lightbulb,
  Cpu,
  Database,
  Rocket,
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import { CROP_CLASS_COUNT } from "../data/cropImages";
import { DISEASE_CLASS_COUNT } from "../data/diseaseInfo";

const techStack = [
  { name: "React", desc: "Modern frontend UI framework" },
  { name: "Tailwind CSS", desc: "Utility-first styling" },
  { name: "Flask", desc: "Python REST API backend" },
  { name: "TensorFlow", desc: "Deep learning inference" },
  { name: "OpenCV", desc: "Image preprocessing" },
  { name: "Machine Learning", desc: "Crop recommendation model" },
  { name: "Deep Learning", desc: "EfficientNet disease classifier" },
  { name: "Scikit-learn", desc: "Random Forest crop model" },
];

const sections = [
  {
    icon: Target,
    title: "Project Overview",
    content:
      "AgroSmart is an AI-powered smart agriculture platform that helps farmers make data-driven decisions. It combines machine learning for crop recommendation and deep learning for plant disease detection into a unified, user-friendly web application.",
  },
  {
    icon: Lightbulb,
    title: "Problem Statement",
    content:
      "Farmers face challenges in selecting optimal crops based on soil conditions and identifying plant diseases early. Manual diagnosis is slow, error-prone, and leads to significant crop losses and reduced yields.",
  },
  {
    icon: Cpu,
    title: "Solution",
    content:
      "Our platform uses trained ML/DL models to recommend the top 5 suitable crops based on NPK levels, temperature, humidity, pH, and rainfall. The disease detection module analyzes leaf images and provides detailed treatment recommendations.",
  },
  {
    icon: Database,
    title: "Dataset",
    content:
      `Crop recommendation uses a dataset with 2200+ samples across ${CROP_CLASS_COUNT} crop types. Disease detection uses the PlantVillage dataset with ${DISEASE_CLASS_COUNT} classes across 14 plant species, trained with EfficientNet architecture.`,
  },
  {
    icon: Rocket,
    title: "Future Scope",
    content:
      "IoT sensor integration, real-time weather API, mobile app, multi-language support, marketplace for agricultural products, and federated learning for continuous model improvement across farms.",
  },
];

export default function About() {
  return (
    <PageTransition className="mx-auto max-w-6xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-extrabold text-gradient">About AgroSmart</h2>
        <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
          A final-year engineering project bridging AI and agriculture for smarter farming decisions.
        </p>
      </motion.div>

      <div className="space-y-4">
        {sections.map((s, i) => (
          <GlassCard key={s.title} delay={i * 0.08}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-agri-500/20 to-sky-500/20">
                <s.icon className="text-agri-600 dark:text-agri-400" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">{s.title}</h3>
                <p className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed">{s.content}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold text-slate-800 dark:text-white">Technology Stack</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {techStack.map((t, i) => (
            <GlassCard key={t.name} delay={i * 0.05}>
              <h4 className="font-bold text-slate-800 dark:text-white">{t.name}</h4>
              <p className="mt-1 text-sm text-slate-500">{t.desc}</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
