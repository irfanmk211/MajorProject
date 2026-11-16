import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Check, Copy, Pencil, Plus, Radio, Trash2, Wifi } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import GlassCard from "../components/ui/GlassCard";
import PageTransition from "../components/ui/PageTransition";
import RippleButton from "../components/ui/RippleButton";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/languageState";
import { db } from "../firebase";
import {
  createDevicePairCode,
  deleteDevice,
  getActiveDeviceId,
  isDeviceReadingFresh,
  listFarms,
  listFields,
  setActiveDevice,
  updateDeviceDetails,
} from "../services/farmerData";

const labelForDevice = (device) => (
  device.name && !device.name.startsWith("ESP32 ")
    ? device.name
    : `Irrigation unit ${device.id.slice(-4)}`
);

function getAssignment(device) {
  return device.farmId && device.fieldId
    ? JSON.stringify([device.farmId, device.fieldId])
    : "";
}

export default function Devices() {
  const { t } = useLanguage();
  const { user, authEnabled } = useAuth();
  const [devices, setDevices] = useState([]);
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [activeDeviceId, setActiveDeviceId] = useState(() => getActiveDeviceId(user.uid));
  const [pairingAssignment, setPairingAssignment] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingExpiresAt, setPairingExpiresAt] = useState(0);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const fieldOptions = useMemo(() => fields.map((field) => ({
    key: JSON.stringify([field.farmId, field.id]),
    farmId: field.farmId,
    fieldId: field.id,
    label: `${field.farmName || t("Farm")} · ${field.name || t("Field")}`,
  })), [fields, t]);

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
    if (!authEnabled || user?.isGuest || !user?.uid) {
      return undefined;
    }

    return onSnapshot(
      collection(db, "users", user.uid, "devices"),
      (snapshot) => {
        const nextDevices = snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
        setDevices(nextDevices);
        setActiveDeviceId((current) => (
          nextDevices.some((device) => device.id === current)
            ? current
            : nextDevices[0]?.id || ""
        ));
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        console.error("Could not load devices:", snapshotError);
        setError(t("Devices could not be loaded. Check Firestore access and try again."));
        setLoading(false);
      }
    );
  }, [authEnabled, t, user?.isGuest, user?.uid]);

  useEffect(() => {
    if (!authEnabled || user?.isGuest || !user?.uid) return undefined;
    let active = true;

    async function loadFields() {
      try {
        const savedFarms = await listFarms(user.uid);
        const savedFields = (await Promise.all(
          savedFarms.map(async (farm) => (
            (await listFields(user.uid, farm.id)).map((field) => ({
              ...field,
              farmName: farm.name,
            }))
          ))
        )).flat();
        if (active) {
          setFarms(savedFarms);
          setFields(savedFields);
        }
      } catch (loadError) {
        console.error("Could not load farm fields for device assignment:", loadError);
        if (active) setError(t("Farm and field options could not be loaded."));
      }
    }

    loadFields();
    return () => {
      active = false;
    };
  }, [authEnabled, t, user?.isGuest, user?.uid]);

  const startPairing = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const assignment = pairingAssignment ? JSON.parse(pairingAssignment) : null;
      const selectedField = assignment
        ? fieldOptions.find((field) => field.farmId === assignment[0] && field.fieldId === assignment[1])
        : null;
      if (pairingAssignment && !selectedField) {
        throw new Error(t("Select a valid farm field or leave the device unassigned."));
      }
      const result = await createDevicePairCode(selectedField?.farmId, selectedField?.fieldId);
      setPairingCode(result.pairingCode);
      setPairingExpiresAt(Date.now() + result.expiresInSeconds * 1000);
      setNotice(t("Enter this one-time code in the ESP32 setup portal. It expires in 10 minutes."));
    } catch (pairingError) {
      console.error("Could not create a device pairing code:", pairingError);
      setError(pairingError.message || t("Could not create a device pairing code."));
    } finally {
      setBusy(false);
    }
  };

  const saveDevice = async (event, device) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.namedItem("device-name").value;
    const assignmentValue = form.elements.namedItem("device-field").value;
    let assignment;
    try {
      assignment = assignmentValue ? JSON.parse(assignmentValue) : null;
    } catch (parseError) {
      console.error("Could not read the selected device field:", parseError);
      setError(t("Select a valid farm field or leave the device unassigned."));
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      await updateDeviceDetails(
        device.id,
        name,
        assignment?.[0] || "",
        assignment?.[1] || ""
      );
      setNotice(t("Device details saved."));
    } catch (saveError) {
      console.error("Could not save device details:", saveError);
      setError(saveError.message || t("Could not save device details."));
    } finally {
      setBusy(false);
    }
  };

  const removeDevice = async (device) => {
    if (device.motorState === "on") return;
    if (!window.confirm(`${t("Remove")} ${labelForDevice(device)}?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteDevice(device.id);
      if (activeDeviceId === device.id) {
        setActiveDeviceId("");
        setActiveDevice(user.uid, "");
      }
      setNotice(t("Device removed."));
    } catch (deleteError) {
      console.error("Could not remove device:", deleteError);
      setError(deleteError.message || t("Could not remove device."));
    } finally {
      setBusy(false);
    }
  };

  const selectDevice = (deviceId) => {
    setActiveDeviceId(deviceId);
    setActiveDevice(user.uid, deviceId);
    setNotice(t("Selected device updated across monitoring pages."));
  };

  const isLoading = loading && authEnabled && !user?.isGuest;

  return (
    <PageTransition className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 to-emerald-800 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-start gap-3">
          <Radio size={28} className="mt-1 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold">{t("Devices")}</h1>
            <p className="mt-2 max-w-3xl text-sm text-emerald-50">
              {t("Select a device to use its live readings across Soil Monitoring, Weather, Crop Recommendation, and Smart Irrigation.")}
            </p>
            <p className="mt-2 text-xs text-emerald-100">
              {t("ESP32 readings update live each minute. Sensor history stores five-minute averages.")}
            </p>
          </div>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-sky-500/10 p-4 text-sm text-sky-700 dark:text-sky-300">{notice}</p>}

      {!authEnabled || user?.isGuest ? (
        <GlassCard hover={false}>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("Sign in to manage connected devices.")}</p>
        </GlassCard>
      ) : (
        <>
          <GlassCard hover={false}>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t("Pair a device")}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("Farm assignment is optional. Unassigned devices still send live readings and can be assigned later.")}
              </p>
            </div>
            {!farms.length && (
              <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">
                {t("No farm or field yet.")} <Link to="/farms" className="underline">{t("Create one")}</Link> {t("or pair without an assignment.")}
              </p>
            )}
            <form onSubmit={startPairing} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("Assign to farm / field (optional)")}
                <select
                  value={pairingAssignment}
                  onChange={(event) => setPairingAssignment(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                >
                  <option value="">{t("No field assignment")}</option>
                  {fieldOptions.map((field) => (
                    <option key={field.key} value={field.key}>{field.label}</option>
                  ))}
                </select>
              </label>
              <RippleButton type="submit" disabled={busy || isLoading} className="flex min-h-11 items-center justify-center gap-2">
                <Plus size={16} /> {t("Generate pairing code")}
              </RippleButton>
            </form>
            {pairingCode && (
              <div className="mt-4 rounded-xl bg-slate-100 p-4 dark:bg-slate-800">
                <p className="text-sm">{t("One-time pairing code")}
                  <span className="ml-2 font-mono text-lg font-bold tracking-widest">{pairingCode}</span>
                </p>
                <button
                  type="button"
                  className="mt-2 flex min-h-11 items-center gap-2 text-sm text-sky-700 dark:text-sky-300"
                  onClick={() => navigator.clipboard.writeText(pairingCode).then(
                    () => setNotice(t("Pairing code copied.")),
                    (copyError) => {
                      console.error("Could not copy the pairing code:", copyError);
                      setError(t("Could not copy the pairing code. Select and copy it manually."));
                    }
                  )}
                >
                  <Copy size={15} /> {t("Copy code")}
                </button>
                <p className="mt-1 text-xs text-slate-500">
                  {pairingExpiresAt > now
                    ? `${t("Valid for about")} ${Math.ceil((pairingExpiresAt - now) / 60_000)} ${t("more minute(s).")}`
                    : t("This code may have expired; generate a new one if pairing fails.")}
                </p>
              </div>
            )}
          </GlassCard>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{t("Your devices")}</h2>
              <Link to="/irrigation" className="text-sm font-semibold text-emerald-700 underline dark:text-emerald-300">
                {t("Open motor controls")}
              </Link>
            </div>

            {isLoading ? (
              <GlassCard hover={false}><p className="text-sm text-slate-500">{t("Loading devices...")}</p></GlassCard>
            ) : devices.length === 0 ? (
              <GlassCard hover={false}><p className="text-sm text-slate-500">{t("No devices paired yet.")}</p></GlassCard>
            ) : devices.map((device) => {
              const lastSeen = device.lastSeenAt?.toDate?.();
              const isOnline = Boolean(
                lastSeen
                && now - lastSeen.getTime() < 150_000
                && isDeviceReadingFresh(device, now)
              );
              const readingIsLive = isOnline;
              const reading = readingIsLive ? device.latestReading : {};
              const selected = activeDeviceId === device.id;

              return (
                <GlassCard key={device.id} hover={false} className={selected ? "border border-emerald-500/50" : ""}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                        <Wifi size={18} className={isOnline ? "text-emerald-500" : "text-slate-400"} />
                        {labelForDevice(device)}
                      </h3>
                      <p className="mt-1 break-all text-xs text-slate-500">{device.id}</p>
                      <p className={`mt-1 text-sm font-semibold ${isOnline ? "text-emerald-600" : "text-amber-600"}`}>
                        {isOnline ? t("Connected") : t("Offline")}
                        {device.latestReading?.recordedAt?.toDate?.()
                          ? ` · ${t("Last report:")} ${device.latestReading.recordedAt.toDate().toLocaleString()}`
                          : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {device.farmId && device.fieldId
                          ? `${t("Assigned to")}: ${fieldOptions.find((field) => field.farmId === device.farmId && field.fieldId === device.fieldId)?.label || t("Farm field")}`
                          : t("No farm field assignment")}
                      </p>
                    </div>
                    <RippleButton
                      type="button"
                      variant={selected ? "secondary" : "outline"}
                      onClick={() => selectDevice(device.id)}
                      className="flex min-h-11 items-center gap-2 px-4 py-2"
                    >
                      <Check size={16} /> {selected ? t("Selected device") : t("Use this device")}
                    </RippleButton>
                  </div>

                  {readingIsLive ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        [t("Soil Moisture"), reading.moisture, "%"],
                        [t("Temperature"), reading.temperature, "°C"],
                        [t("Humidity"), reading.humidity, "%"],
                        [t("N / P / K"), [reading.n, reading.p, reading.k].every(Number.isFinite)
                          ? `${reading.n} / ${reading.p} / ${reading.k}`
                          : "—", ""],
                      ].map(([label, value, unit]) => (
                        <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                          <p className="text-xs text-slate-500">{label}</p>
                          <p className="mt-1 font-bold text-slate-800 dark:text-white">
                            {Number.isFinite(value) ? `${Number(value).toFixed(1)}${unit}` : value}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-500 dark:bg-slate-800/70">
                      {t("Live sensor values appear when this device is online. View stored history on")}{" "}
                      <Link to="/soil" className="font-semibold underline">{t("Soil Monitoring")}</Link>{" "}
                      {t("or")}{" "}
                      <Link to="/irrigation" className="font-semibold underline">{t("Smart Irrigation")}</Link>.
                    </p>
                  )}

                  <form
                    key={`${device.id}-${device.name}-${device.farmId || ""}-${device.fieldId || ""}`}
                    onSubmit={(event) => saveDevice(event, device)}
                    className="mt-4 grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-700 sm:grid-cols-2"
                  >
                    <label className="text-xs font-semibold text-slate-500">
                      {t("Device name")}
                      <input
                        name="device-name"
                        defaultValue={labelForDevice(device)}
                        maxLength={64}
                        required
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:text-white"
                      />
                    </label>
                    <label className="text-xs font-semibold text-slate-500">
                      {t("Farm / field")}
                      <select
                        name="device-field"
                        defaultValue={getAssignment(device)}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="">{t("No field assignment")}</option>
                        {fieldOptions.map((field) => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      <RippleButton type="submit" disabled={busy || device.motorState === "on"} className="flex min-h-11 items-center gap-2 px-4 py-2">
                        <Pencil size={15} /> {t("Save device")}
                      </RippleButton>
                      <RippleButton
                        type="button"
                        variant="danger"
                        onClick={() => removeDevice(device)}
                        disabled={busy || device.motorState === "on"}
                        className="flex min-h-11 items-center gap-2 px-4 py-2"
                      >
                        <Trash2 size={15} /> {t("Remove device")}
                      </RippleButton>
                      {device.motorState === "on" && (
                        <span className="self-center text-xs text-amber-600">
                          {t("Stop the motor before changing or removing this device.")}
                        </span>
                      )}
                    </div>
                  </form>
                </GlassCard>
              );
            })}
          </section>

          <GlassCard hover={false}>
            <h3 className="mb-2 flex items-center gap-2 font-bold text-slate-800 dark:text-white">
              <Activity size={18} /> {t("How device readings update")}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {t("The selected device's latest ESP32 sample updates this page and the monitoring pages each minute. The server stores one averaged history record after five periodic samples; event updates refresh the live values but do not enter the average.")}
            </p>
          </GlassCard>
        </>
      )}
    </PageTransition>
  );
}
