import { motion } from "framer-motion";

export default function GlassCard({
  children,
  className = "",
  hover = true,
  glow = false,
  delay = 0,
  onClick,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={hover ? { y: -6, scale: 1.02 } : undefined}
      onClick={onClick}
      className={`rounded-2xl p-6 shadow-xl transition-all duration-300 ${
        glow ? "animate-pulse-glow" : ""
      } glass-light dark:glass gradient-border cursor-default ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}
