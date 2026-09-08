import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function ExpandableCard({ title, icon: Icon, children, defaultOpen = false }) {
  return (
    <motion.details
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      open={defaultOpen}
      className="group rounded-2xl glass-light overflow-hidden"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 p-5 font-semibold text-slate-800 dark:text-white list-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-3">
          {Icon && (
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-agri-500/20 to-sky-500/20 text-agri-600 dark:text-agri-400">
              <Icon size={20} />
            </span>
          )}
          {title}
        </span>
        <ChevronDown
          size={20}
          className="text-slate-400 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-slate-200/50 dark:border-white/10 px-5 pb-5 pt-3 text-slate-600 dark:text-slate-300 leading-relaxed">
        {children}
      </div>
    </motion.details>
  );
}
