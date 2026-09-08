import { useEffect, useState } from "react";
import GlassCard from "../components/ui/GlassCard";
import PageTransition from "../components/ui/PageTransition";
import { Radio, Wifi, AlertCircle, Thermometer, Droplets, Sun, Moon } from "lucide-react";
import RippleButton from "../components/ui/RippleButton";
import { ESP32_IP, API_BASE_URL } from "../config";

export default function SoilMonitoring() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Poll ESP32 data every 5 seconds with backend fallback
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      let json = null;
      try {
        const response = await fetch(`http://${ESP32_IP}/api/data`);
        if (response.ok) {
          json = await response.json();
        }
      } catch (e) {
        try {
          const response = await fetch(`${API_BASE_URL}/get_sensor`);
          if (response.ok) {
            json = await response.json();
          }
        } catch (backendErr) {
          json = null;
        }
      }

      if (active) {
        if (json) {
          let moisture = null;
          if (json.soil_moisture_percent !== undefined) {
            moisture = json.soil_moisture_percent;
          } else if (json.soil_moisture !== undefined) {
            if (json.soil_moisture <= 100) {
              moisture = json.soil_moisture;
            } else {
              moisture = Math.round(((3500 - json.soil_moisture) / (3500 - 1500)) * 100);
            }
          } else if (json.soil !== undefined) {
            moisture = json.soil;
          }

          const finalMoisture = moisture !== null ? Math.max(0, Math.min(100, moisture)) : 0;
          setData({
            ...json,
            soil_moisture_percent: finalMoisture
          });
          setError(false);
        } else {
          setError(true);
          setData(null);
        }
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const hasData = !loading && !error && data !== null;

  return (
    <PageTransition className="mx-auto max-w-7xl space-y-8">
      {/* Alert Banner for offline ESP32 */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-600 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-sm">
            <span className="font-bold">Hardware Offline:</span> Unable to connect to ESP32 at <code className="bg-red-500/10 px-1 py-0.5 rounded">{ESP32_IP}</code>. Please check power and Wi-Fi connection.
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
        {/* Soil Moisture */}
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">
              <Droplets size={32} />
            </div>
            <span className="text-sm text-slate-500">Soil Moisture</span>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {loading ? "..." : (hasData ? `${data?.soil_moisture_percent}%` : "No Data")}
            </span>
            <span className="text-xs text-slate-400">
              {loading ? "Reading..." : (hasData ? `Raw: ${data?.soil_moisture}` : "Sensor not found")}
            </span>
          </div>
        </GlassCard>

        {/* LDR (Light Exposure) */}
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${hasData && data?.ldr_state === 0 ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600" : "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600"}`}>
              {hasData && data?.ldr_state === 0 ? <Sun size={32} /> : <Moon size={32} />}
            </div>
            <span className="text-sm text-slate-500">Sunlight Exposure</span>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {loading ? "..." : (hasData ? (data?.ldr_state === 0 ? "Daylight" : "Night") : "No Data")}
            </span>
            <span className="text-xs text-slate-400">LDR Photosensor</span>
          </div>
        </GlassCard>
      </div>

      {/* Integration Info / Troubleshooting */}
      <GlassCard hover={false}>
        <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Wifi size={20} /> ESP32 IoT Station Configuration
        </h4>
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <AlertCircle size={16} className="shrink-0 text-emerald-500 mt-0.5" />
            Ensure your ESP32 is powered and connected to the local Wi-Fi router.
          </li>
          <li className="flex gap-2">
            <AlertCircle size={16} className="shrink-0 text-emerald-500 mt-0.5" />
            The ESP32 must run a web server exposing `http://{ESP32_IP}/api/data` with CORS enabled (e.g. `Access-Control-Allow-Origin: *` headers).
          </li>
          <li className="flex gap-2">
            <AlertCircle size={16} className="shrink-0 text-emerald-500 mt-0.5" />
            Your browser must have network access to `{ESP32_IP}`.
          </li>
        </ul>
      </GlassCard>
    </PageTransition>
  );
}
