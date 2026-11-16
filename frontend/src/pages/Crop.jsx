
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Thermometer,
  Droplets,
  CloudRain,
  Gauge,
  Sparkles,
  Trophy,
  Medal,
  Award,
  History,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";

import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase";

import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";
import { getCropImage, getCropImagePlaceholder } from "../data/cropImages";
import { API_BASE_URL } from "../config";
import { useLanguage } from "../context/languageState";
import { useAuth } from "../context/AuthContext";
import {
  getActiveUserDevice,
  isDeviceReadingFresh,
  saveCropPredictionHistory,
} from "../services/farmerData";
import { getDistrictAnnualRainfall } from "../data/districtAnnualRainfall";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const fields = [
  { name: "N", label: "Nitrogen", icon: FlaskConical, min: 0, max: 140, default: 90, unit: "mg/kg" },
  { name: "P", label: "Phosphorus", icon: FlaskConical, min: 0, max: 145, default: 42, unit: "mg/kg" },
  { name: "K", label: "Potassium", icon: FlaskConical, min: 0, max: 205, default: 43, unit: "mg/kg" },
  { name: "temperature", label: "Temperature", icon: Thermometer, min: 8, max: 44, default: 25, unit: "°C" },
  { name: "humidity", label: "Humidity", icon: Droplets, min: 14, max: 100, default: 80, unit: "%" },
  { name: "ph", label: "pH Level", icon: Gauge, min: 3.5, max: 10, default: 6.5, unit: "", step: 0.1 },
  { name: "rainfall", label: "Rainfall", icon: CloudRain, min: 20, max: 300, default: 200, unit: "mm" },
];

const rankIcons = [Trophy, Medal, Award];
const cropRequestKey = "agrosmart_voice_crop_request";
const cropValuesKey = "agrosmart_voice_crop_values";

function readVoiceCropRequest() {
  try {
    const raw = sessionStorage.getItem(cropRequestKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readSavedCropValues() {
  try {
    return JSON.parse(sessionStorage.getItem(cropValuesKey) || "{}");
  } catch {
    return {};
  }
}

export default function Crop() {
  const { t } = useLanguage();
  const { user, authEnabled } = useAuth();
  const districtAnnualRainfall = getDistrictAnnualRainfall(user?.state, user?.district);

  const [voiceRequest] = useState(readVoiceCropRequest);

  const [input, setInput] = useState(() => ({
    ...Object.fromEntries(fields.map((f) => [f.name, f.default])),
    ...readSavedCropValues(),
    ...(voiceRequest?.values || {}),
  }));

  const inputRef = useRef(input);
  const [results, setResults] = useState(() => voiceRequest?.results || []);
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [editingPredictionId, setEditingPredictionId] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [sensorFillLoading, setSensorFillLoading] = useState(false);
  const [sensorFillStatus, setSensorFillStatus] = useState("");

  useEffect(() => {
    if (!authEnabled || !user?.uid || user?.isGuest) return undefined;
    const historyQuery = query(
      collection(db, "users", user.uid, "crop_predictions"),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    return onSnapshot(historyQuery, (snapshot) => {
      setPredictionHistory(snapshot.docs.map((entry) => ({ id: entry.id, ...entry.data() })));
      setHistoryError("");
    }, (error) => {
      console.error("Could not load crop prediction history:", error);
      setHistoryError("Crop prediction history could not be loaded. Check Firestore rules.");
    });
  }, [authEnabled, user?.isGuest, user?.uid]);

  useEffect(() => {
    const applyVoiceResult = (event) => {
      const { values = {}, results: voiceResults } = event.detail || {};
      const nextInput = { ...inputRef.current, ...values };

      inputRef.current = nextInput;
      setInput(nextInput);

      sessionStorage.setItem(cropValuesKey, JSON.stringify(nextInput));

      if (Array.isArray(voiceResults)) {
        setResults(voiceResults);
      }
    };

    sessionStorage.removeItem(cropRequestKey);

    window.addEventListener("agrosmart:voice-crop-result", applyVoiceResult);

    return () => {
      window.removeEventListener("agrosmart:voice-crop-result", applyVoiceResult);
    };
  }, []);

  const predict = async (e) => {
    e.preventDefault();

    setLoading(true);
    setResults([]);
    setSaveStatus("");

    try {
      const values = fields.map((f) => Number(input[f.name]));

      const response = await fetch(`${API_BASE_URL}/predict-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: values }),
      });

      const data = await response.json();

      const predictions = Array.isArray(data) ? data : data.value;

      if (!response.ok || data.error || !Array.isArray(predictions)) {
        alert(data.error || t("Crop prediction response was invalid."));
      } else {
        setResults(predictions);

        try {
          await saveCropPredictionHistory(input, predictions);
          setSaveStatus("Crop prediction saved successfully in Firebase.");
        } catch (firebaseError) {
          console.error("Firebase crop saving error:", firebaseError);
          setSaveStatus(
            "Prediction completed, but Firebase saving failed. Please check your login and Firestore rules."
          );
        }
      }
    } catch (error) {
      console.error("Crop prediction error:", error);
      alert(t("Backend not connected. Start Flask server on port 5000."));
    }

    setLoading(false);
  };

  const loadLatestSensorValues = async () => {
    setSensorFillStatus("");
    if (!authEnabled || !user?.uid || user?.isGuest) {
      setSensorFillStatus(t("Sign in to load connected sensor values."));
      return;
    }

    setSensorFillLoading(true);
    try {
      const device = await getActiveUserDevice(user.uid);
      if (!device) {
        setSensorFillStatus(t("No device found. Add or pair one on the Devices page."));
        return;
      }
      if (!isDeviceReadingFresh(device, Date.now())) {
        setSensorFillStatus(t("Device is offline. Live readings are hidden; stored history remains available."));
        return;
      }

      const reading = device.latestReading;
      if (!reading) {
        setSensorFillStatus(t("The paired device has not sent sensor readings yet."));
        return;
      }

      const sensorFields = [
        ["N", "n"],
        ["P", "p"],
        ["K", "k"],
        ["temperature", "temperature"],
        ["humidity", "humidity"],
      ];
      const nextValues = {};
      const skipped = [];
      for (const [fieldName, readingKey] of sensorFields) {
        const rawValue = reading[readingKey];
        if (rawValue === null || rawValue === undefined || rawValue === "") continue;

        const value = Number(rawValue);
        const field = fields.find((item) => item.name === fieldName);
        if (!Number.isFinite(value) || value < field.min || value > field.max) {
          skipped.push(fieldName);
          continue;
        }
        nextValues[fieldName] = value;
      }

      if (!Object.keys(nextValues).length) {
        setSensorFillStatus(skipped.length
          ? `${t("No sensor values were within the crop model input ranges.")} ${t("Skipped")}: ${skipped.join(", ")}.`
          : t("The latest device report contains no supported crop input values."));
        return;
      }

      const nextInput = { ...inputRef.current, ...nextValues };
      inputRef.current = nextInput;
      setInput(nextInput);
      sessionStorage.setItem(cropValuesKey, JSON.stringify(nextInput));

      const lastSeen = device.lastSeenAt?.toDate?.();
      const timestamp = lastSeen
        ? ` · ${t("Last sensor update")}: ${lastSeen.toLocaleString()}`
        : "";
      const skippedMessage = skipped.length
        ? ` · ${t("Skipped out-of-range values")}: ${skipped.join(", ")}`
        : "";
      setSensorFillStatus(
        `${t("Loaded sensor values")}: ${Object.keys(nextValues).join(", ")}${timestamp}${skippedMessage}`
      );
    } catch (error) {
      console.error("Could not load the latest sensor values:", error);
      setSensorFillStatus(error.message || t("Could not load connected sensor values."));
    } finally {
      setSensorFillLoading(false);
    }
  };

  const savePredictionNote = async (event, predictionId) => {
    event.preventDefault();
    try {
      await updateDoc(doc(db, "users", user.uid, "crop_predictions", predictionId), {
        notes: noteDraft.trim(),
      });
      setEditingPredictionId("");
      setNoteDraft("");
    } catch (error) {
      console.error("Could not update crop prediction note:", error);
      setHistoryError("The note could not be updated. Please try again.");
    }
  };

  const removePrediction = async (predictionId) => {
    if (!window.confirm("Delete this crop prediction from history?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "crop_predictions", predictionId));
    } catch (error) {
      console.error("Could not delete crop prediction:", error);
      setHistoryError("The prediction could not be deleted. Please try again.");
    }
  };

  return (
    <PageTransition className="mx-auto max-w-6xl space-y-8">
      <GlassCard hover={false}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-agri-500 to-emerald-600 p-3 text-white">
              <Sparkles size={24} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                {t("Crop Recommendation")}
              </h3>
              <p className="text-sm text-slate-500">
                {t("Enter soil & climate parameters for AI prediction")}
              </p>
            </div>
          </div>
          <RippleButton
            type="button"
            variant="outline"
            disabled={sensorFillLoading || !authEnabled || user?.isGuest}
            onClick={loadLatestSensorValues}
            className="flex items-center gap-2 px-4 py-2"
          >
            <RefreshCw size={16} className={sensorFillLoading ? "animate-spin" : ""} />
            {sensorFillLoading ? t("Loading latest sensor values...") : t("Load latest sensor values")}
          </RippleButton>
        </div>
        {sensorFillStatus && (
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
            {sensorFillStatus}
          </p>
        )}

        <form onSubmit={predict}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field, i) => (
              <motion.div
                key={field.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200/50 dark:border-white/10 bg-white/50 dark:bg-white/5 p-4"
              >
                <div className="mb-3 flex items-center gap-2">
                  <field.icon size={18} className="text-agri-500" />

                  <span className="font-semibold text-slate-700 dark:text-white">
                    {t(field.label)}
                  </span>

                  <span className="ml-auto text-sm font-bold text-agri-600">
                    {input[field.name]}{field.unit}
                  </span>
                </div>

                <input
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step || 1}
                  value={input[field.name]}
                  onChange={(e) => {
                    const nextInput = {
                      ...input,
                      [field.name]: e.target.value,
                    };

                    inputRef.current = nextInput;
                    setInput(nextInput);

                    sessionStorage.setItem(
                      cropValuesKey,
                      JSON.stringify(nextInput)
                    );
                  }}
                  className="w-full accent-agri-500"
                />

                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>{field.min}</span>
                  <span>{field.max}</span>
                </div>
                {field.name === "rainfall" && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {districtAnnualRainfall != null
                      ? `${t("District normal annual rainfall")}: ${districtAnnualRainfall.toLocaleString()} mm. ${t("Annual totals are reference only; the prediction input is limited to 20–300 mm.")}`
                      : t("The prediction rainfall input is limited to 20–300 mm. Annual district rainfall is reference only.")}
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <RippleButton
              type="submit"
              disabled={loading}
              className="px-10"
            >
              {loading ? t("Analyzing...") : t("Predict Best Crops")}
            </RippleButton>
          </div>
        </form>
      </GlassCard>

      {saveStatus && (
        <p className="text-center text-sm font-medium text-agri-600">
          {saveStatus}
        </p>
      )}

      {authEnabled && !user?.isGuest && (
        <GlassCard hover={false}>
          <div className="mb-4 flex items-center gap-2">
            <History className="text-agri-600" size={20} />
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {t("Crop prediction history")}
            </h3>
          </div>
          {historyError && <p role="alert" className="mb-3 text-sm text-red-600">{historyError}</p>}
          {predictionHistory.length === 0 ? (
            <p className="text-sm text-slate-500">{t("Your saved crop predictions will appear here.")}</p>
          ) : (
            <div className="space-y-3">
              {predictionHistory.map((entry) => {
                const timestamp = entry.createdAt?.toDate?.();
                return (
                  <article key={entry.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800 dark:text-white">
                          {entry.predictions?.slice(0, 3).map((item) => `${item.rank}. ${item.crop} (${item.probability}%)`).join(" · ")}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {timestamp ? timestamp.toLocaleString() : t("Saving…")}
                          {entry.input && ` · N ${entry.input.N}, P ${entry.input.P}, K ${entry.input.K}, pH ${entry.input.ph}`}
                        </p>
                        {entry.notes && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{entry.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800"
                          aria-label={t("Edit prediction note")}
                          onClick={() => {
                            setEditingPredictionId(entry.id);
                            setNoteDraft(entry.notes || "");
                          }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50 dark:hover:bg-slate-800"
                          aria-label={t("Delete crop prediction")}
                          onClick={() => removePrediction(entry.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {editingPredictionId === entry.id && (
                      <form onSubmit={(event) => savePredictionNote(event, entry.id)} className="mt-3 flex flex-wrap gap-2">
                        <input
                          aria-label={t("Prediction note")}
                          maxLength={500}
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600"
                          placeholder={t("Add a note")}
                        />
                        <button type="submit" className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">{t("Save")}</button>
                        <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setEditingPredictionId("")}>{t("Cancel")}</button>
                      </form>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {results.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">
            {t("Top 5 Recommendations")}
          </h3>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((item, i) => {
              const RankIcon = rankIcons[Math.min(i, 2)];

              return (
                <GlassCard key={i} delay={i * 0.1}>
                  <div className="relative mb-4 overflow-hidden rounded-xl">
                    <img
                      src={getCropImage(item.crop)}
                      alt={item.crop}
                      onError={(e) => {
                        e.currentTarget.src = getCropImagePlaceholder();
                      }}
                      className="h-40 w-full object-cover bg-slate-100 dark:bg-slate-800"
                    />

                    {i < 3 && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-yellow-400">
                        <RankIcon size={14} /> {t("Rank")} {i + 1}
                      </div>
                    )}
                  </div>

                  <h4 className="text-lg font-bold capitalize text-slate-800 dark:text-white">
                    {t(item.crop)}
                  </h4>

                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-500">
                        {t("Confidence")}
                      </span>

                      <span className="font-bold text-agri-600">
                        {item.prob}%
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.prob}%` }}
                        transition={{ duration: 1, delay: i * 0.15 }}
                        className="h-full rounded-full bg-gradient-to-r from-agri-500 to-sky-500"
                      />
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <GlassCard hover={false}>
            <h4 className="mb-4 font-bold text-slate-800 dark:text-white">
              {t("Probability Chart")}
            </h4>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={results.map((r) => ({
                  name: r.crop,
                  prob: r.prob,
                }))}
              >
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip />
                <Bar
                  dataKey="prob"
                  fill="#22c55e"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </motion.div>
      )}
    </PageTransition>
  );
}
