import { useState } from "react";
import { motion } from "framer-motion";

export default function RippleButton({
  children,
  onClick,
  variant = "primary",
  className = "",
  disabled = false,
  type = "button",
}) {
  const [ripples, setRipples] = useState([]);

  const variants = {
    primary:
      "bg-gradient-to-r from-agri-500 to-sky-500 text-white shadow-lg shadow-agri-500/30 hover:shadow-agri-500/50",
    secondary:
      "glass-light text-slate-700 dark:text-white border border-white/30 hover:bg-white/90",
    outline:
      "border-2 border-agri-500 text-agri-600 dark:text-agri-400 hover:bg-agri-50 dark:hover:bg-agri-900/30",
    danger:
      "bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/30",
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ripple = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      id: Date.now(),
    };
    setRipples((prev) => [...prev, ripple]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== ripple.id));
    }, 600);
    onClick?.(e);
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      className={`relative overflow-hidden rounded-xl px-6 py-3 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/40 pointer-events-none"
          style={{
            left: r.x - 10,
            top: r.y - 10,
            width: 20,
            height: 20,
            animation: "ripple 0.6s linear",
          }}
        />
      ))}
      {children}
    </motion.button>
  );
}
