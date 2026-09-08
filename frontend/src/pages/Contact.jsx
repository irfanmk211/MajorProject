import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, Share2, Globe, MessageCircle } from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <PageTransition className="mx-auto max-w-6xl space-y-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <GlassCard hover={false}>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Get in Touch</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              placeholder="Your Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-500/30 text-slate-800 dark:text-white"
            />
            <input
              type="email"
              placeholder="Email Address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-500/30 text-slate-800 dark:text-white"
            />
            <textarea
              placeholder="Your Message"
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 px-4 py-3 outline-none focus:ring-2 focus:ring-agri-500/30 text-slate-800 dark:text-white resize-none"
            />
            <RippleButton type="submit" className="flex items-center gap-2">
              <Send size={18} /> {sent ? "Message Sent!" : "Send Message"}
            </RippleButton>
          </form>

          <div className="mt-8 flex gap-4">
            {[Share2, Globe, MessageCircle, Mail].map((Icon, i) => (
              <motion.a
                key={i}
                href="#"
                whileHover={{ scale: 1.1 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-agri-500 hover:text-white transition-colors"
              >
                <Icon size={18} />
              </motion.a>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-4">
          {[
            { icon: Mail, label: "Email", value: "support@agrosmart.ai" },
            { icon: Phone, label: "Phone", value: "+91 98765 43210" },
            { icon: MapPin, label: "Location", value: "Pune, Maharashtra, India" },
          ].map((item, i) => (
            <GlassCard key={item.label} delay={i * 0.1}>
              <div className="flex items-center gap-4">
                <item.icon className="text-agri-500" size={24} />
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="font-semibold text-slate-800 dark:text-white">{item.value}</p>
                </div>
              </div>
            </GlassCard>
          ))}

          <GlassCard hover={false} className="overflow-hidden p-0">
            <iframe
              title="Farm Location"
              src="https://maps.google.com/maps?q=Pune,Maharashtra&output=embed"
              className="h-64 w-full border-0"
              loading="lazy"
            />
          </GlassCard>
        </div>
      </div>
    </PageTransition>
  );
}
