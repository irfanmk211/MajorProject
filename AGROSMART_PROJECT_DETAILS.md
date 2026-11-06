# AgroSmart Project Details

## Scope and evidence

This document describes the code and assets present in this repository. It does not infer unfinished behavior from labels, comments, or older documentation. In particular, the README contains unresolved merge-conflict markers and contradictory descriptions; implementation details below are based on the source files. No credentials, API-key values, Firebase identifiers, `.env` contents, or device-network addresses are reproduced here.

## 1. Project Structure

The tree below covers project-owned files. Dependency installations, build output, Python virtual environments, caches, generated training logs, and secret environment files are intentionally excluded.

```text
AgroSmart-main/
├── AGROSMART_PROJECT_DETAILS.md
├── .gitignore
├── firebase.json
├── firestore.rules
├── storage.rules
├── README.md
├── FIREBASE_SETUP.md
├── QUICK_START.md
├── IMPLEMENTATION_SUMMARY.md
├── TRAINING_README.md
├── .vscode/
│   └── settings.json
├── backend/
│   ├── .env.example
│   ├── app.py
│   ├── requirements.txt
│   ├── test_api.py
│   ├── crop_model.pkl
│   ├── plant_disease_model.keras
│   ├── best_head.weights.h5
│   ├── class_names.json
│   └── class_names.txt
├── data/
│   ├── README.md
│   ├── final/.gitkeep
│   ├── interim/.gitkeep
│   ├── processed/.gitkeep
│   └── raw/
│       ├── crops/.gitkeep
│       ├── disease/.gitkeep
│       ├── location/.gitkeep
│       ├── soil/.gitkeep
│       └── weather/.gitkeep
├── frontend/
│   ├── .gitignore
│   ├── .env.example
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── public/
│   │   ├── background.png
│   │   ├── favicon.svg
│   │   ├── icons.svg
│   │   └── images/placeholder-crop.svg
│   └── src/
│       ├── .gitignore
│       ├── App.jsx
│       ├── App.css
│       ├── index.css
│       ├── main.jsx
│       ├── config.js
│       ├── firebase.js
│       ├── firebaseTest.js
│       ├── assets/
│       │   ├── hero.png
│       │   ├── react.svg
│       │   └── vite.svg
│       ├── components/
│       │   ├── VoiceAssistant.jsx
│       │   ├── animations/FarmScene.jsx
│       │   ├── layout/
│       │   │   ├── AppLayout.jsx
│       │   │   ├── Footer.jsx
│       │   │   ├── Sidebar.jsx
│       │   │   └── TopNav.jsx
│       │   └── ui/
│       │       ├── CircularGauge.jsx
│       │       ├── ExpandableCard.jsx
│       │       ├── GlassCard.jsx
│       │       ├── PageTransition.jsx
│       │       ├── RippleButton.jsx
│       │       └── ScanAnimation.jsx
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   ├── LanguageContext.jsx
│       │   ├── ThemeContext.jsx
│       │   └── languageState.js
│       ├── data/
│       │   ├── cropImages.js
│       │   ├── diseaseInfo.js
│       │   ├── disease_info.json
│       │   ├── karnatakaLocations.js
│       │   ├── stateLocations.js
│       │   └── stateLocationTranslations.js
│       ├── pages/
│       │   ├── About.jsx
│       │   ├── Contact.jsx
│       │   ├── Crop.jsx
│       │   ├── Crop.css
│       │   ├── Dashboard.jsx
│       │   ├── Disease.jsx
│       │   ├── FarmFields.jsx
│       │   ├── Login.jsx
│       │   ├── Profile.jsx
│       │   ├── ProfileSetup.jsx
│       │   ├── SmartIrrigation.jsx
│       │   ├── SoilMonitoring.jsx
│       │   ├── Weather.jsx
│       │   └── soilirrigation.jsx
│       └── services/
│           └── farmerData.js
├── src/
│   ├── __init__.py
│   ├── data_collection/__init__.py
│   ├── deployment/__init__.py
│   ├── evaluation/__init__.py
│   ├── feature_engineering/__init__.py
│   ├── models/__init__.py
│   ├── preprocessing/__init__.py
│   └── utils/__init__.py
├── tests/
│   └── __init__.py
└── training/
    ├── __init__.py
    ├── data_loader.py
    ├── evaluate.py
    ├── train.py
    └── requirements.txt
```

### Important files and responsibilities

- `frontend/src/App.jsx` defines the React routes and wraps them in the theme, language, authentication, and router providers.
- `frontend/src/pages/` contains the routed screens. `soilirrigation.jsx` is a legacy, currently unrouted module.
- `frontend/src/services/farmerData.js` centralizes Firestore and localStorage persistence for profiles, farms, fields, photos, and sensor readings.
- `frontend/src/data/` contains disease advisory material, crop image mappings, location selections, and Kannada location translations.
- `frontend/src/config.js` provides frontend service/device configuration. Its private device address is not included here.
- `frontend/src/firebase.js` initializes Firebase Auth, Firestore, and Storage. Configuration values are deliberately omitted from this document.
- `backend/app.py` is the Flask application, model loader, and API implementation.
- `backend/*.keras`, `*.h5`, and `*.pkl` are prebuilt model artifacts; this documentation does not load or inspect pickle contents.
- `training/` contains plant-disease model training, dataset loading, and evaluation scripts.
- `data/` documents intended dataset categories. The checked-in data subfolders contain `.gitkeep` placeholders, not actual training datasets.
- Root `src/` packages are initializer-only scaffolding in this checkout; they do not contain implemented pipeline modules.
- `backend/test_api.py` is a manual HTTP smoke-test script; no implemented automated test suite was found in the `tests/` package.

## 2. Frontend Architecture

### Application and libraries

The frontend is a Vite application using React 19 and React Router. `main.jsx` mounts `App` in `React.StrictMode` and imports the global stylesheet. Main runtime dependencies include Firebase, React Router, Framer Motion, Lucide icons, and Recharts. Styling is implemented through CSS and Tailwind's Vite integration.

Provider order in `App.jsx` is `ThemeProvider` → `LanguageProvider` → `AuthProvider` → `BrowserRouter`. The shared `AppLayout` provides navigation, footer, sidebar, and authentication/profile-completion redirects for the main application pages. `VoiceAssistant` is mounted alongside the route tree.

### Routes and page behavior

| Route | Page | Purpose and observed integrations |
|---|---|---|
| `/` | `Login` | Sign-in/sign-up and guest entry through `AuthContext`; language selector. |
| `/profile-setup` | `ProfileSetup` | Collects profile/location/farm details, optionally uploads a profile photo, saves profile and creates or updates the first farm. |
| `/dashboard` | `Dashboard` | Links to modules and profile/farm management; no direct API request. |
| `/farms` | `FarmFields` | Lists/adds/edits farms and fields via `farmerData.js`; uploads field photos and selects an active field. |
| `/crop` | `Crop` | Sends seven inputs to Flask `POST /predict-crop`; shows up to five recommendations. |
| `/disease` | `Disease` | Uploads a leaf image to Flask `POST /api/predict`; displays model result and local advisory details. |
| `/soil` | `SoilMonitoring` | Polls the ESP32 `/api/data` endpoint every five seconds; attempts to save readings for the active field. |
| `/irrigation` | `SmartIrrigation` | Polls ESP32 readings and sends pump commands directly to the device. |
| `/weather` | `Weather` | Requests a seven-day forecast from Open-Meteo and separately polls ESP32 local readings. |
| `/profile` | `Profile` | Displays profile values and offers theme/language controls. The crops input and “Save Changes” control do not call a profile persistence function in this page. |
| `/about` | `About` | Descriptive project/help information; no direct API request. |
| `/contact` | `Contact` | Contact form shows a local temporary success state; it does not submit to a backend. Embeds a Google Maps iframe. |

`frontend/src/pages/soilirrigation.jsx` is not imported in `App.jsx` and has no route. It contains older calls to `GET /weather` and `POST /predict`; those endpoints are not implemented in the inspected Flask application.

### Components

- `components/layout/`: `AppLayout`, `Sidebar`, `TopNav`, and `Footer` make up the shared shell.
- `components/ui/`: reusable cards, buttons, transitions, gauges, scan animation, and expandable content.
- `components/animations/FarmScene.jsx`: animated farm scene component.
- `components/VoiceAssistant.jsx`: browser speech interaction, navigation and task flows. It calls `/api/tts/kannada`, `/predict-crop`, Open-Meteo, and ESP32 endpoints. The Flask `/api/chat` endpoint exists, but no call to it was found in the active frontend source.

### State, authentication, theme, and language

- `AuthContext.jsx` provides user/session state, login, account creation, guest login, logout, and profile saving. With Firebase configured, email/password authentication is delegated to Firebase Auth and profile data is loaded from Firestore. Its alternate demo path stores the demo session and profile in localStorage. Guest entry is also implemented with local state/localStorage.
- `AppLayout` redirects unauthenticated users to `/` and users without a completed profile to `/profile-setup`, except for guests.
- `ThemeContext.jsx` stores the light/dark choice in localStorage and toggles the root `dark` class.
- `LanguageContext.jsx` supports English and Kannada. The language state is persisted in localStorage; profile setup also stores a preferred language. Location labels have Kannada translation data for the supported location dataset.
- `Crop.jsx` stores the current input values and voice-assistant handoff data in sessionStorage. This is transient browser state, not prediction history.

### Firebase integration

`firebase.js` initializes the Firebase application and exports Auth, Firestore, and Storage clients. Its Firebase configuration is declared in source; the values are intentionally not reproduced. A frontend `.env.example` contains placeholder variables, but `firebase.js` uses its in-file configuration rather than reading those placeholders. `firebase.json` points deployment to the Firestore and Storage rules.

`firebaseTest.js` is a Firebase test/helper source file. Farmer-data operations are described in Section 4. Owner checks in `firestore.rules` restrict user data to the authenticated owner. Storage rules restrict uploads to owner paths, image content types, and files smaller than 5 MB.

### Frontend API/service calls

| Page/module | Calls |
|---|---|
| Login/Profile setup | Firebase Auth and Firestore via `AuthContext` and `farmerData.js`, when Firebase is configured. |
| Farms & Fields | Firestore/localStorage service functions; Firebase Storage for field photo upload. |
| Crop | `POST {API_BASE_URL}/predict-crop` with JSON. |
| Disease | `POST http://127.0.0.1:5000/api/predict` with multipart field `image` (the URL is hard-coded on this page). |
| Soil monitoring | `GET http://{ESP32}/api/data` every 5 seconds; may persist a throttled reading. |
| Irrigation | `GET http://{ESP32}/api/data` every 5 seconds; `GET http://{ESP32}/api/pump?state=0|1` for pump control; may persist a throttled reading. |
| Weather | `GET https://api.open-meteo.com/v1/forecast` and `GET http://{ESP32}/api/data` every 5 seconds. |
| Voice assistant | TTS, crop prediction, Open-Meteo, ESP32 sensor read and pump-control calls; also uses browser speech APIs. |
| Contact | External Google Maps embed only; form submission is local UI state. |

The device address is configurable in source, but it is omitted here. The disease page's API URL is not derived from `API_BASE_URL`, unlike the Crop page.

## 3. Backend Architecture

### Flask application and model loading

`backend/app.py` creates a Flask application with Flask-CORS enabled. It loads optional backend environment variables through `python-dotenv`. The crop recommendation artifact is sought first at a configured external Windows path and then in the backend directory. It is loaded as a pickle containing a model, label encoder, and feature names. Disease inference loads `plant_disease_model.keras` and `class_names.json` from the backend directory. Model-loading attempts run at module initialization; unavailable models cause their prediction endpoint to return a service error rather than providing a fallback prediction.

Disease image preprocessing converts the image to RGB, resizes it to 224 × 224, and applies the tensor conversion/normalization in `preprocess_image`. The model's output length is checked against the class-name list. Inference uses the highest-probability class. Predictions below 60% confidence are returned as `Unknown` / `Uncertain`.

No SQL or other persistent database connection is implemented in this Flask module. The `/sensor` endpoints use a Python module-global value and are in-memory only.

### API endpoints

| Method and path | Request | Response / behavior |
|---|---|---|
| `GET /` | None | JSON service status and message. |
| `POST /api/tts/kannada` | JSON `{ "text": "..." }` | MP3 audio response. Requires backend `GOOGLE_TTS_API_KEY`; missing configuration returns 503. Text is required and limited to 5,000 UTF-8 bytes. |
| `POST /api/chat` | JSON `{ "message": "...", "history": [...] }` (history is optional) | JSON `{ "success": true, "reply": "..." }` on success. Calls Gemini when `GEMINI_API_KEY` is configured; model can be selected with `GEMINI_MODEL`. Missing configuration returns 503. |
| `POST /predict-crop` | JSON `{ "input": [feature values...] }` | Array of up to five `{ "crop": string, "prob": number }` objects; `prob` is a percentage. Errors include JSON `{ "success": false, "error": "..." }`. |
| `POST /api/predict` | Multipart form with image field named `image` | JSON `{ "success": true, "prediction": { "plant", "disease", "label", "confidence" } }`; low-confidence output also includes `message`. Invalid input, unavailable model, and inference errors return error JSON and HTTP error status. |
| `POST /predict-disease` | Same multipart image field | Legacy alias that invokes the same disease prediction handler. |
| `POST /sensor` | JSON sensor data | Stores the submitted JSON in process memory and returns `{ "success": true, "message": "...", "data": ... }`. |
| `GET /get_sensor` | None | Returns the current in-memory sensor JSON. |

Disease uploads accept JPG/JPEG/PNG/WEBP extensions, must be nonempty and no larger than 10 MB. The uploaded file is written to a generated temporary file for inference and removed in a `finally` block. The endpoint response does not include top-k predictions; the frontend's `top_predictions` UI field defaults to an empty list.

### ML and API support files

- `crop_model.pkl`: prebuilt crop model bundle consumed by the Flask loader.
- `plant_disease_model.keras`: prebuilt disease model.
- `class_names.json` and `class_names.txt`: disease class labels used by the backend/source tooling.
- `test_api.py`: manual script for health, invalid upload, and optional prediction smoke tests. It looks for an optional test image outside this repository.
- `requirements.txt`: Flask, Flask-CORS, TensorFlow/Keras, NumPy, Pillow, scikit-learn, SciPy, pandas, and python-dotenv dependencies.

The backend prints development startup information and runs Flask on port 5000 with debug mode enabled when invoked as a script. It does not provide production WSGI configuration in the inspected file.

## 4. Farmer Profile, Farms and Fields

### Profile setup and saving

`ProfileSetup.jsx` collects preferred language, name, mobile number, gender, age, state, district, taluk/mandal, village, address, farmer category, farm size, farming type, occupation, and land ownership. The state selection data includes Karnataka, Kerala, Tamil Nadu, Andhra Pradesh, and Telangana. District and sub-district values come from local data files; Kannada display labels are provided through the translation layer. Andhra Pradesh and Telangana use mandal wording in the form.

Saving calls `AuthContext.saveProfile`, which calls `saveFarmerProfile`. The profile write adds an update timestamp and marks `profileComplete`. The form then loads the user's farms and creates a default farm from profile location and farming details, or updates the first existing farm. When Firebase is unavailable, the service uses localStorage instead.

### Firestore paths and local fallback

| Data | Firestore path |
|---|---|
| Farmer profile | `users/{uid}` |
| Farms | `users/{uid}/farms/{farmId}` |
| Fields | `users/{uid}/farms/{farmId}/fields/{fieldId}` |
| Field sensor readings | `users/{uid}/farms/{farmId}/fields/{fieldId}/readings/{readingId}` |

When Firebase is not configured, `farmerData.js` stores profiles, farms, fields, sensor readings, and active-field selection in browser localStorage under AgroSmart-prefixed keys. This data is browser-local and is not synchronized.

### Farm and field operations

`FarmFields.jsx` loads the user's farms, then loads each farm's fields. It supports creating and editing a farm (name and size) and creating/editing fields (name, village, crop, area, and optional photo). These operations call `listFarms`, `saveFarm`, `listFields`, and `saveField`. Creation uses Firestore document creation; updates use document update operations. The page has no delete operation in the inspected UI or service.

Selecting a field saves its farm/field IDs as the user's active field in localStorage. Sensor-reading association uses that active-field selection.

### Photo uploads

- Profile photo: `saveProfilePhoto` uploads to `users/{uid}/profile/{timestamped-filename}`.
- Field photo: `saveFieldPhoto` uploads to `users/{uid}/farms/{farmId}/fields/{fieldId}/{timestamped-filename}`.
- Both functions return the Firebase Storage object path. Profile setup stores that returned path as `photoURL`; the functions do not request a download URL.
- Storage rules allow owner-only image uploads smaller than 5 MB, for JPEG, PNG, or WEBP content types.

### Sensor-reading persistence

`recordSensorReading` writes readings beneath a field. In Firestore mode it verifies that the field exists and filters data to allowed string/finite-number keys (`temperature`, `humidity`, `soil`, `soil_moisture_percent`, `ldr`, `irrigation`, `pump_state`, `source`) before adding a server timestamp. Local mode appends readings to localStorage.

`recordReadingForActiveField` requires an active farm and field. It throttles readings to at most one per minute per field in the current browser and updates the throttle timestamp only after a successful write. Firestore rules make readings owner-readable and create-only; updates/deletes are denied.

## 5. Crop Recommendation Module

- **Frontend inputs:** Nitrogen, phosphorus, potassium, temperature, humidity, pH, and rainfall. The crop form uses numeric sliders with defaults and display ranges; values are converted to numbers before submission.
- **Payload:** `POST {API_BASE_URL}/predict-crop` with JSON `{ "input": [N, P, K, temperature, humidity, ph, rainfall] }`.
- **Model:** The backend loads the Random Forest-style serialized model bundle, label encoder, and feature-name list from `crop_model.pkl`. The API creates a one-row pandas DataFrame using the loaded feature names, calls `predict_proba`, and selects the five largest probabilities.
- **Response:** An array of `{ "crop": string, "prob": percentage }` results, descending by model probability.
- **Display:** `Crop.jsx` shows crop name, rank, image, and probability. Crop imagery is mapped locally with a placeholder fallback. Voice-assistant requests can hand inputs/results to the Crop page via sessionStorage and a window event.
- **Persistence:** No recommendation history is saved in Firestore or backend storage. Inputs are held in React state/sessionStorage for browser-session continuity, and prediction results are component state unless handed off from the voice flow.

The frontend's input order is fixed in the component; the backend depends on the feature list embedded in the model bundle. The repository does not include a separate authoritative crop-model training pipeline in the inspected `training/` directory.

## 6. Disease Detection Module

- **Image selection:** `Disease.jsx` accepts an image by file picker or drag/drop, creates a browser object-URL preview, and submits the image using multipart field name `image`.
- **API:** `POST http://127.0.0.1:5000/api/predict`. This page currently hard-codes the local backend URL.
- **Validation and inference:** Flask validates extension, size (10 MB maximum), and non-empty input; saves a temporary image; converts to RGB and 224 × 224 model input; then runs the Keras model. The temporary server-side file is removed after inference.
- **Classes and response:** `class_names.json` supplies the model's label mapping (81 labels in the checked-in file). The successful response includes `success` and `prediction` with plant, disease, normalized label, and confidence percentage. Below the 60% threshold the endpoint returns `Unknown`/`Uncertain` and a caution message. It does not return top predictions.
- **Display/advisories:** The page presents confidence, crop/disease display name, health/uncertain status, and a local disease advisory from `frontend/src/data/disease_info.json`, resolved by `diseaseInfo.js`. The advisory JSON contains 39 entries in this checkout; some model labels therefore have no detailed entry and receive a generic fallback advisory.
- **History and image storage:** Neither prediction records nor uploaded image files are persisted as user history. The browser preview uses an in-memory object URL, and the backend temporary file is deleted after processing.

The disease prediction endpoint's actual response is authoritative; `backend/test_api.py` contains a conditional `top_predictions` print path, but the inspected API implementation does not emit that field.

## 7. Soil Monitoring Module

- **Parameters shown/used:** The active monitoring page normalizes soil moisture from `soil_moisture_percent`, `soil_moisture`, or `soil`. When the raw value exceeds 100, it converts a 12-bit reading using assumed dry/wet calibration values and clamps the result to 0–100%. It also displays a light/day-night state from the ESP32 LDR field.
- **Data source:** The browser polls the configured ESP32 at `/api/data` every five seconds. The browser must be able to reach the device and the device web server must allow cross-origin requests.
- **Backend endpoints:** The active soil page does not call Flask `/sensor` or `/get_sensor`; those Flask routes are separate in-memory endpoints.
- **Persistence:** Each successful poll attempts `recordReadingForActiveField` with moisture, soil/raw measurement, temperature, humidity, LDR and source metadata. Actual Firestore/localStorage persistence is subject to active-field selection and the one-minute throttle described above.
- **Display limitations:** The active page displays moisture and light status, not a full nutrient/pH sensor dashboard. If the device is unavailable, it clears sensor data and displays a hardware-offline state rather than showing mock readings.

## 8. Irrigation Module

- **Readings:** `SmartIrrigation.jsx` polls the ESP32 `/api/data` endpoint every five seconds, normalizes moisture similarly to Soil Monitoring, and reads `pump_state` when present. Successful readings are also offered to the active-field sensor-reading persistence service.
- **Manual control:** Pump start/stop sends a browser request to `/api/pump?state=1` or `/api/pump?state=0`. The UI updates from the device response when `pump_state` is present; if the request fails, it reports a hardware error rather than treating the command as successful.
- **Automatic/manual mode:** Mode selection is frontend state. The UI text describes expected moisture thresholds, but the React component does not implement a local threshold-based automatic pump loop; it labels reported pump state as automatic when automatic mode is selected. Actual automatic control therefore depends on the ESP32/controller firmware, which is not present in this repository.
- **Tank gauge and event history:** Tank level is currently a fixed 85% display, explicitly labelled as static/awaiting a tank sensor. The event-history panel is descriptive UI state; no irrigation-event history is queried or saved.
- **Offline behavior:** The component clears moisture data and displays a hardware-offline warning when it cannot read the device.

## 9. Weather, Voice, and Other Implemented Integrations

- **Weather:** `Weather.jsx` calls Open-Meteo for current conditions and a seven-day forecast (temperature, humidity, precipitation, wind, weather codes, daily high/low, precipitation probability, sunrise/sunset, and UV index). Coordinates are hard-coded for four location labels; an unmatched profile location falls back to the Karnataka coordinates. The page separately polls the ESP32 local station every five seconds.
- **Voice assistant:** `VoiceAssistant.jsx` uses browser speech recognition/synthesis where available and supports voice navigation, crop recommendation inputs, weather reports, and pump tasks. It uses sessionStorage/window events for handoffs, the Flask TTS endpoint for Kannada audio, and direct ESP32 calls for live readings/control.
- **TTS and chat:** The Flask Kannada TTS endpoint uses Google Cloud Text-to-Speech when configured. The backend chat endpoint uses Gemini when configured, but no active frontend caller for `/api/chat` was found in this source inspection.
- **About and Contact:** About is informational. Contact form submission only sets a temporary success message; no email/contact API is present.

## 10. Training, Datasets, and Operational Notes

`training/train.py` defines a plant-disease trainer using ImageNet-pretrained MobileNetV2 with a frozen-base classification-head phase followed by fine-tuning, callbacks, checkpoints, and TensorBoard logs. `training/data_loader.py` discovers image classes from folders, filters classes with fewer than five images, and uses a reproducible 70/15/15 train/validation/test split. `training/evaluate.py` computes accuracy, weighted precision/recall/F1, per-class results, and a confusion matrix/report.

The data loader expects image files to be supplied in a dataset folder; the repository's `data/` subfolders are placeholders. The model artifacts in `backend/` are included, but the original dataset and a crop model training script are not present in the inspected project tree.

The root documentation files are not all reliable descriptions of current behavior: `README.md` contains merge-conflict markers, and some older summaries describe endpoints or features that are absent from the active implementation. Use the source and API behavior documented above when operating or extending this checkout.
