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

@app.route("/")
def home():
    return jsonify({
        "status": "online",
        "message": "AgroSmart AI Backend API is running successfully!"
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

        # Handle { input: [...] } or list [...] or dict { N: ..., P: ... }
        if isinstance(data, dict) and "input" in data:
            values = data["input"]
        elif isinstance(data, list):
            values = data
        elif isinstance(data, dict):
            values = [data.get(f, 0) for f in crop_features]
        else:
            values = []

        if not values or len(values) < 7:
            return jsonify({"error": "Invalid input format. Expected 7 feature parameters."}), 400

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
        return jsonify({"error": f"Crop prediction error: {str(e)}"}), 400

app.add_url_rule("/api/predict-crop", endpoint="api_predict_crop", view_func=predict_crop, methods=["POST", "OPTIONS"])


# ---------------------------------------------------------------------
# IRRIGATION & WEATHER ENDPOINTS (FOR SOIL IRRIGATION PAGE)
# ---------------------------------------------------------------------
@app.route("/weather", methods=["GET", "OPTIONS"])
def weather():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    return jsonify({
        "temperature": sensor_data.get("temperature", 28) or 28,
        "humidity": sensor_data.get("humidity", 75) or 75,
        "city": "Udupi"
    })

app.add_url_rule("/api/weather", endpoint="api_weather", view_func=weather, methods=["GET", "OPTIONS"])


@app.route("/predict", methods=["POST", "OPTIONS"])
def predict_irrigation():
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        data = request.get_json(force=True, silent=True) or {}
        soil_moisture = data.get("soil_moisture", 0)
        temp = data.get("temperature", 30)
        humidity = data.get("humidity", 60)

        # Irrigation decision logic
        needs_irrigation = 1 if (soil_moisture < 35 or humidity < 50 or temp > 35) else 0

        return jsonify({
            "prediction": needs_irrigation,
            "status": "success"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

app.add_url_rule("/api/predict", endpoint="api_predict_irrigation", view_func=predict_irrigation, methods=["POST", "OPTIONS"])


# ---------------------------------------------------------------------
# DISEASE PREDICTION ENDPOINT (FULL FRONTEND INTEGRATION)
# ---------------------------------------------------------------------
@app.route("/predict-disease", methods=["POST", "OPTIONS"])
def predict_disease():
    global disease_model
    if request.method == "OPTIONS":
        return jsonify({"status": "ok"}), 200
    try:
        file = request.files.get("file") or request.files.get("image")
        if not file or file.filename == "":
            return jsonify({"error": "No image file uploaded in request", "success": False}), 400

        # Save uploaded image
        temp_path = os.path.join(BASE_DIR, "temp_disease_image.jpg")
        file.save(temp_path)

        # Load and preprocess image (224x224x3)
        if cv2 is not None:
            img = cv2.imread(temp_path)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img_resized = cv2.resize(img_rgb, (224, 224)).astype(np.float32)
            img_batch = np.expand_dims(img_resized, axis=0)
        else:
            from PIL import Image
            img = Image.open(temp_path).convert('RGB').resize((224, 224))
            img_batch = np.expand_dims(np.array(img, dtype=np.float32), axis=0)

        # Genuine ML Model Inference (TFLite or Keras)
        if tflite_interpreter is not None:
            tflite_interpreter.set_tensor(tflite_input_details[0]['index'], img_batch)
            tflite_interpreter.invoke()
            preds = tflite_interpreter.get_tensor(tflite_output_details[0]['index'])[0]
        elif disease_model is not None:
            preds = disease_model(img_batch, training=False).numpy()[0]
        else:
            return jsonify({
                "error": "Plant Disease ML model is not loaded. Please wait for model initialization.",
                "success": False
            }), 500

        top_idx = int(np.argmax(preds))
        confidence = round(float(preds[top_idx]) * 100, 2)

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

        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass

        # Free memory immediately
        try:
            del img_batch
            del preds
            gc.collect()
        except Exception:
            pass

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
# SERVER INITIALIZATION
# =====================================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
