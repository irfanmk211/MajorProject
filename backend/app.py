import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
import json
import numpy as np
import pandas as pd
import pickle
import gc
from flask import Flask, request, jsonify
from flask_cors import CORS

# Optional imports for Disease Recognition Model
try:
    import cv2
except ImportError:
    cv2 = None

try:
    import tensorflow as tf
    try:
        tf.config.set_visible_devices([], 'GPU')
    except Exception:
        pass
    from tensorflow.keras.models import load_model
except ImportError:
    tf = None
    load_model = None

# Initialize Flask App
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=False)

@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        res = jsonify({"status": "preflight_ok"})
        res.headers["Access-Control-Allow-Origin"] = "*"
        res.headers["Access-Control-Allow-Headers"] = "*"
        res.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS"
        return res, 200

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,PUT,POST,DELETE,OPTIONS"
    return response

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request", "details": str(e), "success": False}), 400

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found", "success": False}), 404

@app.errorhandler(405)
def method_not_allowed(e):
    return jsonify({"error": "Method not allowed", "success": False}), 405

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error", "details": str(e), "success": False}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({"error": "Unhandled server exception", "details": str(e), "success": False}), 500

# Base Paths & Serialized Models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

# Crop Recommendation Model Path (defaults to local backend/ directory for Render deployment)
CROP_MODEL_PATH = os.path.join(BASE_DIR, "crop_model.pkl")
if not os.path.exists(CROP_MODEL_PATH):
    CROP_MODEL_PATH = os.path.join(MODELS_DIR, "crop_model.pkl")

# Plant Disease Recognition Model Paths (TFLite preferred for fast 20ms low-RAM execution)
DISEASE_TFLITE_PATH = os.path.join(BASE_DIR, "plant_disease_model.tflite")
if not os.path.exists(DISEASE_TFLITE_PATH):
    DISEASE_TFLITE_PATH = os.path.join(MODELS_DIR, "plant_disease_model.tflite")

DISEASE_MODEL_PATH = os.path.join(BASE_DIR, "plant_disease_model.keras")
if not os.path.exists(DISEASE_MODEL_PATH):
    DISEASE_MODEL_PATH = os.path.join(MODELS_DIR, "plant_disease_model.keras")

CLASS_NAMES_PATH = os.path.join(BASE_DIR, "class_names.txt")
if not os.path.exists(CLASS_NAMES_PATH):
    CLASS_NAMES_PATH = os.path.join(MODELS_DIR, "class_names.txt")

# Global Sensor Data Storage (IoT Telemetry)
sensor_data = {
    "temperature": 0,
    "humidity": 0,
    "soil": 0,
    "ldr": 0,
    "irrigation": "OFF"
}

# =====================================================================
# 1. CROP RECOMMENDATION MODEL (NEW MODEL FROM DATATRAIN)
# =====================================================================
print(f"[CROP MODEL] Loading model from: {CROP_MODEL_PATH}")
with open(CROP_MODEL_PATH, "rb") as f:
    crop_model_data = pickle.load(f)

crop_rf_model = crop_model_data["model"]
crop_label_encoder = crop_model_data["label_encoder"]
crop_features = crop_model_data["features"]
print(f"[CROP MODEL] Loaded successfully with {len(crop_label_encoder.classes_)} classes.")

# =====================================================================
# 2. DISEASE PREDICTION MODEL (SPACE & HANDLER FOR DISEASE RECOGNITION)
# =====================================================================
disease_model = None
tflite_interpreter = None
tflite_input_details = None
tflite_output_details = None
disease_class_names = []

# Load Disease Class Names & Agronomic Information Database
disease_info_db = {}
DISEASE_INFO_PATH = os.path.join(BASE_DIR, "disease_info.json")
if os.path.exists(DISEASE_INFO_PATH):
    with open(DISEASE_INFO_PATH, "r", encoding="utf-8") as f:
        disease_info_db = json.load(f)
    print(f"[DISEASE MODEL] Loaded {len(disease_info_db)} disease advisory records.")

if os.path.exists(CLASS_NAMES_PATH):
    with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
        disease_class_names = [line.strip() for line in f if line.strip()]
    print(f"[DISEASE MODEL] Loaded {len(disease_class_names)} class names.")

# Try initializing optimized TFLite interpreter first (takes <20MB RAM)
if tf and os.path.exists(DISEASE_TFLITE_PATH):
    try:
        tflite_interpreter = tf.lite.Interpreter(model_path=DISEASE_TFLITE_PATH)
        tflite_interpreter.allocate_tensors()
        tflite_input_details = tflite_interpreter.get_input_details()
        tflite_output_details = tflite_interpreter.get_output_details()
        print(f"[DISEASE MODEL] Loaded optimized TFLite model from: {DISEASE_TFLITE_PATH}")
    except Exception as e:
        print(f"[DISEASE MODEL] Could not initialize TFLite model: {e}")

# Fallback to Keras model if TFLite not available
if tflite_interpreter is None and load_model and os.path.exists(DISEASE_MODEL_PATH):
    try:
        disease_model = load_model(DISEASE_MODEL_PATH)
        print(f"[DISEASE MODEL] Loaded Keras model from: {DISEASE_MODEL_PATH}")
    except Exception as e:
        print(f"[DISEASE MODEL] Could not initialize Keras model: {e}")


# =====================================================================
# 3. ROUTES & ENDPOINTS
# =====================================================================

@app.route("/", methods=["GET", "OPTIONS"])
@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "status": "online",
        "message": "AgroSmart AI Backend API is running successfully!",
        "version": "2.0.0",
        "models": {
            "crop_recommendation": {
                "loaded": crop_rf_model is not None,
                "classes_count": len(crop_label_encoder.classes_) if crop_label_encoder else 0
            },
            "plant_disease": {
                "tflite_loaded": tflite_interpreter is not None,
                "keras_loaded": disease_model is not None,
                "classes_count": len(disease_class_names),
                "advisory_records": len(disease_info_db)
            }
        }
    })

# ---------------------------------------------------------------------
# CROP RECOMMENDATION ENDPOINT
# ---------------------------------------------------------------------
@app.route("/predict-crop", methods=["POST", "OPTIONS"])
def predict_crop():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json(force=True, silent=True) or {}

        # Safe feature mapping dictionary
        feature_map = {
            "N": ["N", "n", "nitrogen", "Nitrogen"],
            "P": ["P", "p", "phosphorus", "Phosphorus"],
            "K": ["K", "k", "potassium", "Potassium"],
            "temperature": ["temperature", "temp", "Temperature", "Temp"],
            "humidity": ["humidity", "humid", "Humidity"],
            "ph": ["ph", "pH", "Ph", "PH"],
            "rainfall": ["rainfall", "rain", "Rainfall", "Rain"]
        }

        values = []
        if isinstance(data, list):
            values = [float(v) for v in data[:7]]
        elif isinstance(data, dict):
            if "input" in data and isinstance(data["input"], list):
                values = [float(v) for v in data["input"][:7]]
            elif "features" in data and isinstance(data["features"], list):
                values = [float(v) for v in data["features"][:7]]
            else:
                for feat in crop_features:
                    found_val = 0.0
                    aliases = feature_map.get(feat, [feat])
                    for k in aliases:
                        if k in data and data[k] not in (None, ""):
                            try:
                                found_val = float(data[k])
                                break
                            except (ValueError, TypeError):
                                pass
                    values.append(found_val)

        if len(values) < 7:
            return jsonify({
                "error": "Invalid input. Expected 7 parameters: N, P, K, temperature, humidity, pH, rainfall.",
                "success": False
            }), 400

        df_input = pd.DataFrame([values[:7]], columns=crop_features)
        probabilities = crop_rf_model.predict_proba(df_input)[0]

        top5_indices = np.argsort(probabilities)[::-1][:5]
        result = []
        for idx in top5_indices:
            result.append({
                "crop": str(crop_label_encoder.classes_[idx]),
                "prob": round(float(probabilities[idx] * 100), 2)
            })

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": f"Crop prediction error: {str(e)}", "success": False}), 400

app.add_url_rule("/api/predict-crop", endpoint="api_predict_crop", view_func=predict_crop, methods=["POST", "OPTIONS"])


# ---------------------------------------------------------------------
# IRRIGATION & WEATHER ENDPOINTS (FOR SOIL IRRIGATION PAGE)
# ---------------------------------------------------------------------
OPENWEATHER_API_KEY = os.environ.get("OPENWEATHER_API_KEY", "")

@app.route("/weather", methods=["GET", "OPTIONS"])
def weather():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        city = request.args.get("city", "Udupi")
        lat = request.args.get("lat")
        lon = request.args.get("lon")

        weather_info = {
            "temperature": float(sensor_data.get("temperature", 28) or 28),
            "humidity": float(sensor_data.get("humidity", 75) or 75),
            "city": city,
            "description": "Clear Sky",
            "wind_speed": 12.0,
            "source": "sensor_default"
        }

        # Query OpenWeatherMap API
        try:
            import urllib.request
            if lat and lon:
                owm_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
            else:
                owm_url = f"https://api.openweathermap.org/data/2.5/weather?q={urllib.parse.quote(city)}&appid={OPENWEATHER_API_KEY}&units=metric"

            req = urllib.request.Request(owm_url, headers={"User-Agent": "AgroSmart-App/1.0"})
            with urllib.request.urlopen(req, timeout=5) as res:
                if res.status == 200:
                    data = json.loads(res.read().decode())
                    weather_info.update({
                        "temperature": round(float(data["main"]["temp"]), 1),
                        "feels_like": round(float(data["main"].get("feels_like", data["main"]["temp"])), 1),
                        "humidity": float(data["main"]["humidity"]),
                        "pressure": float(data["main"].get("pressure", 1013)),
                        "wind_speed": round(float(data.get("wind", {}).get("speed", 0) * 3.6), 1), # km/h
                        "description": data["weather"][0]["description"].capitalize() if data.get("weather") else "Clear",
                        "icon": data["weather"][0]["icon"] if data.get("weather") else "01d",
                        "city": data.get("name", city),
                        "country": data.get("sys", {}).get("country", "IN"),
                        "sunrise": data.get("sys", {}).get("sunrise"),
                        "sunset": data.get("sys", {}).get("sunset"),
                        "source": "openweathermap"
                    })
        except Exception as owm_err:
            # If OpenWeather key is still propagating or throttled, return safe fallback
            weather_info["owm_notice"] = str(owm_err)

        return jsonify(weather_info)
    except Exception as e:
        return jsonify({"error": str(e), "temperature": 28, "humidity": 75, "city": "Udupi"}), 200

app.add_url_rule("/api/weather", endpoint="api_weather", view_func=weather, methods=["GET", "OPTIONS"])


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict_irrigation():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json(force=True, silent=True) or {}
        soil_moisture = float(data.get("soil_moisture", 0) or 0)
        temp = float(data.get("temperature", 30) or 30)
        humidity = float(data.get("humidity", 60) or 60)

        # Irrigation decision logic
        needs_irrigation = 1 if (soil_moisture < 35 or humidity < 50 or temp > 35) else 0

        return jsonify({
            "prediction": needs_irrigation,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"error": str(e), "success": False}), 400

app.add_url_rule("/api/predict", endpoint="api_predict_irrigation", view_func=predict_irrigation, methods=["POST", "OPTIONS"])


# ---------------------------------------------------------------------
# PLANT LEAF BOTANICAL & OOD IMAGE VALIDATOR
# ---------------------------------------------------------------------
def validate_plant_image(pil_img):
    try:
        rgb = np.array(pil_img.convert('RGB'), dtype=np.float32)
        r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        total_pixels = rgb.shape[0] * rgb.shape[1]

        # 1. Excess Green Index (ExG): 2*G - R - B
        exg = 2 * g - r - b
        green_pixels = np.sum((exg > 15) & (g > 30))

        # 2. PIL HSV Color Space Analysis
        hsv = np.array(pil_img.convert('HSV'))
        h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

        # Botanical foliage hues: Green (28-115), Diseased Brown/Yellow (18-28 with S > 60)
        foliage_mask = (
            ((h >= 28) & (h <= 115) & (s >= 30) & (v >= 30)) |
            ((h >= 18) & (h < 28) & (s >= 65) & (v >= 30) & (g >= b))
        )
        foliage_pixels = np.sum(foliage_mask)

        # 3. Human Skin Tone Detection (R > G > B, (R - G) > 15, H in [0, 18], S in [30, 185], V > 60)
        skin_mask = (r > g) & (g > b) & ((r - g) > 15) & (h >= 0) & (h <= 18) & (s >= 30) & (s <= 185) & (v >= 60)
        skin_pixels = np.sum(skin_mask)

        foliage_ratio = foliage_pixels / total_pixels
        green_ratio = green_pixels / total_pixels
        skin_ratio = skin_pixels / total_pixels

        if skin_ratio > 0.15:
            return False, "Non-leaf image detected (Human skin or face detected). Please upload a clear photo of a plant leaf."

        if foliage_ratio < 0.20 and green_ratio < 0.15:
            return False, "The uploaded image does not appear to be a plant leaf (insufficient leaf foliage). Please upload a clear, close-up photo of a plant leaf or crop."

        return True, "Valid plant image"
    except Exception:
        return True, "Valid"


# ---------------------------------------------------------------------
# UNIVERSAL IMAGE FORMAT NORMALIZER (HANDLES ALL FORMATS & ORIENTATIONS)
# ---------------------------------------------------------------------
def normalize_image(img_bytes):
    """
    Universally converts any image format (JPEG, PNG with transparency,
    WebP, BMP, TIFF, Grayscale, CMYK, Palette, truncated streams)
    with automatic smartphone EXIF orientation correction into standard RGB.
    """
    import io
    from PIL import Image, ImageOps, ImageFile
    ImageFile.LOAD_TRUNCATED_IMAGES = True

    try:
        raw_img = Image.open(io.BytesIO(img_bytes))
    except Exception as e:
        raise ValueError(f"Corrupted or unsupported image file format: {str(e)}")

    # 1. Correct EXIF Orientation (fixes rotated smartphone photos)
    try:
        raw_img = ImageOps.exif_transpose(raw_img)
    except Exception:
        pass

    # 2. Handle transparency (RGBA, LA, Palette with alpha) by blending on white background
    if raw_img.mode in ("RGBA", "LA") or (raw_img.mode == "P" and "transparency" in raw_img.info):
        alpha_img = raw_img.convert("RGBA")
        background = Image.new("RGBA", alpha_img.size, (255, 255, 255, 255))
        blended = Image.alpha_composite(background, alpha_img)
        rgb_img = blended.convert("RGB")
    elif raw_img.mode != "RGB":
        rgb_img = raw_img.convert("RGB")
    else:
        rgb_img = raw_img

    return rgb_img


# ---------------------------------------------------------------------
# DISEASE PREDICTION ENDPOINT (BULLETPROOF IN-MEMORY IMAGE PROCESSING)
# ---------------------------------------------------------------------
@app.route("/predict-disease", methods=["POST", "OPTIONS"])
def predict_disease():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        img_bytes = None

        # 1. Check Multipart file upload
        if request.files:
            for key in ["image", "file", "photo", "upload", "leaf"]:
                if key in request.files and request.files[key].filename:
                    img_bytes = request.files[key].read()
                    break
            if not img_bytes:
                # Take first available uploaded file
                first_file = next(iter(request.files.values()), None)
                if first_file and first_file.filename:
                    img_bytes = first_file.read()

        # 2. Check JSON Base64 payload
        if not img_bytes:
            json_data = request.get_json(force=True, silent=True) or {}
            img_b64 = json_data.get("image") or json_data.get("file") or json_data.get("data")
            if img_b64 and isinstance(img_b64, str):
                if "," in img_b64:
                    img_b64 = img_b64.split(",", 1)[1]
                import base64
                img_bytes = base64.b64decode(img_b64)

        if not img_bytes:
            return jsonify({
                "error": "No image provided. Please upload an image file or provide a base64 image.",
                "success": False
            }), 400

        # Universal image normalization & format conversion
        try:
            pil_img = normalize_image(img_bytes)
        except ValueError as ve:
            return jsonify({"error": str(ve), "success": False}), 400

        # Botanical / Non-plant validation check
        is_plant, val_msg = validate_plant_image(pil_img)
        if not is_plant:
            return jsonify({
                "error": val_msg,
                "is_leaf": False,
                "success": False
            }), 400

        pil_resized = pil_img.resize((224, 224))
        img_array = np.array(pil_resized, dtype=np.float32)
        img_batch = np.expand_dims(img_array, axis=0)

        # Genuine ML Model Inference
        if tflite_interpreter is not None:
            tflite_interpreter.set_tensor(tflite_input_details[0]['index'], img_batch)
            tflite_interpreter.invoke()
            preds = tflite_interpreter.get_tensor(tflite_output_details[0]['index'])[0]
        elif disease_model is not None:
            preds = disease_model(img_batch, training=False).numpy()[0]
        else:
            return jsonify({
                "error": "Plant Disease ML model is not initialized yet.",
                "success": False
            }), 500

        top_idx = int(np.argmax(preds))
        confidence = round(float(preds[top_idx]) * 100, 2)

        # Confidence threshold check for non-leaf/uncertain images (requires at least 70% confidence)
        if confidence < 70.0:
            return jsonify({
                "error": f"The image does not clearly match any known plant disease (confidence too low: {confidence}%). Please upload a clearer, closer photo of a plant leaf.",
                "is_leaf": False,
                "success": False
            }), 400

        if disease_class_names and top_idx < len(disease_class_names):
            label = disease_class_names[top_idx]
        else:
            label = f"Class_{top_idx}"

        top_indices = np.argsort(preds)[::-1][:5]
        top_predictions = []
        for idx in top_indices:
            cls_name = disease_class_names[idx] if idx < len(disease_class_names) else f"Class_{idx}"
            top_predictions.append({
                "label": cls_name,
                "confidence": round(float(preds[idx]) * 100, 2)
            })

        # Memory Cleanup
        del img_batch
        del img_array
        del pil_img
        gc.collect()

        info_record = disease_info_db.get(label, {})

        return jsonify({
            "success": True,
            "status": "success",
            "label": label,
            "confidence": confidence,
            "prediction": {
                "label": label,
                "confidence": confidence
            },
            "disease_info": info_record,
            "top_predictions": top_predictions
        })

    except Exception as e:
        return jsonify({"error": f"Disease prediction error: {str(e)}", "success": False}), 500

app.add_url_rule("/api/predict-disease", endpoint="api_predict_disease", view_func=predict_disease, methods=["POST", "OPTIONS"])


# ---------------------------------------------------------------------
# ESP32 IOT SENSOR ENDPOINTS
# ---------------------------------------------------------------------
@app.route("/sensor", methods=["POST"])
def receive_sensor():
    global sensor_data
    try:
        sensor_data = request.get_json(force=True, silent=True) or sensor_data
        return jsonify({"message": "Sensor data received successfully", "data": sensor_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

app.add_url_rule("/api/sensor", endpoint="api_receive_sensor", view_func=receive_sensor, methods=["POST"])


@app.route("/get_sensor", methods=["GET"])
def get_sensor():
    return jsonify(sensor_data)

app.add_url_rule("/api/get_sensor", endpoint="api_get_sensor", view_func=get_sensor, methods=["GET"])


# =====================================================================
# 4. AUTOMATIC KEEP-ALIVE PINGER (PREVENTS RENDER FROM SLEEPING)
# =====================================================================
def start_keep_alive():
    import threading
    import time
    import urllib.request

    def pinger():
        time.sleep(30)
        target_url = os.environ.get("RENDER_EXTERNAL_URL", "https://agrosmart-of05.onrender.com/health")
        if not target_url.endswith("/health"):
            target_url = target_url.rstrip("/") + "/health"
        while True:
            try:
                time.sleep(600)  # Ping every 10 minutes (Render inactivity timer is 15 min)
                req = urllib.request.Request(target_url, headers={"User-Agent": "AgroSmart-KeepAlive/1.0"})
                with urllib.request.urlopen(req, timeout=15) as res:
                    print(f"[KEEP-ALIVE] Pinged {target_url} - Status {res.status}")
            except Exception as e:
                print(f"[KEEP-ALIVE] Ping notice: {e}")

    thread = threading.Thread(target=pinger, daemon=True)
    thread.start()

start_keep_alive()


# =====================================================================
# SERVER INITIALIZATION
# =====================================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

