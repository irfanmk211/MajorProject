import { motion } from "framer-motion";

export default function ScanAnimation({ active, imageUrl }) {
  if (!active) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {imageUrl && (
        <img src={imageUrl} alt="Scanning" className="w-full h-64 object-cover opacity-80" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-agri-500/10 to-sky-500/20" />
      <motion.div
        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-agri-400 to-transparent shadow-[0_0_20px_#22c55e]"
        animate={{ top: ["0%", "100%", "0%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-16 w-16 rounded-full border-4 border-agri-500/30 border-t-agri-500"
        />
      </div>
      <p className="absolute bottom-4 left-0 right-0 text-center text-sm font-semibold text-white drop-shadow-lg">
        AI Scanning Leaf...
      </p>
    </div>
  );
}
