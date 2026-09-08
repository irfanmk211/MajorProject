import { motion } from "framer-motion";
import { Sprout, Cloud, Bird } from "lucide-react";

function Particle({ delay, x, y }) {
  return (
    <motion.div
      className="absolute h-1 w-1 rounded-full bg-white/60"
      style={{ left: `${x}%`, top: `${y}%` }}
      animate={{ opacity: [0, 1, 0], y: [0, -30] }}
      transition={{ duration: 3, repeat: Infinity, delay }}
    />
  );
}

function CloudShape({ className, duration = 40 }) {
  return (
    <motion.div
      className={`absolute ${className}`}
      animate={{ x: ["-20vw", "120vw"] }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <Cloud size={48} className="text-white/40" fill="currentColor" />
    </motion.div>
  );
}

export default function FarmScene() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-400">
      {/* Sun */}
      <motion.div
        className="absolute top-12 right-16 h-24 w-24 rounded-full bg-gradient-to-br from-yellow-200 to-orange-400 shadow-[0_0_60px_rgba(251,191,36,0.6)]"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 4, repeat: Infinity }}
      />

      {/* Clouds */}
      <CloudShape className="top-16 opacity-70" duration={55} />
      <CloudShape className="top-32 opacity-50" duration={70} />
      <CloudShape className="top-8 opacity-30" duration={45} />

      {/* Birds */}
      {[20, 35, 50].map((top, i) => (
        <motion.div
          key={i}
          className="absolute text-slate-700/60"
          style={{ top: `${top}%` }}
          animate={{ x: ["-10vw", "110vw"] }}
          transition={{ duration: 25 + i * 5, repeat: Infinity, ease: "linear", delay: i * 3 }}
        >
          <Bird size={20 + i * 4} />
        </motion.div>
      ))}

      {/* Drone */}
      <motion.div
        className="absolute top-[22%] z-20"
        animate={{ x: ["10vw", "80vw", "10vw"], y: [0, -15, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="relative">
          <div className="h-3 w-10 rounded-full bg-slate-700 shadow-lg" />
          <div className="absolute -left-3 -top-1 h-1 w-6 bg-slate-500 rounded" />
          <div className="absolute -right-3 -top-1 h-1 w-6 bg-slate-500 rounded" />
          <motion.div
            className="absolute -bottom-1 left-1/2 h-8 w-px bg-agri-400/60 -translate-x-1/2"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </div>
      </motion.div>

      {/* Hills */}
      <div className="absolute bottom-24 left-0 right-0 h-40 bg-emerald-600/80 rounded-t-[100%] scale-x-150" />
      <div className="absolute bottom-20 left-0 right-0 h-32 bg-emerald-500/90 rounded-t-[100%] scale-x-125" />

      {/* Crop rows */}
      <div className="absolute bottom-28 left-0 right-0 flex justify-around px-8">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="origin-bottom"
            animate={{ rotate: [-4, 4, -4] }}
            transition={{ duration: 2 + i * 0.2, repeat: Infinity }}
          >
            <Sprout size={28 + (i % 3) * 8} className="text-emerald-800" />
          </motion.div>
        ))}
      </div>

      {/* Irrigation spray */}
      <motion.div
        className="absolute bottom-32 left-[30%]"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-8 w-0.5 bg-sky-300/70 origin-top"
            style={{ transform: `rotate(${-20 + i * 10}deg)`, left: i * 6 }}
            animate={{ scaleY: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          />
        ))}
      </motion.div>

      {/* Tractor */}
      <motion.div
        className="absolute bottom-24 z-10"
        animate={{ x: ["-10vw", "110vw"] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      >
        <div className="flex items-end gap-1">
          <div className="h-8 w-14 rounded-lg bg-red-600 shadow-lg relative">
            <div className="absolute -top-3 left-2 h-4 w-8 bg-red-700 rounded" />
          </div>
          <div className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-slate-800 border-2 border-slate-600 animate-spin" style={{ animationDuration: "2s" }} />
            <div className="h-8 w-8 rounded-full bg-slate-800 border-2 border-slate-600 animate-spin" style={{ animationDuration: "2s" }} />
          </div>
        </div>
      </motion.div>

      {/* Floating leaves */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-agri-600/70"
          style={{ left: `${10 + i * 12}%`, top: `${40 + (i % 3) * 10}%` }}
          animate={{
            y: [0, -40, 0],
            x: [0, 20, 0],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 6 + i, repeat: Infinity, delay: i * 0.5 }}
        >
          🍃
        </motion.div>
      ))}

      {/* Particles */}
      {[...Array(15)].map((_, i) => (
        <Particle key={i} delay={i * 0.4} x={Math.random() * 100} y={60 + Math.random() * 30} />
      ))}

      {/* Grass foreground */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-emerald-700 to-emerald-500/80">
        <div className="flex h-full items-end justify-around px-2">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 bg-emerald-900/60 rounded-t-full origin-bottom"
              style={{ height: 12 + (i % 5) * 8 }}
              animate={{ scaleY: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.05 }}
            />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
    </div>
  );
}
