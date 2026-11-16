import { useEffect, useState } from "react";
import GlassCard from "../components/ui/GlassCard";
import PageTransition from "../components/ui/PageTransition";
import { Wifi, AlertCircle, Droplets, Sun, Moon, Thermometer, FlaskConical } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLanguage } from "../context/languageState";
import { useAuth } from "../context/AuthContext";
import {
  isDeviceReadingFresh,
  selectUserDevice,
  subscribeToActiveDeviceChanges,
  subscribeToDeviceReadings,
  subscribeToUserDevices,
} from "../services/farmerData";

export default function SoilMonitoring() {
  const { t } = useLanguage();
  const { user, authEnabled } = useAuth();
  const [device, setDevice] = useState(null);
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyMetric, setHistoryMetric] = useState("moisture");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    const initialTimer = window.setTimeout(updateTime, 0);
    const timer = window.setInterval(() => setNow(Date.now()), 10_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!authEnabled || user?.isGuest || !user?.uid) return undefined;
    let devices = [];
    const updateSelectedDevice = () => {
      const selectedDevice = selectUserDevice(user.uid, devices);
      setDevice(selectedDevice);
      if (!selectedDevice) {
        setData(null);
        setError(true);
        setLoading(false);
        return;
      }

      const reading = selectedDevice.latestReading;
      if (!reading) {
        setData(null);
        setError(true);
      } else {
        setData({
          ...reading,
          lastSeenAt: selectedDevice.lastSeenAt,
          soil_moisture_percent: reading.moisture,
          soil_moisture: reading.moisture,
          ldr_state: reading.ldr,
        });
        setError(false);
      }
      setLoading(false);
    };
    const unsubscribeDevices = subscribeToUserDevices(user.uid, (nextDevices) => {
      devices = nextDevices;
      updateSelectedDevice();
    }, (snapshotError) => {
      console.error("Could not load connected sensor data:", snapshotError);
      setDevice(null);
      setData(null);
      setError(true);
      setLoading(false);
    });
    const unsubscribeSelection = subscribeToActiveDeviceChanges(user.uid, updateSelectedDevice);
    return () => {
      unsubscribeDevices();
      unsubscribeSelection();
    };
  }, [authEnabled, user?.isGuest, user?.uid]);

  useEffect(() => {
    if (!authEnabled || user?.isGuest || !user?.uid || !device?.id) return undefined;
    return subscribeToDeviceReadings(
      user.uid, device.id,
      setHistory,
      (historyError) => console.error("Could not load soil monitoring history:", historyError)
    );
  }, [authEnabled, device?.id, user?.isGuest, user?.uid]);

  const chartData = [...history].reverse().flatMap((record) => {
    const timestamp = record.recordedAt?.toDate?.();
    const value = Number(record[historyMetric]);
    return timestamp && Number.isFinite(value)
      ? [{
        time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        value,
      }]
      : [];
  });

  const isLoading = loading && authEnabled && !user?.isGuest;
  const isDeviceFresh = Boolean(now && isDeviceReadingFresh(device, now));
  const hasData = !isLoading && isDeviceFresh && data !== null;
  const showDeviceError = !authEnabled || user?.isGuest || !device || error || (now > 0 && !isDeviceFresh);
  const deviceStatusMessage = !authEnabled || user?.isGuest
    ? t("Sign in to view connected sensor readings.")
    : error && device
      ? t("Could not load station data. Check your connection and Firestore access.")
      : !device
        ? t("No device found. Add or pair one on the Devices page.")
        : !now
          ? t("Connecting to station...")
        : !isDeviceFresh
          ? t("Device is offline. Live readings are hidden; stored history remains available.")
          : "";

  return (
    <PageTransition className="mx-auto max-w-7xl space-y-8">
      {/* Device status */}
      {showDeviceError && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-600 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-sm">
            <span className="font-bold">{device ? t("Device status:") : t("No selected device:")}</span> {deviceStatusMessage}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {/* Soil Moisture */}
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600">
              <Droplets size={32} />
            </div>
            <span className="text-sm text-slate-500">{t("Soil Moisture")}</span>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {isLoading ? "..." : (hasData ? `${data?.soil_moisture_percent}%` : t("No Data"))}
            </span>
            <span className="text-xs text-slate-400">
              {isLoading ? t("Reading...") : (hasData ? `${t("Raw")}: ${data?.soil_moisture}` : t("Sensor not found"))}
            </span>
          </div>
        </GlassCard>

        {/* LDR (Light Exposure) */}
        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full ${hasData && data?.ldr_state === 0 ? "bg-yellow-100 dark:bg-yellow-950/40 text-yellow-600" : "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600"}`}>
              {hasData && (data?.ldr_state === "day" || data?.ldr_state === 0) ? <Sun size={32} /> : <Moon size={32} />}
            </div>
            <span className="text-sm text-slate-500">{t("Sunlight Exposure")}</span>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {isLoading ? "..." : (hasData ? (data?.ldr_state === "day" || data?.ldr_state === 0 ? t("Daylight") : t("Night")) : t("No Data"))}
            </span>
            <span className="text-xs text-slate-400">{t("LDR Photosensor")}</span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40">
              <Thermometer size={32} />
            </div>
            <span className="text-sm text-slate-500">{t("Temperature")}</span>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {isLoading ? "..." : (hasData && Number.isFinite(data?.temperature) ? `${data.temperature.toFixed(1)}°C` : t("No Data"))}
            </span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-950/40">
              <Droplets size={32} />
            </div>
            <span className="text-sm text-slate-500">{t("Humidity")}</span>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-white">
              {isLoading ? "..." : (hasData && Number.isFinite(data?.humidity) ? `${data.humidity.toFixed(1)}%` : t("No Data"))}
            </span>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40">
              <FlaskConical size={32} />
            </div>
            <span className="text-sm text-slate-500">{t("N / P / K")}</span>
            <span className="text-xl font-extrabold text-slate-800 dark:text-white">
              {isLoading
                ? "..."
                : hasData && [data?.n, data?.p, data?.k].every(Number.isFinite)
                  ? `${data.n} / ${data.p} / ${data.k} mg/kg`
                  : t("No Data")}
            </span>
          </div>
        </GlassCard>
      </div>

      <GlassCard hover={false}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-800 dark:text-white">{t("Cloud sensor history")}</h4>
            <p className="mt-1 text-xs text-slate-500">{t("Five-minute sensor averages; live values update from the device.")}</p>
          </div>
          <select
            value={historyMetric}
            onChange={(event) => setHistoryMetric(event.target.value)}
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
            aria-label={t("Select graph measurement")}
          >
            <option value="moisture">{t("Soil moisture (%)")}</option>
            <option value="temperature">{t("Temperature (°C)")}</option>
            <option value="humidity">{t("Humidity (%)")}</option>
            <option value="n">{t("Nitrogen (N)")}</option>
            <option value="p">{t("Phosphorus (P)")}</option>
            <option value="k">{t("Potassium (K)")}</option>
          </select>
        </div>
        {chartData.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
              <XAxis dataKey="time" stroke="#94a3b8" minTickGap={30} />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Line type="monotone" dataKey="value" name={historyMetric} stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="py-12 text-center text-sm text-slate-500">{t("No cloud sensor readings yet.")}</p>
        )}
      </GlassCard>

      {/* Integration Info / Troubleshooting */}
      <GlassCard hover={false}>
        <h4 className="mb-4 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
          <Wifi size={20} /> {t("Connected device status")}
        </h4>
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex gap-2">
            <AlertCircle size={16} className="shrink-0 text-emerald-500 mt-0.5" />
            {t("Select and manage devices on the Devices page.")}
          </li>
          <li className="flex gap-2">
            <AlertCircle size={16} className="shrink-0 text-emerald-500 mt-0.5" />
            {t("Connected devices send sensor readings securely through the cloud service.")}
          </li>
          <li className="flex gap-2">
            <AlertCircle size={16} className="shrink-0 text-emerald-500 mt-0.5" />
            {t("Live sensor values update every minute; history stores five-minute averages.")}
          </li>
        </ul>
      </GlassCard>
    </PageTransition>
  );
}
