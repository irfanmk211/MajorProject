import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SUPPORTED_LANGUAGES, useLanguage } from "../context/languageState";

export default function Login() {
  const navigate = useNavigate();
  const { login, guestLogin, authEnabled, user, profileComplete, loading: authLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && user) {
      navigate(profileComplete ? "/dashboard" : "/profile-setup", { replace: true });
    }
  }, [authLoading, navigate, profileComplete, user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      const result = await login(email, password, mode === "signup");
      navigate(result.profileComplete ? "/dashboard" : "/profile-setup");
    } catch (loginError) {
      console.error("Login failed:", loginError);
      setError(loginError.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    guestLogin();
    navigate("/dashboard");
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">{t("Loading AgroSmart…")}</div>;
  }
  if (user) return <Navigate to={profileComplete ? "/dashboard" : "/profile-setup"} replace />;

  return (
    <div className="auth-app">
      {/* Dark Overlay */}
      <div className="auth-overlay"></div>

      {/* Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="auth-card"
      >
        <div className="mb-5 flex justify-end">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <span>{t("Language")}</span>
            <select
              aria-label={t("Language")}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="rounded-lg border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {SUPPORTED_LANGUAGES.map(({ value, label }) => (
                <option key={value} value={value}>{t(label)}</option>
              ))}
            </select>
          </label>
        </div>

        <h1>AgroSmart</h1>
        
        <p className="auth-subtitle">
          {t("AI Powered Smart Agriculture Platform")}
        </p>

        <form onSubmit={handleLogin}>
          {/* Email Box */}
          <div className="auth-input-box">
            <Mail size={22} />
            <input
              type="email"
              placeholder={t("Email Address")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Box */}
          <div className="auth-input-box">
            <Lock size={22} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t("Password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={mode === "signup" ? 6 : undefined}
              required
            />
            <span
              className="auth-eye"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </span>
          </div>

          {/* Submit Button */}
          <button type="submit" className="auth-login-btn" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={18} />
                {mode === "login" ? t("Signing in...") : t("Signing up...")}
              </span>
            ) : (
              mode === "login" ? t("Login") : t("Sign Up")
            )}
          </button>
        </form>

        {error && <p role="alert" className="mt-3 rounded-lg bg-red-500/20 px-3 py-2 text-left text-sm text-white">{error}</p>}

        {/* Mode Toggle Link */}
        <p className="auth-mode-toggle">
          {mode === "login" ? t("Don't have an account?") : t("Already have an account?")}
          <span role="button" tabIndex={0} onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") setMode(mode === "login" ? "signup" : "login");
          }} onClick={() => {
            setError("");
            setMode(mode === "login" ? "signup" : "login");
          }}>
            {mode === "login" ? t("Sign Up") : t("Login")}
          </span>
        </p>

        {!authEnabled && (
          <p className="mt-3 text-xs leading-5 text-amber-100">
            {t("Firebase is not configured. Sign-in and profile data use this browser’s demo mode.")}
          </p>
        )}

        {/* Divider */}
        <div className="auth-divider">
          <span>{t("OR")}</span>
        </div>

        {/* Guest Login Button */}
        <button type="button" className="auth-google-btn" onClick={handleGuest}>
          {t("Continue as Guest")}
        </button>

        {/* Footer */}
        <p className="auth-footer">
          🚁 {t("Smart Farming • AI • IoT • Drone Monitoring")}
        </p>
      </motion.div>

      {/* Full-Screen Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <div className="text-center text-white z-30">
              <Loader2 className="mx-auto mb-4 animate-spin" size={48} />
              <p className="font-semibold">{t("Entering your farm dashboard...")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
