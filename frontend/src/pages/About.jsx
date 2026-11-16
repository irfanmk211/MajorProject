import { BookOpen, Sprout, ScanLine, FlaskConical, Droplets, CloudSun, UserRound, Mic } from "lucide-react";
import PageTransition from "../components/ui/PageTransition";
import { useLanguage } from "../context/languageState";

const sections = [
  { icon: Sprout, title: "ಬೆಳೆ ಶಿಫಾರಸು", steps: ["ಎಡಭಾಗದ ಮೆನುವಿನಲ್ಲಿ ‘Crop Recommendation’ ಆಯ್ಕೆಮಾಡಿ.", "‘ಇತ್ತೀಚಿನ ಸಂವೇದಕ ಮೌಲ್ಯಗಳನ್ನು ಲೋಡ್ ಮಾಡಿ’ ಆಯ್ಕೆಮಾಡಿ; ಇದು ಲಭ್ಯವಿದ್ದರೆ N/P/K, ತಾಪಮಾನ ಮತ್ತು ಆರ್ದ್ರತೆಯನ್ನು ತುಂಬುತ್ತದೆ. pH ಮತ್ತು ಮಳೆಯ ಮೌಲ್ಯವನ್ನು ಕೈಯಾರೆ ನಮೂದಿಸಿ.", "N/P/K ಅನ್ನು mg/kg ನಲ್ಲಿ ನೀಡಿ. ‘Predict Best Crops’ ಒತ್ತಿದಾಗ ಮಾತ್ರ ಶಿಫಾರಸು ಬರುತ್ತದೆ."] },
  { icon: ScanLine, title: "ಸಸ್ಯ ರೋಗ ಪತ್ತೆ", steps: ["‘Disease Detection’ ಪುಟ ತೆರೆದು, ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣುವ ಎಲೆಯ ಚಿತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.", "ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆಯ ನಂತರ ತೋರಿಸುವ ರೋಗದ ಹೆಸರು, ವಿಶ್ವಾಸದ ಮಟ್ಟ ಮತ್ತು ಆರೈಕೆ ಸಲಹೆಗಳನ್ನು ಓದಿ.", "ಒಂದೇ ಎಲೆಯ ಸ್ಪಷ್ಟ ಚಿತ್ರ ಬಳಸಿ; ನೆರಳು, ಮಸುಕು ಮತ್ತು ಹಿನ್ನಲೆಯ ಅಡ್ಡಿಗಳನ್ನು ತಪ್ಪಿಸಿ."] },
  { icon: FlaskConical, title: "ಮಣ್ಣಿನ ಮೇಲ್ವಿಚಾರಣೆ", steps: ["‘Soil Monitoring’ ಪುಟದಲ್ಲಿ ಸಂಪರ್ಕಿತ ಕೃಷಿ ಸಾಧನದ ಸ್ಥಿತಿ ಮತ್ತು ಲಭ್ಯವಿರುವ ಮಣ್ಣಿನ ಅಳತೆಗಳನ್ನು ನೋಡಿ.", "ಸಾಧನ ಆಫ್‌ಲೈನ್ ಎಂದು ಕಂಡರೆ ಅದರ ವಿದ್ಯುತ್ ಮತ್ತು Wi-Fi ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ.", "ಸಂವೇದಕದ ಅಳತೆಗಳು ಲಭ್ಯವಿಲ್ಲದಿದ್ದರೆ, ಅವುಗಳನ್ನು ನೈಜ-ಸಮಯದ ಫಲಿತಾಂಶವೆಂದು ಊಹಿಸಬೇಡಿ."] },
  { icon: Droplets, title: "ಸ್ಮಾರ್ಟ್ ನೀರಾವರಿ ಮತ್ತು ಮೋಟಾರ್", steps: ["‘Smart Irrigation’ ಪುಟದಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ಮೋಟಾರ್ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.", "ಹಸ್ತಚಾಲಿತ ನಿಯಂತ್ರಣಕ್ಕೆ ‘ಹಸ್ತಚಾಲಿತ ಮೋಡ್’ ಆಯ್ಕೆಮಾಡಿ; ನಂತರ ಮೋಟಾರ್ ಆರಂಭಿಸಿ ಅಥವಾ ನಿಲ್ಲಿಸಿ.", "ಸ್ವಯಂ ಮೋಡ್‌ನಲ್ಲಿ ಮಣ್ಣಿನ ತೇವಾಂಶದ ಆಧಾರದ ಮೇಲೆ ನಿಯಂತ್ರಕ ಮೋಟಾರ್ ಅನ್ನು ನಿರ್ವಹಿಸುತ್ತದೆ. ಯಂತ್ರಾಂಶ ಸಂಪರ್ಕವಿಲ್ಲದೆ ನಿಯಂತ್ರಣ ಸಾಧ್ಯವಿಲ್ಲ."] },
  { icon: CloudSun, title: "ಹವಾಮಾನ", steps: ["‘Weather’ ಪುಟದಲ್ಲಿ ಲಭ್ಯವಿರುವ ಸ್ಥಳದ ಪ್ರಸ್ತುತ ಪರಿಸ್ಥಿತಿ ಮತ್ತು ಮುನ್ಸೂಚನೆಯನ್ನು ನೋಡಿ.", "ಹವಾಮಾನ ಮಾಹಿತಿ ಲೋಡ್ ಆಗದಿದ್ದರೆ ಇಂಟರ್ನೆಟ್ ಸಂಪರ್ಕ ಮತ್ತು ಹವಾಮಾನ ಸೇವೆಯ ಸಂರಚನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ."] },
  { icon: UserRound, title: "ಪ್ರೊಫೈಲ್, ಸಂಪರ್ಕ ಮತ್ತು ಸುರಕ್ಷತೆ", steps: ["‘Profile’ನಲ್ಲಿ ನಿಮ್ಮ ಖಾತೆಯ ವಿವರಗಳನ್ನು ವೀಕ್ಷಿಸಿ. ಸಹಾಯ ಅಥವಾ ಸಂದೇಶಕ್ಕಾಗಿ ‘ಸಂಪರ್ಕ’ ಪುಟ ಬಳಸಿ.", "ಹೊರಹೋಗಲು ಮೆನುವಿನ ‘ಲಾಗ್‌ಔಟ್’ ಆಯ್ಕೆಮಾಡಿ. ಬೆಳೆ ಮತ್ತು ರೋಗದ ಫಲಿತಾಂಶಗಳು ಮಾದರಿಯ ಅಂದಾಜುಗಳು; ಕೃಷಿ ನಿರ್ಧಾರಕ್ಕೂ ಮುನ್ನ ಸ್ಥಳೀಯ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಿ."] },
  { icon: Mic, title: "ಕನ್ನಡ ಧ್ವನಿ ಸಹಾಯಕ", steps: ["ಪರದೆಯ ಕೆಳಗಿನ ಎಡಭಾಗದಲ್ಲಿರುವ ಮೈಕ್ರೊಫೋನ್ ಗುಂಡಿ ಒತ್ತಿ. ಬ್ರೌಸರ್ ಕೇಳಿದಾಗ ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ನೀಡಿ; ನಂತರ ನಿಮ್ಮ ಸೂಚನೆಗಳನ್ನು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ. ಉತ್ತರಗಳೂ ಕನ್ನಡದಲ್ಲಿರುತ್ತವೆ, ಅಗತ್ಯವಿದ್ದಲ್ಲಿ NPK, pH ಮುಂತಾದ technical ಪದಗಳು ಮಾತ್ರ English ನಲ್ಲಿ ಕೇಳಿಸಬಹುದು.", "ಪುಟವನ್ನು ಮಾತ್ರ ತೆರೆಯಲು ಅದರ ಹೆಸರಿನ ಜೊತೆಗೆ ‘ಪುಟ’ ಅಥವಾ ‘puta’ ಎಂದು ಹೇಳಿ. ಉದಾಹರಣೆಗೆ, ‘ಬೆಳೆ ಶಿಫಾರಸು ಪುಟ’ ಅಥವಾ ‘ಹವಾಮಾನ ಪುಟ’. English ನಲ್ಲಿ ‘page’ ಎಂದರೂ ಪುಟ ತೆರೆದುಕೊಳ್ಳುತ್ತದೆ; ಈ ಸೂಚನೆ ಕೆಲಸವನ್ನು ಪ್ರಾರಂಭಿಸುವುದಿಲ್ಲ.", "ಕೆಲಸ ಮಾಡಲು ಪುಟದ ಹೆಸರು ಮತ್ತು ‘ಮಾಡಿ’ ಅಥವಾ ‘madi’ ಎಂದು ಹೇಳಿ. ಉದಾಹರಣೆಗೆ, ‘ಬೆಳೆ ಶಿಫಾರಸು ಮಾಡಿ’ ಎಂದರೆ Crop ಪುಟ ತೆರೆದು ಬೇಕಾದ ಮೌಲ್ಯಗಳನ್ನು ಒಂದೊಂದಾಗಿ ಕೇಳುತ್ತದೆ; ‘ಹವಾಮಾನ ವರದಿ ಮಾಡಿ’ ಎಂದರೆ Weather ಪುಟ ತೆರೆದು ಸಂಪೂರ್ಣ ವರದಿಯನ್ನು ಕನ್ನಡದಲ್ಲಿ ಓದುತ್ತದೆ.", "ಬೆಳೆ ಶಿಫಾರಸು ಕೇಳಿದಾಗ ಮೊದಲು ಸಾರಜನಕ (N), ನಂತರ ರಂಜಕ (P), ಪೊಟ್ಯಾಸಿಯಂ (K), ತಾಪಮಾನ, ತೇವಾಂಶ, ಮಣ್ಣಿನ pH ಮತ್ತು ಮಳೆಯ ಮೌಲ್ಯವನ್ನು ಕ್ರಮವಾಗಿ ಕೇಳುತ್ತದೆ. ಪ್ರತಿ ಮೌಲ್ಯವನ್ನು ಸಂಖ್ಯೆ ರೂಪದಲ್ಲಿ ಹೇಳಿ; ತಪ್ಪಾದ ಮೌಲ್ಯವನ್ನು ಸರಿಪಡಿಸಲು ಅದು ಮತ್ತೆ ಕೇಳುತ್ತದೆ. ಕೊನೆಯ ಮೌಲ್ಯದ ನಂತರ prediction ನಡೆಯುತ್ತದೆ ಮತ್ತು ಫಲಿತಾಂಶಗಳನ್ನು ಓದಿ ತೋರಿಸುತ್ತದೆ. ಎಲ್ಲಾ ಮೌಲ್ಯಗಳನ್ನು ಈಗಾಗಲೇ ತುಂಬಿದ್ದರೆ, ಬೆಳೆ ಪುಟದಲ್ಲಿ ‘ಮಾಡಿ’ ಎಂದರೆ ಉಳಿಸಿದ ಮೌಲ್ಯಗಳೊಂದಿಗೆ prediction ಮಾಡುತ್ತದೆ.", "ಉದಾಹರಣೆ: ‘ಬೆಳೆ ಶಿಫಾರಸು ಮಾಡಿ’ ಎಂದು ಹೇಳಿ; N ಕೇಳಿದಾಗ ‘90’, P ಕೇಳಿದಾಗ ‘40’ ಎಂದು ಹೇಳಿ. ಎಲ್ಲಾ ಏಳು ಮೌಲ್ಯಗಳನ್ನು ನೀಡಿದ ಮೇಲೆ ಬೆಳೆಗಳ ಫಲಿತಾಂಶ ಬರುತ್ತದೆ. ಮಧ್ಯದಲ್ಲಿ ಬೇರೆ ಪುಟಕ್ಕೆ ಹೋಗಲು ಆ ಪುಟದ ಹೆಸರಿನ ಜೊತೆಗೆ ‘ಪುಟ’ ಎಂದು ಹೇಳಿ.", "‘ಮೋಟಾರ್ ಚಾಲು ಮಾಡಿ’ ಅಥವಾ ‘ಮೋಟಾರ್ ನಿಲ್ಲಿಸಿ’ ಎಂದು ಹೇಳಿದರೆ ನೀರಾವರಿ ಪುಟ ತೆರೆದು, ಸಂಪರ್ಕಿತ ನೀರಾವರಿ ಸಾಧನಕ್ಕೆ ಆದೇಶ ಕಳುಹಿಸುತ್ತದೆ. ಮೋಟಾರ್ ಚಾಲು ಮಾಡಲು ಸಂವೇದಕದ ಮಾಹಿತಿ ಮತ್ತು ಸಾಧನದ ಸಂಪರ್ಕ ಅಗತ್ಯ; ಪುಟದಲ್ಲಿ ತೋರಿಸುವ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.", "‘ಮಣ್ಣಿನ ಮಾಹಿತಿ ಮಾಡಿ’ ಎಂದರೆ ಸಂಪರ್ಕಿತ ಸಂವೇದಕದ ಲಭ್ಯ ಅಳತೆಗಳನ್ನು ಓದುತ್ತದೆ. ‘ರೋಗ ಪತ್ತೆ ಮಾಡಿ’ ಎಂದರೆ ರೋಗ ಪತ್ತೆ ಪುಟ ತೆರೆದು ಎಲೆಯ ಚಿತ್ರ ಆಯ್ಕೆಮಾಡಲು ಕೇಳುತ್ತದೆ; ಚಿತ್ರವನ್ನು ಆಯ್ಕೆ ಮಾಡಿದ ನಂತರ ವಿಶ್ಲೇಷಣೆ ನಡೆಯುತ್ತದೆ. ಪ್ರೊಫೈಲ್, ಕೈಪಿಡಿ ಅಥವಾ ಸಂಪರ್ಕದ ಕೆಲಸಕ್ಕಾಗಿ ಅವುಗಳ ಹೆಸರಿನ ಜೊತೆಗೆ ‘ಮಾಡಿ’ ಎಂದು ಹೇಳಿ.", "ಧ್ವನಿ ಇನ್‌ಪುಟ್‌ಗೆ ಮೈಕ್ರೊಫೋನ್ ಅನುಮತಿ ಮತ್ತು ಕನ್ನಡ speech recognition ಬೆಂಬಲಿಸುವ Chrome ಮುಂತಾದ browser ಬೇಕು. ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರ ಕೇಳಲು ನಿಮ್ಮ ಸಾಧನ ಅಥವಾ browser ನಲ್ಲಿ Kannada text-to-speech voice ಸ್ಥಾಪಿತವಾಗಿರಬೇಕು. ಅಗತ್ಯ voice ಇಲ್ಲದಿದ್ದರೆ ಸಹಾಯಕ ಅದನ್ನು ಪರದೆಯ ಮೇಲೆ ತಿಳಿಸುತ್ತದೆ. ಸಂವೇದಕ ಅಥವಾ backend ಸಂಪರ್ಕವಿಲ್ಲದಿದ್ದರೆ ಸಂಬಂಧಿತ ಕಾರ್ಯ ನಡೆಯುವುದಿಲ್ಲ."] },
];

const englishSections = [
  { icon: Sprout, title: "Crop Recommendation", steps: ["Select ‘Crop Recommendation’ from the left menu.", "Use ‘Load latest sensor values’ to fill available N/P/K, temperature, and humidity readings. Enter pH and rainfall manually.", "Enter N/P/K in mg/kg, then choose ‘Predict Best Crops’ to run the prediction and review the recommendations."] },
  { icon: ScanLine, title: "Plant Disease Detection", steps: ["Open ‘Disease Detection’ and select or upload a clear image of a plant leaf.", "After image analysis, review the detected disease, confidence score, and care guidance.", "Use a clear image of a single leaf and avoid shadows, blur, and distracting backgrounds."] },
  { icon: FlaskConical, title: "Soil Monitoring", steps: ["Check the connected farm device and available soil readings on the ‘Soil Monitoring’ page.", "If the device is offline, check its power and Wi-Fi connection.", "If sensor readings are unavailable, do not treat them as real-time measurements."] },
  { icon: Droplets, title: "Smart Irrigation and Pump", steps: ["Check soil moisture and motor status on the ‘Smart Irrigation’ page.", "For manual control, select ‘Manual Mode’, then start or stop the motor.", "In automatic mode, the controller operates the motor according to soil moisture. Control requires connected hardware."] },
  { icon: CloudSun, title: "Weather", steps: ["View the current conditions and forecast for the available location on the ‘Weather’ page.", "If weather data does not load, check your internet connection and weather service configuration."] },
  { icon: UserRound, title: "Profile, Contact, and Safety", steps: ["View your account details in ‘Profile’. Use the ‘Contact’ page for help or to send a message.", "Choose ‘Logout’ from the menu to sign out. Crop and disease results are model estimates; consult a local expert before making farming decisions."] },
  { icon: Mic, title: "Kannada Voice Assistant", steps: ["Press the microphone button at the bottom-left of the screen. Allow microphone access when prompted, then speak your request in Kannada. Responses are also spoken in Kannada; some technical terms may remain in English.", "To open a page without starting an action, say its name followed by ‘ಪುಟ’ (page), for example ‘ಬೆಳೆ ಶಿಫಾರಸು ಪುಟ’ or ‘ಹವಾಮಾನ ಪುಟ’.", "To start an action, say the page name followed by ‘ಮಾಡಿ’ (do), such as ‘ಬೆಳೆ ಶಿಫಾರಸು ಮಾಡಿ’ or ‘ಹವಾಮಾನ ವರದಿ ಮಾಡಿ’. Crop recommendations ask for each input in sequence; a weather report is read aloud.", "For a crop recommendation, provide nitrogen (N), phosphorus (P), potassium (K), temperature, humidity, soil pH, and the rainfall value when prompted. Each value is checked, and the prediction starts after the final value.", "For example, say ‘ಬೆಳೆ ಶಿಫಾರಸು ಮಾಡಿ’, then provide the requested values such as N = 90 and P = 40. Say a page name followed by ‘ಪುಟ’ to navigate elsewhere.", "Say ‘ಮೋಟಾರ್ ಚಾಲು ಮಾಡಿ’ or ‘ಮೋಟಾರ್ ನಿಲ್ಲಿಸಿ’ to open irrigation and send a command to the connected irrigation device. A working sensor and device connection are required; verify the reported pump status on the page.", "Say ‘ಮಣ್ಣಿನ ಮಾಹಿತಿ ಮಾಡಿ’ to read available sensor values, or ‘ರೋಗ ಪತ್ತೆ ಮಾಡಿ’ to open disease detection and select a leaf image for analysis."] },
];

export default function About() {
  const { language } = useLanguage();
  const displayedSections = language === "en" ? englishSections : sections;

  return (
    <PageTransition className="mx-auto max-w-5xl space-y-8">
      <header className="border-b border-emerald-900/15 pb-6 dark:border-white/10">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><BookOpen size={18} /> {language === "en" ? "AGROSMART USER GUIDE" : "AGROSMART ಬಳಕೆದಾರರ ಕೈಪಿಡಿ"}</p>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">{language === "en" ? "How to Use the Application" : "ಅಪ್ಲಿಕೇಶನ್ ಬಳಸುವ ವಿಧಾನ"}</h2>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">{language === "en" ? "AgroSmart is an agriculture platform that helps with crop selection, plant disease identification, soil monitoring, and irrigation management. This guide explains how to use each section and the equipment it requires." : "AgroSmart ಬೆಳೆ ಆಯ್ಕೆ, ಸಸ್ಯ ರೋಗ ಗುರುತಿಸುವಿಕೆ, ಮಣ್ಣಿನ ಮೇಲ್ವಿಚಾರಣೆ ಮತ್ತು ನೀರಾವರಿ ನಿರ್ವಹಣೆಗೆ ಸಹಾಯ ಮಾಡುವ ಕೃಷಿ ವೇದಿಕೆ. ಈ ಕೈಪಿಡಿಯಲ್ಲಿ ಪ್ರತಿ ವಿಭಾಗದ ಬಳಕೆ ಮತ್ತು ಅಗತ್ಯ ಸಾಧನಗಳ ವಿವರಗಳಿವೆ."}</p>
      </header>

      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {displayedSections.map(({ icon: Icon, title, steps }, index) => (
          <section key={title} className="grid gap-4 py-6 sm:grid-cols-[220px_1fr]" aria-labelledby={`manual-section-${index}`}>
            <h3 id={`manual-section-${index}`} className="flex items-start gap-3 text-lg font-bold text-slate-800 dark:text-white">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"><Icon size={20} /></span>
              {title}
            </h3>
            <ol className="list-decimal space-y-2 pl-5 leading-7 text-slate-600 dark:text-slate-300">
              {steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>
        ))}
      </div>

      <aside className="border-l-4 border-amber-500 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
        {language === "en" ? <><strong>Important:</strong> Before starting the pump, check that the pipes, water source, and electrical connections are safe. Even after sending a pump command, confirm its actual status on the Irrigation page.</> : <><strong>ಮುಖ್ಯ ಸೂಚನೆ:</strong> ಮೋಟಾರ್ ಚಾಲನೆ ಮಾಡುವ ಮೊದಲು ಪೈಪ್, ನೀರಿನ ಮೂಲ ಮತ್ತು ವಿದ್ಯುತ್ ಸಂಪರ್ಕ ಸುರಕ್ಷಿತವಾಗಿದೆಯೇ ಪರಿಶೀಲಿಸಿ. ಮೋಟಾರ್ ಆದೇಶ ಸಾಧನಕ್ಕೆ ಕಳುಹಿಸಿದರೂ, ಅದರ ನೈಜ ಸ್ಥಿತಿಯನ್ನು ನೀರಾವರಿ ಪುಟದಲ್ಲಿ ದೃಢಪಡಿಸಿ.</>}
      </aside>
    </PageTransition>
  );
}
