import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  CloudRain,
  Wind,
  Droplets,
  Thermometer,
  Sunrise,
  Sunset,
  Cloud,
  Loader2,
  AlertTriangle,
  Wifi,
  Moon,
  AlertCircle
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import PageTransition from "../components/ui/PageTransition";
import { useAuth } from "../context/AuthContext";
import { ESP32_IP } from "../config";

const LOCATIONS = {
  "Karnataka, India": { latitude: 12.9716, longitude: 77.5946 },
  "Maharashtra, India": { latitude: 19.076, longitude: 72.8777 },
  "Punjab, India": { latitude: 30.901, longitude: 75.8573 },
  "Tamil Nadu, India": { latitude: 11.1271, longitude: 78.6569 },
};

const weatherIcons = {
  0: Sun,
  1: Sun,
  2: Cloud,
  3: Cloud,
  61: CloudRain,
  63: CloudRain,
  65: CloudRain,
  80: CloudRain,
  95: CloudRain,
};

function pickIcon(code) {
  if (weatherIcons[code]) return weatherIcons[code];
  if (code >= 51 && code <= 67) return CloudRain;
  if (code >= 80) return CloudRain;
  return Cloud;
}

export default function Weather() {
  const { user } = useAuth();
  const locationLabel = user?.location || "Karnataka, India";
  const coords = LOCATIONS[locationLabel] || LOCATIONS["Karnataka, India"];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [weather, setWeather] = useState(null);

  // ESP32 Local Station Readings State
  const [localReadings, setLocalReadings] = useState(null);
  const [localError, setLocalError] = useState(false);

  // Poll ESP32 local sensor data
  useEffect(() => {
    let active = true;

    const fetchLocalData = async () => {
      try {
        const response = await fetch(`http://${ESP32_IP}/api/data`);
        if (!response.ok) throw new Error("Offline");
        const json = await response.json();
        if (active) {
          setLocalReadings(json);
          setLocalError(false);
        }
      } catch (err) {
        if (active) {
          setLocalError(true);
          setLocalReadings(null); // Clear local readings when offline
        }
      }
    };

    fetchLocalData();
    const interval = setInterval(fetchLocalData, 5000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch Open-Meteo Weather Forecast
  useEffect(() => {
    let cancelled = false;

    async function loadWeather() {
      setLoading(true);
      setError(null);

      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", coords.latitude);
        url.searchParams.set("longitude", coords.longitude);
        url.searchParams.set(
          "current",
          "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code"
        );
        url.searchParams.set(
          "daily",
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max"
        );
        url.searchParams.set("timezone", "auto");
        url.searchParams.set("forecast_days", "7");

        const response = await fetch(url);
        if (!response.ok) throw new Error("Weather service unavailable");

        const data = await response.json();
        if (!cancelled) setWeather(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load weather");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [coords.latitude, coords.longitude]);

  const formatTime = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <PageTransition className="mx-auto max-w-7xl flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={28} />
          Loading forecast for {locationLabel}...
        </div>
      </PageTransition>
    );
  }

  if (error || !weather) {
    return (
      <PageTransition className="mx-auto max-w-7xl">
        <GlassCard hover={false}>
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle size={24} />
            <p>{error || "Unable to load weather data."}</p>
          </div>
        </GlassCard>
      </PageTransition>
    );
  }

  const { current, daily } = weather;
  const CurrentIcon = pickIcon(current.weather_code);

  const metrics = [
    { label: "Temperature", value: `${Math.round(current.temperature_2m)}°C`, icon: Thermometer, color: "text-orange-500" },
    { label: "Humidity", value: `${current.relative_humidity_2m}%`, icon: Droplets, color: "text-sky-500" },
    { label: "Precipitation", value: `${current.precipitation} mm`, icon: CloudRain, color: "text-blue-500" },
    { label: "Wind Speed", value: `${Math.round(current.wind_speed_10m)} km/h`, icon: Wind, color: "text-slate-500" },
    { label: "UV Index", value: daily.uv_index_max?.[0] ?? "—", icon: Sun, color: "text-yellow-500" },
    { label: "Sunrise", value: formatTime(daily.sunrise?.[0]), icon: Sunrise, color: "text-amber-500" },
    { label: "Sunset", value: formatTime(daily.sunset?.[0]), icon: Sunset, color: "text-purple-500" },
  ];

  const forecast = daily.time.map((date, i) => ({
    day: dayNames[new Date(date).getDay()],
    high: Math.round(daily.temperature_2m_max[i]),
    low: Math.round(daily.temperature_2m_min[i]),
    rain: daily.precipitation_probability_max[i],
    icon: pickIcon(daily.weather_code[i]),
  }));

  const localHasData = !localError && localReadings !== null;

  return (
    <PageTransition className="mx-auto max-w-7xl space-y-8">
      {/* 2-Column Dashboard Header */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Regional Weather Card (Open-Meteo) */}
        <GlassCard hover={false} className="relative overflow-hidden h-full">
          <div className="absolute top-0 right-0 p-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
              <CurrentIcon size={80} className="text-yellow-400 opacity-80" />
            </motion.div>
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Regional Weather Forecast</p>
              <h2 className="mt-2 text-5xl font-extrabold text-slate-800 dark:text-white">
                {Math.round(current.temperature_2m)}°C
              </h2>
            </div>
            <div>
              <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                Data sources: Open-Meteo APIs
              </p>
              <p className="text-xs text-slate-400 mt-1">Location: {locationLabel}</p>
            </div>
          </div>
        </GlassCard>

        {/* Right Column: Live IoT Weather Station Card (ESP32) */}
        <GlassCard hover={false} className="relative overflow-hidden h-full border border-emerald-500/20">
          <div className="absolute top-0 right-0 p-8">
            <motion.div
              animate={!localHasData ? {} : { y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              {localHasData && localReadings?.ldr_state === 0 ? (
                <Sun size={80} className="text-amber-500 opacity-80 animate-pulse-glow" />
              ) : (
                <Moon size={80} className="text-indigo-400 opacity-80" />
              )}
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col justify-between h-full min-h-[160px]">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${localError ? "bg-red-400" : "bg-emerald-400"}`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${localError ? "bg-red-500" : "bg-emerald-500"}`}></span>
                </span>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Wifi size={14} /> Live Local IoT Station
                </p>
              </div>

              <h2 className="mt-2 text-5xl font-extrabold text-slate-800 dark:text-white flex items-baseline">
                {localHasData ? `${localReadings.temperature}°C` : "—"}
              </h2>
            </div>

            <div>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">Station Humidity</span>
                  <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                    <Droplets size={14} className="text-sky-500" />
                    {localHasData ? `${localReadings.humidity}%` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Light level</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {localHasData ? (localReadings.ldr_state === 0 ? "☀️ Daylight" : "🌙 Night") : "—"}
                  </span>
                </div>
              </div>
              {localError && (
                <p className="text-red-500 text-xs mt-2 font-semibold">
                  ESP32 Station Offline
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">Station IP: {ESP32_IP}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Regional Weather Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {metrics.map((m, i) => (
          <GlassCard key={m.label} delay={i * 0.05}>
            <div className="flex items-center gap-3">
              <m.icon className={m.color} size={28} />
              <div>
                <p className="text-sm text-slate-500">{m.label}</p>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{m.value}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* 7-Day Forecast */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-slate-800 dark:text-white">7-Day Forecast</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
          {forecast.map((day, i) => (
            <GlassCard key={`${day.day}-${i}`} delay={i * 0.05}>
              <p className="font-bold text-slate-800 dark:text-white">{day.day}</p>
              <motion.div
                className="my-3 flex justify-center"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
              >
                <day.icon size={32} className="text-sky-500" />
              </motion.div>
              <div className="text-center text-sm">
                <span className="font-bold text-slate-800 dark:text-white">{day.high}°</span>
                <span className="text-slate-400 ml-1">{day.low}°</span>
              </div>
              <p className="mt-1 text-center text-xs text-sky-500">{day.rain}% rain</p>
            </GlassCard>
          ))}
        </div>
      </div>
    </PageTransition>
  );
}
