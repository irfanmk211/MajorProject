import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Droplets,
  Power,
  PowerOff,
  Waves,
  Gauge,
  History,
  AlertCircle
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";
import CircularGauge from "../components/ui/CircularGauge";
import { ESP32_IP } from "../config";
import { useLanguage } from "../context/languageState";
import { useAuth } from "../context/AuthContext";
import { recordReadingForActiveField } from "../services/farmerData";

export default function SmartIrrigation() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [pumpOn, setPumpOn] = useState(false);
  const [autoMode, setAutoMode] = useState(() => {
    const manualRequested = sessionStorage.getItem("agrosmart_voice_manual_mode");
    return !manualRequested;
  });
  const tankLevel = 85;
  const [soilMoisture, setSoilMoisture] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sessionStorage.removeItem("agrosmart_voice_manual_mode");
    const enableManualMode = () => setAutoMode(false);
    window.addEventListener("agrosmart:voice-manual-mode", enableManualMode);
    return () => window.removeEventListener("agrosmart:voice-manual-mode", enableManualMode);
  }, []);

  // Helper to send pump toggle requests to ESP32
  const controlPump = async (stateVal) => {
    try {
      const response = await fetch(`http://${ESP32_IP}/api/pump?state=${stateVal}`);
      if (!response.ok) throw new Error("Offline");
      const json = await response.json();
      if (json.pump_state !== undefined) {
        setPumpOn(json.pump_state === 1);
      } else {
        setPumpOn(stateVal === 1);
      }
    } catch (err) {
      console.error("Failed to toggle pump:", err);
      // If hardware is offline, do NOT update local state to pretend it worked, just log it.
      // But to let them test we can toggle it locally, though they said "dont make false", so we shouldn't pretend.
      // Let's just alert the error.
      alert(`${t("Hardware Offline:")} ${t("Unable to toggle pump at")} ${ESP32_IP}`);
    }
  };

  // Poll ESP32 data every 5 seconds
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const response = await fetch(`http://${ESP32_IP}/api/data`);
        if (!response.ok) throw new Error("Offline");
        const json = await response.json();
        
        if (active) {
          // Parse moisture robustly (percentage, raw, or alternate key)
          let moisture = null;
          if (json.soil_moisture_percent !== undefined) {
            moisture = json.soil_moisture_percent;
          } else if (json.soil_moisture !== undefined) {
            if (json.soil_moisture <= 100) {
              moisture = json.soil_moisture;
            } else {
              // Convert 12-bit ADC raw soil moisture value to percentage
              // Assumes 3500 as dry (0%) and 1500 as wet (100%)
              moisture = Math.round(((3500 - json.soil_moisture) / (3500 - 1500)) * 100);
            }
          } else if (json.soil !== undefined) {
            moisture = json.soil;
          }

          const finalMoisture = moisture !== null ? Math.max(0, Math.min(100, moisture)) : null;
          setSoilMoisture(finalMoisture);
          recordReadingForActiveField(user.uid, {
            soil_moisture_percent: finalMoisture,
            soil: json.soil ?? json.soil_moisture ?? finalMoisture,
            temperature: json.temperature,
            humidity: json.humidity,
            ldr: json.ldr_state ?? json.ldr,
            irrigation: json.irrigation,
            pump_state: json.pump_state,
            source: "ESP32",
          }).catch((storageError) => console.error("Could not save ESP32 sensor reading:", storageError));
          
          // Parse ESP32 pump state if present: 1 is ON, 0 is OFF
          if (json.pump_state !== undefined) {
            setPumpOn(json.pump_state === 1);
          }
          
          setError(false);
        }
      } catch {
        if (active) {
          setError(true);
          setSoilMoisture(null); // Clear sensor data when offline
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [autoMode, user.uid]);

  const hasData = !loading && !error && soilMoisture !== null;

  return (
    <PageTransition className="mx-auto max-w-7xl space-y-8">
      {/* Alert Banner for offline ESP32 */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-600 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-sm">
            <span className="font-bold">{t("Hardware Offline:")}</span> {t("Unable to reach ESP32 at")} <code className="bg-red-500/10 px-1 py-0.5 rounded">{ESP32_IP}</code>. {t("Auto-irrigation is suspended until connection is restored.")}
          </div>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tank Level Gauge */}
        <GlassCard>
          <CircularGauge
            value={tankLevel ?? 0}
            label={t("Water Tank Level")}
          />
          <p className="mt-2 text-center text-xs text-slate-500">
            {t("Awaiting tank sensor (Static 85%)")}
          </p>
        </GlassCard>

        {/* Soil Moisture Gauge */}
        <GlassCard>
          <CircularGauge
            value={soilMoisture !== null ? soilMoisture : "—"}
            unit={soilMoisture !== null ? "%" : ""}
            label={t("Soil Moisture")}
          />
          {soilMoisture === null && (
            <p className="mt-2 text-center text-xs text-red-500 font-semibold">{t("Sensor Offline / Not Found")}</p>
          )}
        </GlassCard>

        {/* Pump Status Card */}
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ${pumpOn && hasData ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/40 text-white" : "bg-slate-300 dark:bg-slate-600 text-slate-500"}`}>
              {pumpOn && hasData ? <Power size={28} /> : <PowerOff size={28} />}
            </div>
            <span className="font-bold text-slate-800 dark:text-white">
              {t("Pump")} {!hasData ? t("UNKNOWN") : (pumpOn ? t("RUNNING") : t("OFF"))}
            </span>
            <span className="text-xs text-slate-500">
              {!hasData ? t("Check hardware connection") : (autoMode ? (pumpOn ? t("Triggered by Auto-logic") : t("Idle (Optimal Moisture)")) : t("Manual control enabled"))}
            </span>
          </div>
        </GlassCard>

        {/* Auto/Manual Mode Card */}
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/40 text-sky-600`}>
              <Gauge size={28} />
            </div>
            <span className="font-bold text-slate-800 dark:text-white">
              {autoMode ? t("Automatic Mode") : t("Manual Mode")}
            </span>
            <span className="text-xs text-slate-500 text-center px-2">
              {autoMode ? t("Pump state updates based on soil moisture (<35% On, >=60% Off)") : t("Control pump manually below")}
            </span>
          </div>
        </GlassCard>
      </div>

      {/* Pipeline Status Banner */}
      <GlassCard hover={false} className="relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Waves className="text-sky-500" /> {t("Irrigation Pipeline Status")}
          </h4>
          {pumpOn && hasData && (
            <motion.span
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
              className="text-sm font-semibold text-emerald-500"
            >
              {t("Water Flowing...")}
            </motion.span>
          )}
        </div>

        <div className="relative h-16 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-full flex items-center px-4">
            <div className="h-3 flex-1 rounded-full bg-slate-300 dark:bg-slate-600 relative overflow-hidden">
              {pumpOn && hasData && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-sky-400 via-sky-300 to-sky-400"
                  style={{ backgroundSize: "40px 100%" }}
                  animate={{ backgroundPosition: ["0 0", "40px 0"] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              )}
            </div>
          </div>
          {[...Array(5)].map((_, i) => (
            pumpOn && hasData && (
              <motion.div
                key={i}
                className="absolute bottom-0 text-sky-400"
                style={{ left: `${15 + i * 18}%` }}
                animate={{ y: [0, -20, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
              >
                <Droplets size={16} />
              </motion.div>
            )
          ))}
        </div>
      </GlassCard>

      {/* Control Buttons */}
      <div className="flex flex-wrap gap-3">
        <RippleButton
          onClick={() => {
            setAutoMode(false);
            controlPump(1);
          }}
          disabled={!hasData || (pumpOn && !autoMode)}
          className="flex items-center gap-2"
        >
          <Power size={18} /> {t("Start Pump Manually")}
        </RippleButton>
        
        <RippleButton
          variant="danger"
          onClick={() => {
            setAutoMode(false);
            controlPump(0);
          }}
          disabled={!hasData || (!pumpOn && !autoMode)}
          className="flex items-center gap-2"
        >
          <PowerOff size={18} /> {t("Stop Pump Manually")}
        </RippleButton>

        <RippleButton
          variant={autoMode ? "secondary" : "outline"}
          onClick={() => setAutoMode(true)}
        >
          {t("Enable Auto Mode")}
        </RippleButton>

        <RippleButton
          variant={!autoMode ? "secondary" : "outline"}
          onClick={() => setAutoMode(false)}
        >
          {t("Enable Manual Mode")}
        </RippleButton>
      </div>

      {/* Irrigation History Card */}
      <GlassCard hover={false}>
        <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <History size={20} /> {t("Irrigation Events History")}
        </h4>
        <div className="py-8 text-center text-slate-500">
          <p>{t("Irrigation Controller is linked.")}</p>
          {pumpOn && hasData ? (
            <p className="mt-2 text-sm text-emerald-500 font-semibold">{t("Active watering event is currently in progress.")}</p>
          ) : (
            <p className="mt-2 text-sm">{t("System is idle. No recent irrigation events detected.")}</p>
          )}
        </div>
      </GlassCard>
    </PageTransition>
  );
}
