import { Link } from "react-router-dom";
import { Leaf, Code, Mail, Phone } from "lucide-react";

export default function Footer({ sidebarWidth = 260 }) {
  return (
    <footer
      style={{ marginLeft: sidebarWidth }}
      className="border-t border-slate-200/50 bg-slate-50 dark:border-white/10 dark:bg-slate-900/50"
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-agri-500 to-sky-500">
                <Leaf className="text-white" size={18} />
              </div>
              <span className="font-bold text-slate-800 dark:text-white">AgroSmart</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              AI-powered smart agriculture platform for crop recommendation, disease detection, and farm management.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-white mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              {[
                ["/dashboard", "Dashboard"],
                ["/crop", "Crop Recommendation"],
                ["/disease", "Disease Detection"],
                ["/about", "About"],
              ].map(([to, label]) => (
                <li key={to}>
                  <Link to={to} className="hover:text-agri-500 transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>

          

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-white mb-4">Contact</h4>
            <ul className="space-y-2 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex items-center gap-2"><Mail size={14} /> support@agrosmart.ai</li>
              <li className="flex items-center gap-2"><Phone size={14} /> +91 98765 43210</li>
              <li className="flex items-center gap-2"><Code size={14} /> github.com/agrosmart</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-200/50 dark:border-white/10 pt-6 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} AgroSmart AI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
