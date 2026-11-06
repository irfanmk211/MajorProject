import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff, Volume2, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/languageState";
import { API_BASE_URL, ESP32_IP } from "../config";

const pages = [
  { path: "/dashboard", label: "ಮುಖಪುಟ", terms: ["ಮುಖಪುಟ", "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", "home", "dashboard"] },
  { path: "/crop", label: "ಬೆಳೆ ಶಿಫಾರಸು", terms: ["ಬೆಳೆ ಶಿಫಾರಸು", "ಬೆಳೆ", "crop recommendation", "crop"] },
  { path: "/disease", label: "ರೋಗ ಪತ್ತೆ", terms: ["ರೋಗ ಪತ್ತೆ", "ರೋಗ", "disease detection", "disease"] },
  { path: "/soil", label: "ಮಣ್ಣಿನ ಮೇಲ್ವಿಚಾರಣೆ", terms: ["ಮಣ್ಣಿನ ಮಾಹಿತಿ", "ಮಣ್ಣು", "soil monitoring", "soil"] },
  { path: "/irrigation", label: "ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ", terms: ["ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ", "ನೀರಾವರಿ", "ಮೋಟಾರ್", "ಪಂಪ್", "smart irrigation", "irrigation", "motor", "pump"] },
  { path: "/weather", label: "ಹವಾಮಾನ", terms: ["ಹವಾಮಾನ", "weather"] },
  { path: "/profile", label: "ಪ್ರೊಫೈಲ್", terms: ["ಪ್ರೊಫೈಲ್", "ನನ್ನ ವಿವರ", "profile"] },
  { path: "/about", label: "ಬಳಕೆದಾರರ ಕೈಪಿಡಿ", terms: ["ಮಾರ್ಗದರ್ಶಿ", "ಕೈಪಿಡಿ", "about", "manual", "guide"] },
  { path: "/contact", label: "ಸಂಪರ್ಕ", terms: ["ಸಂಪರ್ಕ", "contact"] },
];

const englishPageLabels = {
  "/dashboard": "Home",
  "/crop": "Crop Recommendation",
  "/disease": "Disease Detection",
  "/soil": "Soil Monitoring",
  "/irrigation": "Smart Irrigation",
  "/weather": "Weather",
  "/profile": "Profile",
  "/about": "User Guide",
  "/contact": "Contact",
};

const englishFieldLabels = {
  N: "nitrogen (N)",
  P: "phosphorus (P)",
  K: "potassium (K)",
  temperature: "temperature",
  humidity: "humidity",
  ph: "soil pH",
  rainfall: "annual rainfall",
};

function pageOpeningMessage(page, language, continuation = false) {
  const pageLabel = language === "kn" ? page.label : englishPageLabels[page.path];
  if (language === "kn") {
    return continuation
      ? `ಈಗ ${pageLabel} ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ತೆರೆದ ಬಳಿಕ ನಿಮ್ಮ ಕೆಲಸ ಮಾಡುತ್ತೇನೆ.`
      : `ಈಗ ${pageLabel} ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ.`;
  }
  return continuation
    ? `Opening the ${pageLabel} page now. I'll continue once it loads.`
    : `Opening the ${pageLabel} page now.`;
}

function getVoiceForLanguage(voices, languageCode) {
  const prefix = `${languageCode.toLowerCase()}-`;
  return voices.find((voice) => voice.lang.toLowerCase().startsWith(prefix));
}

const cropFields = [
  { name: "N", label: "ಸಾರಜನಕ (N)", aliases: String.raw`\bn\b|nitrogen|ಸಾರಜನಕ|ಎನ್`, min: 0, max: 140, unit: "ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್" },
  { name: "P", label: "ರಂಜಕ (P)", aliases: String.raw`\bp\b|phosphorus|phosphorous|ರಂಜಕ|ಫಾಸ್ಫರಸ್|ಪಿ`, min: 0, max: 145, unit: "ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್" },
  { name: "K", label: "ಪೊಟ್ಯಾಸಿಯಂ (K)", aliases: String.raw`\bk\b|potassium|ಪೊಟ್ಯಾಸಿಯಂ|ಕೆ`, min: 0, max: 205, unit: "ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್" },
  { name: "temperature", label: "ತಾಪಮಾನ", aliases: String.raw`temperature|temp|ತಾಪಮಾನ`, min: 8, max: 44, unit: "ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್" },
  { name: "humidity", label: "ತೇವಾಂಶ", aliases: String.raw`humidity|ಆರ್ದ್ರತೆ|ತೇವಾಂಶ`, min: 14, max: 100, unit: "ಶೇಕಡಾ" },
  { name: "ph", label: "ಮಣ್ಣಿನ pH", aliases: String.raw`\bph\b|ಪಿಎಚ್|ಪಿಹೆಚ್`, min: 3.5, max: 10, unit: "" },
  { name: "rainfall", label: "ವಾರ್ಷಿಕ ಮಳೆ", aliases: String.raw`rainfall|rain|ಮಳೆ|ವರ್ಷ`, min: 20, max: 300, unit: "ಮಿಲಿಮೀಟರ್" },
];

const cropValueKey = "agrosmart_voice_crop_values";
const pendingCropKey = "agrosmart_voice_crop_request";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const locations = {
  "Karnataka, India": { latitude: 12.9716, longitude: 77.5946 },
  "Maharashtra, India": { latitude: 19.076, longitude: 72.8777 },
  "Punjab, India": { latitude: 30.901, longitude: 75.8573 },
  "Tamil Nadu, India": { latitude: 11.1271, longitude: 78.6569 },
};
const spokenLocations = {
  "Karnataka, India": "ಕರ್ನಾಟಕ",
  "Maharashtra, India": "ಮಹಾರಾಷ್ಟ್ರ",
  "Punjab, India": "ಪಂಜಾಬ್",
  "Tamil Nadu, India": "ತಮಿಳುನಾಡು",
};
const spokenCrops = {
  apple: "ಸೇಬು",
  banana: "ಬಾಳೆಹಣ್ಣು",
  blackgram: "ಉದ್ದು",
  chickpea: "ಕಡಲೆ",
  coconut: "ತೆಂಗು",
  coffee: "ಕಾಫಿ",
  cotton: "ಹತ್ತಿ",
  grapes: "ದ್ರಾಕ್ಷಿ",
  jute: "ಸೆಣಬು",
  kidneybeans: "ರಾಜ್ಮಾ",
  lentil: "ಮಸೂರ ಬೇಳೆ",
  maize: "ಮೆಕ್ಕೆಜೋಳ",
  mango: "ಮಾವು",
  mothbeans: "ಮೋತ್ ಬೀನ್ಸ್",
  mungbean: "ಹೆಸರುಕಾಳು",
  muskmelon: "ಕರಬೂಜ",
  orange: "ಕಿತ್ತಳೆ",
  papaya: "ಪಪ್ಪಾಯಿ",
  pigeonpeas: "ತೊಗರಿ",
  pomegranate: "ದಾಳಿಂಬೆ",
  rice: "ಭತ್ತ",
  watermelon: "ಕಲ್ಲಂಗಡಿ",
};

function readSavedCropValues() {
  try {
    return JSON.parse(sessionStorage.getItem(cropValueKey) || "{}");
  } catch {
    return {};
  }
}

function weatherDescription(code, language) {
  const descriptions = language === "kn"
    ? ["ಆಕಾಶ ಸ್ವಚ್ಛವಾಗಿದೆ", "ಮುಖ್ಯವಾಗಿ ಸ್ವಚ್ಛವಾಗಿದೆ", "ಭಾಗಶಃ ಮೋಡ ಕವಿದಿದೆ", "ಮೋಡ ಕವಿದಿದೆ"]
    : ["Clear sky", "Mainly clear", "Partly cloudy", "Overcast"];
  if (code >= 0 && code <= 3) return descriptions[code];
  if (code === 45 || code === 48) return language === "kn" ? "ಮಂಜು ಇದೆ" : "Fog";
  if (code >= 51 && code <= 57) return language === "kn" ? "ತುಂತುರು ಮಳೆಯಾಗುತ್ತಿದೆ" : "Drizzle";
  if (code >= 61 && code <= 67) return language === "kn" ? "ಮಳೆಯಾಗುತ್ತಿದೆ" : "Rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return language === "kn" ? "ಹಿಮಪಾತದ ಪರಿಸ್ಥಿತಿ" : "Snowfall";
  if (code >= 80 && code <= 82) return language === "kn" ? "ಮಳೆಯ ಸುರಿಮಳೆಯ ಸಾಧ್ಯತೆ ಇದೆ" : "Rain showers";
  if (code >= 95 && code <= 99) return language === "kn" ? "ಗುಡುಗು ಸಹಿತ ಮಳೆ ಮತ್ತು ಆಲಿಕಲ್ಲಿನ ಸಾಧ್ಯತೆ ಇದೆ" : "Thunderstorms with possible hail";
  return language === "kn" ? "ಹವಾಮಾನ ಮಾಹಿತಿ ಲಭ್ಯವಿದೆ" : "Weather information is available";
}

function windDirection(degrees, language) {
  const directions = language === "kn"
    ? ["ಉತ್ತರ", "ಈಶಾನ್ಯ", "ಪೂರ್ವ", "ಆಗ್ನೇಯ", "ದಕ್ಷಿಣ", "ನೈಋತ್ಯ", "ಪಶ್ಚಿಮ", "ವಾಯವ್ಯ"]
    : ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
  return directions[Math.round(degrees / 45) % directions.length];
}

function formatTime(value, language) {
  const date = new Date(value);
  const hour = date.getHours();
  if (language !== "kn") {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const part = hour < 12 ? "ಬೆಳಿಗ್ಗೆ" : hour < 16 ? "ಮಧ್ಯಾಹ್ನ" : hour < 19 ? "ಸಂಜೆ" : "ರಾತ್ರಿ";
  const displayHour = hour % 12 || 12;
  return `${part} ${displayHour}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function speakCropName(name) {
  const normalized = String(name).toLowerCase().replaceAll("_", " ").trim();
  return spokenCrops[normalized.replaceAll(" ", "")] || normalized;
}

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isKannada = language === "kn";
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const commandHandlerRef = useRef(null);
  const listeningHandlerRef = useRef(null);
  const activeSessionRef = useRef(false);
  const commandHandledRef = useRef(false);
  const speechVersionRef = useRef(0);
  const workflowRef = useRef(null);
  const pendingIntentRef = useRef(null);
  const canSpeak = "speechSynthesis" in window;
  const [listening, setListening] = useState(false);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(
    isKannada ? "ಮೈಕ್ ಒತ್ತಿ ಕನ್ನಡದಲ್ಲಿ ಸೂಚನೆ ನೀಡಿ" : "Tap the mic and speak your request.",
  );

  useEffect(() => () => {
    activeSessionRef.current = false;
    recognitionRef.current?.abort();
    if (canSpeak) window.speechSynthesis.cancel();
    audioRef.current?.pause();
    if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);
  }, [canSpeak]);

  const announce = (text, resumeListening = true, speechLanguage = isKannada ? "kn-IN" : "en-US") => {
    setStatus(text);
    if (!canSpeak) {
      if (resumeListening && activeSessionRef.current) window.setTimeout(() => listeningHandlerRef.current?.(), 150);
      return;
    }
    const speechVersion = ++speechVersionRef.current;
    window.speechSynthesis.cancel();
    audioRef.current?.pause();
    if (audioRef.current?.src) URL.revokeObjectURL(audioRef.current.src);

    const finishSpeech = () => {
      if (resumeListening && activeSessionRef.current && speechVersion === speechVersionRef.current) {
        window.setTimeout(() => listeningHandlerRef.current?.(), 250);
      }
    };

    const sayWithDeviceVoice = (voice) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = speechLanguage;
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = finishSpeech;
      utterance.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted") {
          setStatus(isKannada
            ? `${text} ಧ್ವನಿ ಪ್ಲೇ ಆಗಲಿಲ್ಲ.`
            : `${text} Audio could not be played.`);
        }
      };
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utterance);
    };

    if (!isKannada) {
      sayWithDeviceVoice(getVoiceForLanguage(window.speechSynthesis.getVoices(), "en"));
      return;
    }

    fetch(`${API_BASE_URL}/api/tts/kannada`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }).then(async (response) => {
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Kannada speech could not be generated.");
      }
      return response.blob();
    }).then((audioBlob) => {
      if (speechVersion !== speechVersionRef.current) return;
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (audioRef.current === audio) audioRef.current = null;
        finishSpeech();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setStatus(`${text} ಧ್ವನಿ ಪ್ಲೇ ಆಗಲಿಲ್ಲ.`);
        finishSpeech();
      };
      return audio.play();
    }).catch(() => {
      if (speechVersion !== speechVersionRef.current) return;
      setStatus(
        `${text} ಕನ್ನಡ ಧ್ವನಿಯನ್ನು ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ಬ್ಯಾಕೆಂಡ್‌ನಲ್ಲಿ GOOGLE_TTS_API_KEY ಹೊಂದಿಸಿ ಅಥವಾ ಸಾಧನದಲ್ಲಿ ಕನ್ನಡ ಧ್ವನಿ ಸ್ಥಾಪಿಸಿ.`,
      );
      finishSpeech();
    });
  };

  const getWeatherReport = async () => {
    const locationName = user?.location || "Karnataka, India";
    const coordinates = locations[locationName] || locations["Karnataka, India"];
    const regionName = isKannada ? spokenLocations[locationName] || locationName : locationName;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", coordinates.latitude);
    url.searchParams.set("longitude", coordinates.longitude);
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,wind_speed_10m,wind_direction_10m,weather_code");
    url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max,sunrise,sunset");
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("forecast_days", "1");

    const response = await fetch(url);
    if (!response.ok) throw new Error("Weather service unavailable");
    const data = await response.json();
    const current = data.current;
    const today = data.daily;
    const reportTime = current.time ? formatTime(current.time, language) : isKannada ? "ಈಗ" : "now";
    const sunrise = formatTime(today.sunrise[0], language);
    const sunset = formatTime(today.sunset[0], language);
    const description = weatherDescription(current.weather_code, language);
    const direction = windDirection(current.wind_direction_10m, language);

    if (!isKannada) {
      return `Weather report for ${regionName} at ${reportTime}. ${description}. Current temperature ${Math.round(current.temperature_2m)} degrees Celsius, feels like ${Math.round(current.apparent_temperature)} degrees. Humidity ${current.relative_humidity_2m} percent, precipitation ${current.precipitation} millimeters. Wind ${Math.round(current.wind_speed_10m)} kilometers per hour from the ${direction}. Today's high ${Math.round(today.temperature_2m_max[0])} degrees, low ${Math.round(today.temperature_2m_min[0])} degrees. Rain probability ${today.precipitation_probability_max[0]} percent, UV index ${today.uv_index_max[0]}. Sunrise ${sunrise}, sunset ${sunset}.`;
    }
    return `${regionName} ಪ್ರದೇಶದ ${reportTime} ಹವಾಮಾನ ವರದಿ. ${description}. ಈಗಿನ ತಾಪಮಾನ ${Math.round(current.temperature_2m)} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್; ಅನುಭವಕ್ಕೆ ${Math.round(current.apparent_temperature)} ಡಿಗ್ರಿ. ತೇವಾಂಶ ${current.relative_humidity_2m} ಶೇಕಡಾ, ಮಳೆಯ ಪ್ರಮಾಣ ${current.precipitation} ಮಿಲಿಮೀಟರ್. ಗಾಳಿಯ ವೇಗ ಗಂಟೆಗೆ ${Math.round(current.wind_speed_10m)} ಕಿಲೋಮೀಟರ್, ದಿಕ್ಕು ${direction}. ಇಂದಿನ ಗರಿಷ್ಠ ತಾಪಮಾನ ${Math.round(today.temperature_2m_max[0])} ಡಿಗ್ರಿ, ಕನಿಷ್ಠ ${Math.round(today.temperature_2m_min[0])} ಡಿಗ್ರಿ. ಮಳೆಯ ಸಾಧ್ಯತೆ ${today.precipitation_probability_max[0]} ಶೇಕಡಾ, UV ಸೂಚ್ಯಂಕ ${today.uv_index_max[0]}. ಸೂರ್ಯೋದಯ ${sunrise}, ಸೂರ್ಯಾಸ್ತ ${sunset}.`;
  };

  const saveCropRequest = (values, results = null) => {
    sessionStorage.setItem(cropValueKey, JSON.stringify(values));
    if (location.pathname === "/crop") {
      window.dispatchEvent(new CustomEvent("agrosmart:voice-crop-result", { detail: { values, results } }));
      return;
    }
    sessionStorage.setItem(pendingCropKey, JSON.stringify({ values, results }));
    navigate("/crop");
  };

  const askNextCropField = () => {
    const flow = workflowRef.current;
    if (!flow || flow.waitingForPage) return;
    const field = cropFields[flow.index];
    const questions = isKannada ? {
      N: "ಮೊದಲು ಮಣ್ಣಿನ ಸಾರಜನಕ, ಅಂದರೆ N ಪ್ರಮಾಣವನ್ನು ಹೇಳಿ. ಶೂನ್ಯದಿಂದ 140 ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
      P: "ಧನ್ಯವಾದಗಳು. ಈಗ ಮಣ್ಣಿನ ರಂಜಕ, ಅಂದರೆ P ಪ್ರಮಾಣವನ್ನು ಹೇಳಿ. ಶೂನ್ಯದಿಂದ 145 ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
      K: "ಸರಿ. ಈಗ ಪೊಟ್ಯಾಸಿಯಂ, ಅಂದರೆ K ಪ್ರಮಾಣವನ್ನು ಹೇಳಿ. ಶೂನ್ಯದಿಂದ 205 ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
      temperature: "ಈಗ ಹೊಲದ ತಾಪಮಾನವನ್ನು ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್‌ನಲ್ಲಿ ಹೇಳಿ. 8ರಿಂದ 44ರ ನಡುವಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
      humidity: "ಈಗ ಗಾಳಿಯ ತೇವಾಂಶವನ್ನು ಶೇಕಡಾವಾರು ಹೇಳಿ. 14ರಿಂದ 100ರ ನಡುವಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
      ph: "ಈಗ ಮಣ್ಣಿನ pH ಮೌಲ್ಯವನ್ನು ಹೇಳಿ. 3.5ರಿಂದ 10ರ ನಡುವಿನ ಮೌಲ್ಯವನ್ನು ಹೇಳಿ. ಉದಾಹರಣೆಗೆ, ಆರು ಪಾಯಿಂಟ್ ಐದು.",
      rainfall: "ಕೊನೆಯದಾಗಿ, ವಾರ್ಷಿಕ ಮಳೆಯ ಪ್ರಮಾಣವನ್ನು ಮಿಲಿಮೀಟರ್‌ನಲ್ಲಿ ಹೇಳಿ. 20ರಿಂದ 300ರ ನಡುವಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
    } : {
      N: "First, say the soil nitrogen (N) value, from 0 to 140 kilograms per hectare.",
      P: "Thanks. Now say the soil phosphorus (P) value, from 0 to 145 kilograms per hectare.",
      K: "Now say the potassium (K) value, from 0 to 205 kilograms per hectare.",
      temperature: "Say the field temperature in degrees Celsius, from 8 to 44.",
      humidity: "Say the air humidity percentage, from 14 to 100.",
      ph: "Say the soil pH value, from 3.5 to 10. For example, six point five.",
      rainfall: "Finally, say the annual rainfall in millimeters, from 20 to 300.",
    };
    if (field) announce(questions[field.name]);
  };

  const beginCropInterview = () => {
    workflowRef.current = {
      index: 0,
      values: {},
      waitingForPage: location.pathname !== "/crop",
    };
    if (location.pathname !== "/crop") {
      navigate("/crop");
      announce(
        language === "kn"
          ? "ಮೊದಲು ಬೆಳೆ ಶಿಫಾರಸು ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ಪುಟ ತೆರೆದ ಬಳಿಕ ಅಗತ್ಯ ಮೌಲ್ಯಗಳನ್ನು ಒಂದೊಂದಾಗಿ ಕೇಳುತ್ತೇನೆ."
          : "Opening the Crop Recommendation page first. I'll ask for the required values one by one once it loads.",
        false,
        language === "kn" ? "kn-IN" : "en-US",
      );
      return;
    }
    askNextCropField();
  };

  const handleCropValue = (text) => {
    const flow = workflowRef.current;
    const field = cropFields[flow.index];
    if (/ರದ್ದು|ಬೇಡ|ನಿಲ್ಲಿಸು|cancel|stop interview/i.test(text)) {
      workflowRef.current = null;
      announce(isKannada
        ? "ಬೆಳೆ ಶಿಫಾರಸಿನ ಪ್ರಕ್ರಿಯೆಯನ್ನು ನಿಲ್ಲಿಸಿದ್ದೇನೆ. ಮತ್ತೆ ಬೇಕಾದಾಗ ಹೇಳಿ."
        : "The crop recommendation process has been cancelled. Let me know if you want to try again.");
      return;
    }

    const value = parseSpokenNumber(text);
    const fieldLabel = isKannada ? field.label : englishFieldLabels[field.name];
    if (value === null) {
      announce(isKannada
        ? `${fieldLabel} ಮೌಲ್ಯವನ್ನು ಸಂಖ್ಯೆಯಾಗಿ ಕೇಳಿಸಿಕೊಳ್ಳಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಸಂಖ್ಯೆಯನ್ನು ಮತ್ತೆ ಹೇಳಿ.`
        : `I couldn't recognize the ${fieldLabel} value as a number. Please say the number again.`);
      return;
    }
    if (value < field.min || value > field.max) {
      announce(isKannada
        ? `${fieldLabel} ಮೌಲ್ಯ ${field.min} ರಿಂದ ${field.max} ರ ಒಳಗೆ ಇರಬೇಕು. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಸಂಖ್ಯೆಯನ್ನು ಮತ್ತೆ ಹೇಳಿ.`
        : `The ${fieldLabel} value must be between ${field.min} and ${field.max}. Please say a valid number.`);
      return;
    }

    flow.values[field.name] = value;
    flow.index += 1;
    if (flow.index < cropFields.length) {
      const nextField = cropFields[flow.index];
      const confirmations = isKannada ? {
        N: "ಸಾರಜನಕದ ಮೌಲ್ಯ ದಾಖಲಿಸಿದ್ದೇನೆ.",
        P: "ರಂಜಕದ ಮೌಲ್ಯ ದಾಖಲಿಸಿದ್ದೇನೆ.",
        K: "ಪೊಟ್ಯಾಸಿಯಂನ ಮೌಲ್ಯ ದಾಖಲಿಸಿದ್ದೇನೆ.",
        temperature: "ತಾಪಮಾನದ ಮೌಲ್ಯ ದಾಖಲಿಸಿದ್ದೇನೆ.",
        humidity: "ತೇವಾಂಶದ ಮೌಲ್ಯ ದಾಖಲಿಸಿದ್ದೇನೆ.",
        ph: "pH ಮೌಲ್ಯ ದಾಖಲಿಸಿದ್ದೇನೆ.",
      } : {
        N: "Nitrogen value recorded.",
        P: "Phosphorus value recorded.",
        K: "Potassium value recorded.",
        temperature: "Temperature recorded.",
        humidity: "Humidity recorded.",
        ph: "Soil pH recorded.",
      };
      const labels = isKannada ? {
        N: "ಸಾರಜನಕ (N)", P: "ರಂಜಕ (P)", K: "ಪೊಟ್ಯಾಸಿಯಂ (K)",
        temperature: "ತಾಪಮಾನ", humidity: "ತೇವಾಂಶ", ph: "pH", rainfall: "ವಾರ್ಷಿಕ ಮಳೆ",
      } : {
        N: "nitrogen (N)", P: "phosphorus (P)", K: "potassium (K)",
        temperature: "temperature", humidity: "humidity", ph: "soil pH", rainfall: "annual rainfall",
      };
      const prompts = isKannada ? {
        P: "ಶೂನ್ಯದಿಂದ 145 ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
        K: "ಶೂನ್ಯದಿಂದ 205 ಕಿಲೋಗ್ರಾಂ ಪ್ರತಿ ಹೆಕ್ಟೇರ್ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
        temperature: "8ರಿಂದ 44 ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
        humidity: "14ರಿಂದ 100 ಶೇಕಡಾ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
        ph: "3.5ರಿಂದ 10ರ ನಡುವಿನ ಮೌಲ್ಯವನ್ನು ಹೇಳಿ.",
        rainfall: "20ರಿಂದ 300 ಮಿಲಿಮೀಟರ್ ಒಳಗಿನ ಸಂಖ್ಯೆಯನ್ನು ಹೇಳಿ.",
      } : {
        P: "Say a number from 0 to 145 kilograms per hectare.",
        K: "Say a number from 0 to 205 kilograms per hectare.",
        temperature: "Say a number from 8 to 44 degrees Celsius.",
        humidity: "Say a percentage from 14 to 100.",
        ph: "Say a value from 3.5 to 10.",
        rainfall: "Say a number from 20 to 300 millimeters.",
      };
      announce(isKannada
        ? `${confirmations[field.name]} ಈಗ ${labels[nextField.name]} ಮೌಲ್ಯವನ್ನು ಹೇಳಿ. ${prompts[nextField.name]}`
        : `${confirmations[field.name]} Now say the ${labels[nextField.name]} value. ${prompts[nextField.name]}`);
      return;
    }

    const values = { ...flow.values };
    workflowRef.current = null;
    saveCropRequest(values);
    predictCrop(values);
  };

  const reportWeather = async () => {
    setStatus(isKannada ? "ಈಗಿನ ಸಂಪೂರ್ಣ ಹವಾಮಾನ ವರದಿ ಪಡೆಯುತ್ತಿದ್ದೇನೆ…" : "Getting the current weather report…");
    try {
      announce(await getWeatherReport());
    } catch {
      announce(isKannada
        ? "ಈಗ ಹವಾಮಾನ ವರದಿ ಪಡೆಯಲು ಆಗಲಿಲ್ಲ. ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ ಅಥವಾ ಹವಾಮಾನ ಪುಟದಲ್ಲಿ ನೋಡಿ."
        : "I couldn't get the weather report. Check your internet connection or view the Weather page.");
    }
  };

  const executePumpCommand = async (state) => {
    try {
      const sensorResponse = await fetch(`http://${ESP32_IP}/api/data`);
      if (!sensorResponse.ok) throw new Error("ಸಾಧನ ಸಂಪರ್ಕವಾಗಲಿಲ್ಲ.");
      const sensorData = await sensorResponse.json();
      const hasSensorData = [sensorData.soil_moisture_percent, sensorData.soil_moisture, sensorData.soil]
        .some((value) => value !== undefined && value !== null);
      if (state === 1 && !hasSensorData) {
        announce(isKannada
          ? "ಮಣ್ಣಿನ ಸಂವೇದಕದ ಮಾಹಿತಿ ಸಿಗದ ಕಾರಣ ಮೋಟಾರ್ ಚಾಲು ಮಾಡಲಿಲ್ಲ. ಸಾಧನದ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ."
          : "The motor was not started because soil sensor data is unavailable. Check the device connection.");
        return;
      }
      const response = await fetch(`http://${ESP32_IP}/api/pump?state=${state}`);
      if (!response.ok) throw new Error("ಮೋಟಾರ್ ಆದೇಶವನ್ನು ಸಾಧನ ಸ್ವೀಕರಿಸಲಿಲ್ಲ.");
      const result = await response.json();
      if (result.pump_state !== undefined && result.pump_state !== state) {
        throw new Error("ಮೋಟಾರ್ ಸ್ಥಿತಿಯನ್ನು ಖಚಿತಪಡಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.");
      }
      if (location.pathname === "/irrigation") {
        window.dispatchEvent(new Event("agrosmart:voice-manual-mode"));
      }
      announce(isKannada
        ? state
          ? "ನೀರಾವರಿ ಪುಟ ತೆರೆದಿದೆ. ಮೋಟಾರ್ ಚಾಲು ಮಾಡುವ ಆದೇಶ ಕಳುಹಿಸಿದ್ದೇನೆ. ಅದರ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ."
          : "ನೀರಾವರಿ ಪುಟ ತೆರೆದಿದೆ. ಮೋಟಾರ್ ನಿಲ್ಲಿಸುವ ಆದೇಶ ಕಳುಹಿಸಿದ್ದೇನೆ. ಅದರ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ."
        : state
          ? "The Irrigation page is open. I sent the command to start the motor. Check its status."
          : "The Irrigation page is open. I sent the command to stop the motor. Check its status.");
    } catch {
      announce(isKannada
        ? "ಮೋಟಾರ್‌ಗೆ ಆದೇಶ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ESP32 ಸಾಧನದ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ."
        : "I couldn't send the motor command. Check the ESP32 device connection.");
    }
  };

  const readSoilTask = async () => {
    try {
      const response = await fetch(`http://${ESP32_IP}/api/data`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      let moisture = data.soil_moisture_percent ?? data.soil_moisture ?? data.soil;
      if (moisture !== undefined && moisture > 100) {
        moisture = Math.max(0, Math.min(100, Math.round(((3500 - moisture) / 2000) * 100)));
      }
      const details = [];
      if (moisture !== undefined && moisture !== null) {
        details.push(isKannada
          ? `ಮಣ್ಣಿನ ತೇವಾಂಶ ${Math.round(moisture)} ಶೇಕಡಾ`
          : `Soil moisture ${Math.round(moisture)} percent`);
      }
      if (data.temperature !== undefined) {
        details.push(isKannada
          ? `ತಾಪಮಾನ ${Math.round(data.temperature)} ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್`
          : `Temperature ${Math.round(data.temperature)} degrees Celsius`);
      }
      if (data.humidity !== undefined) {
        details.push(isKannada
          ? `ಗಾಳಿಯ ತೇವಾಂಶ ${Math.round(data.humidity)} ಶೇಕಡಾ`
          : `Air humidity ${Math.round(data.humidity)} percent`);
      }
      if (!details.length) throw new Error();
      announce(isKannada
        ? `ಮಣ್ಣಿನ ಮೇಲ್ವಿಚಾರಣೆ ವರದಿ: ${details.join(", ")}.`
        : `Soil monitoring report: ${details.join(", ")}.`);
    } catch {
      announce(isKannada
        ? "ಮಣ್ಣಿನ ಸಂವೇದಕದ ಮಾಹಿತಿ ಸಿಗಲಿಲ್ಲ. ESP32 ಸಾಧನದ ವಿದ್ಯುತ್, Wi-Fi ಮತ್ತು ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ."
        : "Soil sensor data is unavailable. Check the ESP32 power, Wi-Fi, and connection.");
    }
  };

  const readIrrigationTask = async () => {
    try {
      const response = await fetch(`http://${ESP32_IP}/api/data`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      const pumpState = data.pump_state ?? data.irrigation;
      const pumpDescription = pumpState === 1 || pumpState === "ON" || pumpState === true
        ? isKannada ? "ಮೋಟಾರ್ ಚಾಲನೆಯಲ್ಲಿದೆ" : "The motor is running"
        : pumpState === 0 || pumpState === "OFF" || pumpState === false
          ? isKannada ? "ಮೋಟಾರ್ ನಿಂತಿದೆ" : "The motor is stopped"
          : isKannada ? "ಮೋಟಾರ್ ಸ್ಥಿತಿ ಲಭ್ಯವಿಲ್ಲ" : "Motor status is unavailable";
      const moisture = data.soil_moisture_percent ?? data.soil_moisture ?? data.soil;
      announce(isKannada
        ? `ನೀರಾವರಿ ಸ್ಥಿತಿ: ${pumpDescription}.${moisture !== undefined ? ` ಮಣ್ಣಿನ ತೇವಾಂಶ ${Math.round(moisture)} ಶೇಕಡಾ.` : ""}`
        : `Irrigation status: ${pumpDescription}.${moisture !== undefined ? ` Soil moisture ${Math.round(moisture)} percent.` : ""}`);
    } catch {
      announce(isKannada
        ? "ನೀರಾವರಿ ಸಾಧನದಿಂದ ಮಾಹಿತಿ ಸಿಗಲಿಲ್ಲ. ESP32 ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ."
        : "I couldn't get irrigation data. Check the ESP32 connection.");
    }
  };

  const openPageForTask = (page, taskType, response) => {
    if (location.pathname === page.path) {
      if (taskType === "soil") readSoilTask();
      else if (taskType === "irrigation") readIrrigationTask();
      else if (taskType === "weather") reportWeather();
      else announce(response);
      return;
    }
    pendingIntentRef.current = { type: taskType, response };
    navigate(page.path);
    announce(
      pageOpeningMessage(page, language, true),
      false,
      language === "kn" ? "kn-IN" : "en-US",
    );
  };

  const performPageTask = (page) => {
    if (page.path === "/crop") {
      beginCropInterview();
    } else if (page.path === "/weather") {
      openPageForTask(page, "weather");
    } else if (page.path === "/soil") {
      openPageForTask(page, "soil");
    } else if (page.path === "/irrigation") {
      openPageForTask(page, "irrigation");
    } else if (page.path === "/disease") {
      openPageForTask(page, "disease", isKannada
        ? "ರೋಗ ಪತ್ತೆ ಪುಟ ತೆರೆದಿದೆ. ಈಗ ರೋಗ ತಗುಲಿದ ಎಲೆಯ ಸ್ಪಷ್ಟ ಚಿತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ; ನಂತರ ಅದರ ವಿಶ್ಲೇಷಣೆಯನ್ನು ಮಾಡುತ್ತೇನೆ."
        : "The Disease Detection page is open. Select a clear image of the affected leaf, and I can analyze it.");
    } else if (page.path === "/profile") {
      const profile = `${user?.name || "ಬಳಕೆದಾರ"}. ${user?.location || "ಸ್ಥಳ ನಮೂದಿಸಿಲ್ಲ"}. ${user?.farmSize || "ಹೊಲದ ವಿಸ್ತೀರ್ಣ ನಮೂದಿಸಿಲ್ಲ"}.`;
      const englishProfile = `${user?.name || "User"}. ${user?.location || "Location not set"}. ${user?.farmSize || "Farm size not set"}.`;
      openPageForTask(page, "profile", isKannada
        ? `ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ವಿವರಗಳು: ${profile}`
        : `Your profile details: ${englishProfile}`);
    } else if (page.path === "/about") {
      openPageForTask(page, "about", isKannada
        ? "AgroSmart ನಲ್ಲಿ ಬೆಳೆ ಶಿಫಾರಸು, ಸಸ್ಯ ರೋಗ ಪತ್ತೆ, ಮಣ್ಣಿನ ಮೇಲ್ವಿಚಾರಣೆ, ನೀರಾವರಿ ಮತ್ತು ಹವಾಮಾನ ಸೌಲಭ್ಯಗಳಿವೆ. ಸಂಪೂರ್ಣ ಕೈಪಿಡಿ ಈ ಪುಟದಲ್ಲಿದೆ."
        : "AgroSmart includes crop recommendations, plant disease detection, soil monitoring, irrigation, and weather tools. The full user guide is on this page.");
    } else if (page.path === "/contact") {
      openPageForTask(page, "contact", isKannada
        ? "ಸಂಪರ್ಕ ಪುಟ ತೆರೆದಿದೆ. ನಿಮ್ಮ ಸಂದೇಶವನ್ನು ನಮೂದಿಸಿ ಕಳುಹಿಸಬಹುದು."
        : "The Contact page is open. You can enter and send your message.");
    } else {
      openPageForTask(page, "dashboard", isKannada
        ? "ಮುಖಪುಟ ತೆರೆದಿದೆ. ಬೆಳೆ, ರೋಗ, ಮಣ್ಣು, ನೀರಾವರಿ ಮತ್ತು ಹವಾಮಾನ ವಿಭಾಗಗಳಿಂದ ಬೇಕಾದ ಕೆಲಸವನ್ನು ಆಯ್ಕೆಮಾಡಿ."
        : "The Home page is open. Choose a crop, disease, soil, irrigation, or weather section to get started.");
    }
  };

  const predictCrop = async (parsedValues) => {
    const savedValues = readSavedCropValues();
    const values = Object.fromEntries(cropFields.map((field) => [
      field.name,
      parsedValues[field.name] ?? savedValues[field.name] ?? field.fallback,
    ]));
    const invalidField = cropFields.find((field) => (
      values[field.name] < field.min || values[field.name] > field.max
    ));
    if (invalidField) {
      const label = isKannada ? invalidField.label : englishFieldLabels[invalidField.name];
      announce(isKannada
        ? `${label} ಮೌಲ್ಯ ${invalidField.min} ರಿಂದ ${invalidField.max} ರ ಒಳಗೆ ಇರಬೇಕು. ದಯವಿಟ್ಟು ಸರಿಯಾದ ಮೌಲ್ಯವನ್ನು ಮತ್ತೆ ಹೇಳಿ.`
        : `The ${label} value must be between ${invalidField.min} and ${invalidField.max}. Please say a valid number.`);
      return;
    }

    setStatus(isKannada ? "ಬೆಳೆ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…" : "Checking crop data…");
    try {
      const response = await fetch(`${API_BASE_URL}/predict-crop`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: cropFields.map((field) => Number(values[field.name])) }),
      });
      const payload = await response.json();
      const result = Array.isArray(payload) ? payload : payload.value;
      if (!response.ok || payload.error || !Array.isArray(result)) {
        throw new Error(payload.error || "ಬೆಳೆಗಳ ಶಿಫಾರಸು ಸಿಗಲಿಲ್ಲ.");
      }
      saveCropRequest(values, result);
      const recommendations = result.slice(0, 3).map((item, index) => isKannada
        ? `${index + 1}. ${speakCropName(item.crop)}, ${item.prob} ಶೇಕಡಾ`
        : `${index + 1}. ${String(item.crop).replaceAll("_", " ")}, ${item.prob} percent`).join(". ");
      announce(isKannada
        ? `ನಿಮ್ಮ ಹೊಲಕ್ಕೆ ಸೂಕ್ತವಾದ ಬೆಳೆಗಳ ಅಂದಾಜು ಸಿದ್ಧವಾಗಿದೆ. ${recommendations}. ವಿವರಗಳನ್ನು ಬೆಳೆ ಶಿಫಾರಸು ಪುಟದಲ್ಲಿ ತೋರಿಸಿದ್ದೇನೆ.`
        : `Crop recommendations for your farm are ready. ${recommendations}. The details are shown on the Crop Recommendation page.`);
    } catch {
      saveCropRequest(values);
      announce(isKannada
        ? `ಈಗ ಬೆಳೆಗಳ ಅಂದಾಜು ಪಡೆಯಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. N, P, K, ತಾಪಮಾನ, ತೇವಾಂಶ, pH ಮತ್ತು ಮಳೆಯ ಪ್ರಮಾಣವನ್ನು ಬೆಳೆ ಶಿಫಾರಸು ಪುಟದಲ್ಲಿ ತುಂಬಿದ್ದೇನೆ. ಸರ್ವರ್ ಸಂಪರ್ಕವನ್ನು ಪರಿಶೀಲಿಸಿ.`
        : "I couldn't get crop recommendations. I filled the N, P, K, temperature, humidity, pH, and rainfall values on the Crop Recommendation page. Check the server connection.");
    }
  };

  const handleCommand = async (rawText) => {
    const text = rawText.toLocaleLowerCase("kn-IN");
    const destination = pages
      .flatMap((page) => page.terms.map((term) => ({ page, term })))
      .filter(({ term }) => text.includes(term))
      .sort((left, right) => right.term.length - left.term.length)[0]?.page;
    const namesPage = /ಪುಟ|\bputa\b|\bpage\b/i.test(text);
    const asksToOpen = /ತೆರೆ|ತೆರೆಯಿರಿ|ತೆರೆಯಿ|ತೆರೆಯಲು|\bopen\b|\bnavigate\b|\bgo to\b|\btake me to\b/i.test(text);
    if (destination && (namesPage || asksToOpen)) {
      workflowRef.current = null;
      pendingIntentRef.current = null;
      if (location.pathname !== destination.path) navigate(destination.path);
      announce(location.pathname === destination.path
        ? (language === "kn"
          ? `${destination.label} ಪುಟ ಈಗಾಗಲೇ ತೆರೆದಿದೆ.`
          : `The ${englishPageLabels[destination.path]} page is already open.`)
        : pageOpeningMessage(destination, language),
      true,
      language === "kn" ? "kn-IN" : "en-US");
      return;
    }

    const asksToAct = /ಮಾಡಿ|ಮಾಡು|ಮಾಡಿರಿ|ಮಾಡಿಕೊಡಿ|ಮಾಡಿ ಕೊಡಿ|\bmadi\b|\bdo\b|\bperform\b|\bshow\b|\bread\b|\bcheck\b|\bview\b|\bdisplay\b|\bfetch\b/i.test(text);

    if (workflowRef.current && !workflowRef.current.waitingForPage) {
      if (asksToAct && /ಬೆಳೆ|crop|predict|ಶಿಫಾರಸು/i.test(text)) {
        beginCropInterview();
        return;
      }
      handleCropValue(text);
      return;
    }

    const wantsOn = /ಆನ್|ಆರಂಭ|ಚಾಲು|ಪ್ರಾರಂಭ|\bon\b|start|turn on|switch on/i.test(text);
    const wantsOff = /ಆಫ್|ನಿಲ್ಲಿಸು|ಸ್ಥಗಿತ|\boff\b|stop|turn off|switch off/i.test(text);
    const mentionsPump = /ಮೋಟಾರ್|ಪಂಪ್|ನೀರಾವರಿ|motor|pump|irrigation/i.test(text);
    if ((wantsOn || wantsOff) && mentionsPump) {
      const state = wantsOn && !wantsOff ? 1 : 0;
      if (location.pathname !== "/irrigation") {
        pendingIntentRef.current = { type: "motor", state };
        navigate("/irrigation");
        announce(
          language === "kn"
            ? "ಮೊದಲು ನೀರಾವರಿ ಪುಟವನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ತೆರೆದ ನಂತರ ನಿಮ್ಮ ಆದೇಶವನ್ನು ಕಾರ್ಯಗತಗೊಳಿಸುತ್ತೇನೆ."
            : "Opening the Smart Irrigation page first. I'll carry out your request once it loads.",
          false,
          language === "kn" ? "kn-IN" : "en-US",
        );
      } else {
        executePumpCommand(state);
      }
      return;
    }

    const cropTask = /predict|recommend\s+(?:a\s+)?crop|suggest\s+(?:a\s+)?crop|ಬೆಳೆ ಶಿಫಾರಸು ಮಾಡಿ|ಬೆಳೆ ಶಿಫಾರಸು ಮಾಡು|ಯಾವ ಬೆಳೆ|ಸೂಕ್ತ ಬೆಳೆ|ಬೆಳೆ ತಿಳಿಸು/i.test(text);
    const bareCropAction = location.pathname === "/crop" && /^(ಮಾಡಿ|ಮಾಡು|ಮಾಡಿರಿ|madi|do|perform)$/i.test(text.trim());
    if (cropTask || (destination?.path === "/crop" && asksToAct) || bareCropAction) {
      const savedValues = readSavedCropValues();
      const allCropValuesAvailable = cropFields.every((field) => {
        const value = Number(savedValues[field.name]);
        return Number.isFinite(value) && value >= field.min && value <= field.max;
      });
      if (allCropValuesAvailable && (asksToAct || cropTask)) {
        predictCrop(savedValues);
      } else {
        beginCropInterview();
      }
      return;
    }

    const weatherTask = /weather report|weather now|weather today|forecast|ಹವಾಮಾನ ವರದಿ|ಹವಾಮಾನ ಹೇಗಿದೆ|ಈಗಿನ ಹವಾಮಾನ|ಇಂದಿನ ಹವಾಮಾನ|ಮಳೆ ವರದಿ/i.test(text);
    if (weatherTask || (destination?.path === "/weather" && asksToAct)) {
      performPageTask(pages.find((page) => page.path === "/weather"));
      return;
    }

    if (destination) {
      if (asksToAct) {
        performPageTask(destination);
      } else {
        announce(isKannada
          ? `${destination.label} ಪುಟದ ಕೆಲಸ ಮಾಡಲು ಅದರ ಹೆಸರಿನ ಜೊತೆಗೆ “ಮಾಡಿ” ಎಂದು ಹೇಳಿ. ಪುಟ ಮಾತ್ರ ತೆರೆಯಲು “ಪುಟ” ಎಂದು ಸೇರಿಸಿ ಹೇಳಿ.`
          : `To use the ${englishPageLabels[destination.path]} page, say its name with “do”. To open it only, say “open” or “page”.`);
      }
      return;
    }

    if (/ರದ್ದು|ಬೇಡ|cancel/i.test(text)) {
      announce(isKannada
        ? "ಸರಿ, ಯಾವುದೇ ಕೆಲಸ ಮಾಡದೆ ನಿಲ್ಲಿಸಿದ್ದೇನೆ. ಮುಂದೇನು ಮಾಡಲಿ?"
        : "Okay, I cancelled that. What would you like to do next?");
      return;
    }
    announce(isKannada
      ? "ಪುಟವನ್ನು ತೆರೆಯಲು ಅದರ ಹೆಸರಿನ ಜೊತೆಗೆ “ಪುಟ” ಎಂದು ಹೇಳಿ. ಆ ಪುಟದ ಕೆಲಸ ಮಾಡಿಸಲು ಪುಟದ ಹೆಸರನ್ನು ಮಾತ್ರ ಹೇಳಿ ಅಥವಾ ಬೇಕಾದ ಕೆಲಸವನ್ನು ತಿಳಿಸಿ."
      : "To open a page, say its name with “open” or “page”. To use a page, say its name and what you want to do.");
  };

  const handlePageReady = useEffectEvent((route) => {
    if (route === "/crop" && workflowRef.current?.waitingForPage) {
      workflowRef.current.waitingForPage = false;
      askNextCropField();
    }
    const pending = pendingIntentRef.current;
    if (!pending) return;
    const targetRoutes = {
      motor: "/irrigation",
      weather: "/weather",
      soil: "/soil",
      irrigation: "/irrigation",
      disease: "/disease",
      profile: "/profile",
      about: "/about",
      contact: "/contact",
      dashboard: "/dashboard",
    };
    if (targetRoutes[pending.type] !== route) return;
    pendingIntentRef.current = null;
    if (pending.type === "motor") executePumpCommand(pending.state);
    else if (pending.type === "weather") reportWeather();
    else if (pending.type === "soil") readSoilTask();
    else if (pending.type === "irrigation") readIrrigationTask();
    else announce(pending.response);
  });

  useEffect(() => {
    const route = location.pathname;
    const timer = window.setTimeout(() => handlePageReady(route), 450);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  function startListening() {
    activeSessionRef.current = true;
    setOpen(true);
    if (canSpeak) window.speechSynthesis.resume();
    if (!SpeechRecognition) {
      activeSessionRef.current = false;
      announce(isKannada
        ? "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಲಭ್ಯವಿಲ್ಲ. Chrome ಬಳಸಿ, ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನೀಡಿ."
        : "Speech recognition is unavailable in this browser. Use Chrome and allow microphone access.", false);
      return;
    }
    if (listening) return;
    const recognition = new SpeechRecognition();
    recognition.lang = language === "kn" ? "kn-IN" : "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    commandHandledRef.current = false;
    recognition.onstart = () => {
      setListening(true);
      setStatus(isKannada ? "ಕೇಳುತ್ತಿದ್ದೇನೆ… ಸೂಚನೆ ನೀಡಿ." : "Listening… Please speak.");
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      activeSessionRef.current = false;
      announce(isKannada
        ? "ನಿಮ್ಮ ಮಾತು ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸಲಿಲ್ಲ. ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಮತ್ತು ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ, ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
        : "I couldn't hear you clearly. Check microphone permission and your internet connection, then try again.", false);
    };
    recognition.onresult = (event) => {
      const finalTranscript = Array.from(event.results)
        .filter((result) => result.isFinal)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
      const interimTranscript = Array.from(event.results)
        .filter((result) => !result.isFinal)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();

      if (interimTranscript) {
        setStatus(isKannada ? `ಕೇಳುತ್ತಿದ್ದೇನೆ… ${interimTranscript}` : `Listening… ${interimTranscript}`);
      }
      if (finalTranscript && !commandHandledRef.current) {
        commandHandledRef.current = true;
        recognition.stop();
        commandHandlerRef.current?.(finalTranscript);
      }
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      activeSessionRef.current = false;
      announce(isKannada
        ? "ಮೈಕ್ರೊಫೋನ್ ಆರಂಭಿಸಲು ಆಗಲಿಲ್ಲ. ಅನುಮತಿ ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ."
        : "I couldn't start the microphone. Check its permission and try again.", false);
    }
  }

  useEffect(() => {
    commandHandlerRef.current = handleCommand;
    listeningHandlerRef.current = startListening;
  });

  const isLogin = location.pathname === "/";

  return (
    <div className={`fixed bottom-5 z-[60] ${isLogin ? "left-5" : "left-5 md:left-[280px]"}`}>
      {open && (
        <div className="mb-3 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900" role="status" aria-live="polite">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold text-slate-800 dark:text-white"><Volume2 size={17} /> {isKannada ? "ಕನ್ನಡ ಧ್ವನಿ ಸಹಾಯಕ" : "Voice Assistant"}</span>
            <button type="button" onClick={() => { activeSessionRef.current = false; workflowRef.current = null; pendingIntentRef.current = null; recognitionRef.current?.abort(); if (canSpeak) window.speechSynthesis.cancel(); audioRef.current?.pause(); setOpen(false); }} aria-label={isKannada ? "ಸಹಾಯಕ ಮುಚ್ಚಿ" : "Close assistant"} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X size={18} /></button>
          </div>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{status}</p>
        </div>
      )}
      <button
        type="button"
        onClick={startListening}
        disabled={listening}
        aria-label={listening
          ? isKannada ? "ಧ್ವನಿ ಕೇಳಲಾಗುತ್ತಿದೆ" : "Listening"
          : isKannada ? "ಕನ್ನಡ ಧ್ವನಿ ಸಹಾಯಕ ಪ್ರಾರಂಭಿಸಿ" : "Start voice assistant"}
        title={isKannada ? "ಕನ್ನಡ ಧ್ವನಿ ಸಹಾಯಕ" : "Voice Assistant"}
        className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition hover:scale-105 disabled:cursor-not-allowed ${listening ? "animate-pulse bg-rose-600" : "bg-emerald-700 hover:bg-emerald-800"}`}
      >
        {listening ? <MicOff size={23} /> : <Mic size={23} />}
      </button>
    </div>
  );
}

const spokenDigits = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ಸೊನ್ನೆ: 0, ಶೂನ್ಯ: 0, ಒಂದು: 1, ಎರಡು: 2, ಮೂರು: 3, ನಾಲ್ಕು: 4, ಐದು: 5, ಆರು: 6, ಏಳು: 7, ಎಂಟು: 8, ಒಂಬತ್ತು: 9,
};
const spokenNumbers = {
  ...spokenDigits,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
  ಹತ್ತು: 10, ಹನ್ನೊಂದು: 11, ಹನ್ನೆರಡು: 12, ಹದಿಮೂರು: 13, ಹದಿನಾಲ್ಕು: 14, ಹದಿನೈದು: 15, ಹದಿನಾರು: 16, ಹದಿನೇಳು: 17, ಹದಿನೆಂಟು: 18, ಹತ್ತೊಂಬತ್ತು: 19, ಇಪ್ಪತ್ತು: 20,
  ಇಪ್ಪತ್ತೈದು: 25, ಮೂವತ್ತು: 30, ಮೂವತ್ತೈದು: 35, ನಲವತ್ತು: 40, ನಲವತ್ತೈದು: 45, ಐವತ್ತು: 50, ಅರವತ್ತು: 60, ಎಪ್ಪತ್ತು: 70, ಎಂಬತ್ತು: 80, ತೊಂಬತ್ತು: 90, ನೂರು: 100,
};

function parseSpokenNumber(text) {
  const normalized = text.toLocaleLowerCase("kn-IN").replace(/[?!,]/g, " ").trim();
  const decimalMatch = normalized.match(/(-?\d+)\s*(?:point|ಪಾಯಿಂಟ್)\s*(\d+)/);
  if (decimalMatch) return Number(`${decimalMatch[1]}.${decimalMatch[2]}`);
  const numericMatch = text.match(/-?\d+(?:[.,]\d+)?/);
  if (numericMatch) return Number(numericMatch[0].replace(",", "."));

  const decimalParts = normalized.split(/\bpoint\b|ಪಾಯಿಂಟ್/);
  const parseWords = (part) => {
    let total = 0;
    let current = 0;
    let found = false;
    for (const word of part.trim().split(/\s+/)) {
      if (Object.hasOwn(spokenNumbers, word)) {
        const value = spokenNumbers[word];
        found = true;
        if (value === 100) {
          current = Math.max(current, 1) * 100;
          total += current;
          current = 0;
        } else if (value >= 20 && value % 10 === 0) {
          current += value;
        } else {
          current += value;
        }
      }
    }
    return found ? total + current : null;
  };

  const whole = parseWords(decimalParts[0]);
  if (whole === null) return null;
  if (decimalParts.length < 2) return whole;
  const decimal = decimalParts[1].trim().split(/\s+/).map((word) => spokenDigits[word]);
  if (!decimal.length || decimal.some((digit) => digit === undefined)) return whole;
  return Number(`${whole}.${decimal.join("")}`);
}