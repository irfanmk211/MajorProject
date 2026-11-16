import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Power,
  PowerOff,
  Waves,
  Gauge,
  History,
  AlertCircle,
  Bell,
  Wifi,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";
import CircularGauge from "../components/ui/CircularGauge";
import { useLanguage } from "../context/languageState";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import {
  getActiveDeviceId,
  isDeviceReadingFresh,
  sendDeviceCommand,
  subscribeToActiveDeviceChanges,
  subscribeToDeviceHistory,
} from "../services/farmerData";
import { registerPushNotifications } from "../services/pushNotifications";

const getDeviceLabel = (item) => (
  item.name && !item.name.startsWith("ESP32 ")
    ? item.name
    : `Irrigation unit ${item.id.slice(-4)}`
);

export default function SmartIrrigation() {
  const { t } = useLanguage();
  const { user, authEnabled } = useAuth();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(() => getActiveDeviceId(user.uid));
  const [readingHistory, setReadingHistory] = useState([]);
  const [historyMetric, setHistoryMetric] = useState("moisture");
  const [durationHours, setDurationHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [unsubscribePush, setUnsubscribePush] = useState(null);
  const [now, setNow] = useState(0);
  const [optimisticPumpState, setOptimisticPumpState] = useState(null);

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
    if (!authEnabled || user?.isGuest) return undefined;
    return onSnapshot(
      collection(db, "users", user.uid, "devices"),
      (snapshot) => {
        setDevices(snapshot.docs.map((device) => ({ id: device.id, ...device.data() })));
        setError("");
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Could not load paired irrigation devices:", snapshotError);
        setError("Paired devices could not be loaded. Check Firestore rules and try again.");
        setLoading(false);
      }
    );
  }, [authEnabled, user.uid, user?.isGuest]);

  useEffect(() => {
    if (!user?.uid) return undefined;
    return subscribeToActiveDeviceChanges(user.uid, () => {
      setSelectedDeviceId(getActiveDeviceId(user.uid));
    });
  }, [user?.uid]);

  const currentDeviceId = devices.some((item) => item.id === selectedDeviceId)
    ? selectedDeviceId
    : devices[0]?.id;
  const device = devices.find((item) => item.id === currentDeviceId);
  const reading = device?.latestReading;
  const autoMode = device?.mode === "automatic";
  const pumpOn = optimisticPumpState !== null
    ? optimisticPumpState === "on"
    : device?.motorState === "on";

  useEffect(() => {
    if (device?.motorState && optimisticPumpState && device.motorState === optimisticPumpState) {
      setOptimisticPumpState(null);
    }
  }, [device?.motorState, optimisticPumpState]);
  const lastSeen = device?.lastSeenAt?.toDate?.();
  const readingAt = reading?.recordedAt?.toDate?.();
  const isConnected = Boolean(now && lastSeen && now - lastSeen.getTime() < 150_000);
  const hasData = Boolean(device && reading && isConnected && isDeviceReadingFresh(device, now));
  const isLoading = loading && authEnabled && !user?.isGuest;
  const displayReading = hasData ? reading : null;
  const soilMoisture = displayReading?.moisture ?? null;
  const chartData = [...readingHistory].reverse().flatMap((record) => {
    const timestamp = record.recordedAt?.toDate?.();
    const value = Number(record[historyMetric]);
    return timestamp && Number.isFinite(value)
      ? [{ time: timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), value }]
      : [];
  });

  const runCommand = async (
    action,
    mode,
    durationMinutes,
    targetDeviceId = device?.id
  ) => {
    if (!targetDeviceId) return;
    setBusy(true);
    setError("");
    setNotice("");
    if (action === "start" || action === "continue") {
      setOptimisticPumpState("on");
    } else if (action === "stop") {
      setOptimisticPumpState("off");
    }
    try {
      await sendDeviceCommand(
        targetDeviceId,
        action,
        mode || (autoMode ? "automatic" : "manual"),
        durationMinutes
      );
      setNotice(action === "start" || action === "continue"
        ? "Motor started. Control command confirmed."
        : "Motor stopped. Control command confirmed.");
    } catch (commandError) {
      setOptimisticPumpState(null);
      console.error("Could not send motor command:", commandError);
      setError(commandError.message || "Could not send the motor command.");
    } finally {
      setBusy(false);
    }
  };

  // Auto-stop monitor: if in automatic mode and moisture reaches 60% or above, automatically stop motor
  useEffect(() => {
    if (autoMode && hasData && soilMoisture !== null && soilMoisture >= 60 && pumpOn && !busy) {
      console.log("Soil moisture reached safe limit (>= 60%). Stopping motor automatically.");
      runCommand("stop", "automatic");
    }
  }, [autoMode, hasData, soilMoisture, pumpOn, busy]);

  const enablePush = async () => {
    setError("");
    try {
      const unsubscribe = await registerPushNotifications();
      setUnsubscribePush(() => unsubscribe);
      setPushEnabled(true);
      setNotice("Push notifications enabled on this browser.");
    } catch (pushError) {
      console.error("Could not enable push notifications:", pushError);
      setError(pushError.message || "Could not enable push notifications.");
    }
  };

  useEffect(() => {
    const handlePushMessage = (event) => {
      const notification = event.detail?.notification;
      if (notification?.body) setNotice(`${notification.title || "AgroSmart alert"}: ${notification.body}`);
    };
    window.addEventListener("agrosmart:push-message", handlePushMessage);
    return () => {
      window.removeEventListener("agrosmart:push-message", handlePushMessage);
      unsubscribePush?.();
    };
  }, [unsubscribePush]);

  useEffect(() => {
    const action = searchParams.get("notificationAction");
    const targetDeviceId = searchParams.get("deviceId");
    if (!action || !["continue", "stop"].includes(action) || !devices.some((item) => item.id === targetDeviceId)) return;
    setSearchParams({}, { replace: true });
    sendDeviceCommand(targetDeviceId, action, "manual").then(
      () => setNotice(action === "continue"
        ? "Continue command sent. The device will confirm its state."
        : "Stop command sent to the device."),
      (commandError) => {
        console.error("Could not apply the notification action:", commandError);
        setError(commandError.message || "Could not apply the notification action.");
      }
    );
  }, [devices, searchParams, setSearchParams]);

  const startManualMotor = () => {
    runCommand("start", "manual", durationHours * 60);
  };

  const formatSensor = (value, suffix = "") => (
    Number.isFinite(value) ? `${Number(value).toFixed(1)}${suffix}` : "—"
  );

  useEffect(() => {
    if (!authEnabled || user?.isGuest || !device?.id) return undefined;
    return subscribeToDeviceHistory(
      user.uid, device.id, device.farmId, device.fieldId,
      setReadingHistory,
      (historyError) => {
        console.error("Could not load sensor history:", historyError);
        setError("Sensor history could not be loaded. Check Firestore rules and try again.");
      }
    );
  }, [authEnabled, device?.fieldId, device?.farmId, device?.id, user.uid, user?.isGuest]);

  useEffect(() => {
    if (location.hash !== "#notification-settings") return;
    const frame = window.requestAnimationFrame(() => {
      const settings = document.getElementById("notification-settings");
      settings?.scrollIntoView({ behavior: "smooth", block: "center" });
      settings?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  return (
    <PageTransition className="mx-auto max-w-7xl space-y-8">
      {error && (
        <div className="flex items-center gap-3 rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-red-600 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0" />
          <div className="text-sm">{error}</div>
        </div>
      )}
      {notice && (
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-700 dark:text-sky-300">
          {notice}
        </div>
      )}

      <GlassCard hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 dark:text-white">
              <Wifi size={20} className={isConnected ? "text-emerald-500" : "text-slate-400"} />
              Selected irrigation device
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading ? "Loading paired devices…" : device
                ? `${getDeviceLabel(device)} · ${device.id} · ${isConnected ? "Connected" : "Offline"}`
                : "No device is selected. Pair or select one on the Devices page."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/devices" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
              <Wifi size={16} /> {device ? "Manage devices" : "Open Devices"}
            </Link>
            <div id="notification-settings" tabIndex={-1} className="rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500">
              <RippleButton onClick={enablePush} disabled={pushEnabled || busy || user?.isGuest} className="flex min-h-11 items-center gap-2">
                <Bell size={16} /> {pushEnabled ? "Notifications enabled" : "Enable notifications"}
              </RippleButton>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard>
          <CircularGauge value={soilMoisture ?? "—"} unit={soilMoisture !== null ? "%" : ""} label={t("Soil Moisture")} />
          {!hasData && <p className="mt-2 text-center text-xs text-slate-500">Waiting for device telemetry.</p>}
        </GlassCard>
        {[
          ["Temperature", formatSensor(displayReading?.temperature, " °C")],
          ["Humidity", formatSensor(displayReading?.humidity, " %")],
          ["N / P / K", `${formatSensor(displayReading?.n)} / ${formatSensor(displayReading?.p)} / ${formatSensor(displayReading?.k)}`],
        ].map(([label, value]) => (
          <GlassCard key={label}>
            <div className="flex h-full flex-col items-center justify-center gap-3 py-4">
              <Gauge size={28} className="text-sky-500" />
              <span className="font-bold text-slate-800 dark:text-white">{value}</span>
              <span className="text-center text-xs text-slate-500">{t(label)}</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard hover={false} className="relative overflow-hidden">
        <div className="mb-5 flex items-center justify-between">
          <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
            <Waves className="text-sky-500" /> {t("Irrigation Pipeline Status")}
          </h4>
          <span className={`text-sm font-semibold ${pumpOn ? "text-emerald-500 font-bold" : (hasData ? "text-slate-500" : "text-amber-500")}`}>
            {pumpOn
              ? (optimisticPumpState === "on" && device?.motorState !== "on" ? "Relay command: ON (Starting...)" : "Relay command: ON")
              : (optimisticPumpState === "off" && device?.motorState === "on" ? "Relay command: OFF (Stopping...)" : (hasData ? "Relay command: OFF" : "No recent telemetry"))}
          </span>
        </div>
        <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
          <p>Mode: <strong>{hasData ? (autoMode ? "Automatic" : "Manual") : "—"}</strong></p>
          <p>Light: <strong>{displayReading?.ldr === "day" ? "Day" : displayReading?.ldr === "night" ? "Night" : formatSensor(displayReading?.ldr)}</strong></p>
          <p>Last telemetry: <strong>{readingAt ? readingAt.toLocaleString() : "—"}</strong></p>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          This is the ESP32 relay command, not verified pump feedback; no motor/flow sensor is connected.
        </p>
      </GlassCard>

      <GlassCard hover={false}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
              <History size={20} className="text-sky-500" /> Sensor history
            </h4>
            <p className="mt-1 text-xs text-slate-500">Five-sample averages from the selected device; live values come from its latest report.</p>
          </div>
          <select
            value={historyMetric}
            onChange={(event) => setHistoryMetric(event.target.value)}
            className="rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
            aria-label="Select graph measurement"
          >
            <option value="moisture">Soil moisture (%)</option>
            <option value="temperature">Temperature (°C)</option>
            <option value="humidity">Humidity (%)</option>
            <option value="n">Nitrogen (N)</option>
            <option value="p">Phosphorus (P)</option>
            <option value="k">Potassium (K)</option>
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
          <p className="py-12 text-center text-sm text-slate-500">
            {device ? "No stored history is available for this device yet." : "Pair a device to see its sensor graph."}
          </p>
        )}
        {readingHistory.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Recorded</th>
                  <th className="px-3 py-2">Moisture</th>
                  <th className="px-3 py-2">Temp</th>
                  <th className="px-3 py-2">Humidity</th>
                  <th className="px-3 py-2">N / P / K</th>
                </tr>
              </thead>
              <tbody>
                {readingHistory.slice(0, 20).map((record) => (
                  <tr key={record.id} className="border-t border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300">
                    <td className="px-3 py-2">{record.recordedAt?.toDate?.().toLocaleString() || "—"}</td>
                    <td className="px-3 py-2">{formatSensor(record.moisture, "%")}</td>
                    <td className="px-3 py-2">{formatSensor(record.temperature, "°C")}</td>
                    <td className="px-3 py-2">{formatSensor(record.humidity, "%")}</td>
                    <td className="px-3 py-2">{formatSensor(record.n)} / {formatSensor(record.p)} / {formatSensor(record.k)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <GlassCard hover={false}>
        <h4 className="mb-4 font-bold text-slate-800 dark:text-white">Motor control</h4>
        <div className="mb-4 flex flex-wrap gap-3">
          <RippleButton
            variant={autoMode ? "secondary" : "outline"}
            disabled={!device || !isConnected || busy || autoMode}
            onClick={() => runCommand("mode", "automatic")}
          >
            Enable automatic (30% on / 60% off)
          </RippleButton>
          <RippleButton
            variant={!autoMode ? "secondary" : "outline"}
            disabled={!device || !isConnected || busy || !autoMode}
            onClick={() => runCommand("mode", "manual")}
          >
            Enable manual
          </RippleButton>
        </div>
        {!autoMode && (
          <label className="mb-4 flex max-w-xs flex-col gap-1 text-sm text-slate-600 dark:text-slate-300">
            Manual run duration (hours)
            <input
              type="number"
              min="1"
              max="24"
              step="1"
              value={durationHours}
              onChange={(event) => setDurationHours(Math.max(1, Math.min(24, Number(event.target.value) || 1)))}
              className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
            />
          </label>
        )}
        <div className="flex flex-wrap gap-3">
          <RippleButton
            onClick={startManualMotor}
            disabled={!hasData || busy || autoMode || pumpOn}
            className="flex items-center gap-2"
          >
            <Power size={18} /> Start motor for {durationHours} hour(s)
          </RippleButton>
          <RippleButton
            variant="danger"
            onClick={() => runCommand("stop", "manual")}
            disabled={!device || busy}
            className="flex items-center gap-2"
          >
            <PowerOff size={18} /> Stop motor
          </RippleButton>
        </div>
      </GlassCard>

    </PageTransition>
  );
}
