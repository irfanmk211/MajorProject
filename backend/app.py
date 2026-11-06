import os
import json
import base64
import binascii
import numpy as np
import pandas as pd
import pickle
import urllib.error
import urllib.request
from urllib.parse import quote

from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from PIL import Image

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

# ============================================================
# TENSORFLOW
# ============================================================

try:
    import tensorflow as tf
    from tensorflow.keras.models import load_model
except ImportError as e:
    print(f"[TENSORFLOW ERROR] {e}")
    tf = None
    load_model = None


# ============================================================
# FLASK APP
# ============================================================

app = Flask(__name__)
CORS(app)


# ============================================================
# BASE DIRECTORY
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


# ============================================================
# CROP RECOMMENDATION MODEL
# ============================================================

# Change this path if your crop model is stored somewhere else.
DATATRAIN_DIR = r"C:\Users\Irfan\OneDrive\Documents\Datatrain"

CROP_MODEL_PATH = os.path.join(
    DATATRAIN_DIR,
    "crop_model.pkl"
)

# If the above path does not exist,
# search inside the backend folder.
if not os.path.exists(CROP_MODEL_PATH):

    CROP_MODEL_PATH = os.path.join(
        BASE_DIR,
        "crop_model.pkl"
    )


# ============================================================
# DISEASE MODEL
# ============================================================

DISEASE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "plant_disease_model.keras"
)

CLASS_NAMES_PATH = os.path.join(
    BASE_DIR,
    "class_names.json"
)


# ============================================================
# CONFIGURATION
# ============================================================

IMG_SIZE = 224

CONFIDENCE_THRESHOLD = 0.60

MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    "jpg",
    "jpeg",
    "png",
    "webp"
}


# ============================================================
# SENSOR DATA
# ============================================================

sensor_data = {
    "temperature": 0,
    "humidity": 0,
    "soil": 0,
    "ldr": 0,
    "irrigation": "OFF"
}


# ============================================================
# CROP MODEL UNPICKLER
# ============================================================

class NumpyCompatibleUnpickler(pickle.Unpickler):

    def find_class(self, module, name):

        if module.startswith("numpy._core"):

            module = module.replace(
                "numpy._core",
                "numpy.core",
                1
            )

        return super().find_class(
            module,
            name
        )


# ============================================================
# LOAD CROP MODEL
# ============================================================

crop_rf_model = None
crop_label_encoder = None
crop_features = []


print()
print("=" * 60)
print("Loading Crop Recommendation Model")
print("=" * 60)

print(
    f"[CROP MODEL] Path: {CROP_MODEL_PATH}"
)


try:

    if os.path.exists(CROP_MODEL_PATH):

        with open(
            CROP_MODEL_PATH,
            "rb"
        ) as f:

            crop_model_data = (
                NumpyCompatibleUnpickler(f).load()
            )

        crop_rf_model = (
            crop_model_data["model"]
        )

        crop_label_encoder = (
            crop_model_data["label_encoder"]
        )

        crop_features = (
            crop_model_data["features"]
        )

        print(
            "[CROP MODEL] Loaded successfully"
        )

        print(
            f"[CROP MODEL] Classes: "
            f"{len(crop_label_encoder.classes_)}"
        )

    else:

        print(
            "[CROP MODEL] File not found."
        )

        print(
            "[CROP MODEL] Crop prediction "
            "will be unavailable."
        )

except Exception as e:

    print(
        f"[CROP MODEL] Error loading model: {e}"
    )

    crop_rf_model = None
    crop_label_encoder = None
    crop_features = []


# ============================================================
# LOAD DISEASE MODEL
# ============================================================

disease_model = None
disease_class_names = []


print()
print("=" * 60)
print("Loading Plant Disease Model")
print("=" * 60)

print(
    f"[DISEASE MODEL] Model path:"
)
print(
    DISEASE_MODEL_PATH
)

print(
    f"[DISEASE MODEL] Classes path:"
)
print(
    CLASS_NAMES_PATH
)


if (
    load_model is not None
    and os.path.exists(DISEASE_MODEL_PATH)
    and os.path.exists(CLASS_NAMES_PATH)
):

    try:

        print(
            "[DISEASE MODEL] Loading model..."
        )

        disease_model = load_model(
            DISEASE_MODEL_PATH
        )

        print(
            "[DISEASE MODEL] Model loaded successfully."
        )

        # ----------------------------------------------------
        # Load class names
        # ----------------------------------------------------

        with open(
            CLASS_NAMES_PATH,
            "r",
            encoding="utf-8"
        ) as f:

            disease_class_names = json.load(f)

        print(
            "[DISEASE MODEL] Loaded "
            f"{len(disease_class_names)} classes."
        )

        print(
            "[DISEASE MODEL] Classes:"
        )

        for i, class_name in enumerate(
            disease_class_names
        ):

            print(
                f"  {i}: {class_name}"
            )

        # ----------------------------------------------------
        # Verify model output
        # ----------------------------------------------------

        try:

            output_shape = (
                disease_model.output_shape
            )

            print(
                f"[DISEASE MODEL] Output shape: "
                f"{output_shape}"
            )

        except Exception:
            pass

    except Exception as e:

        print(
            "[DISEASE MODEL] "
            f"Could not load model: {e}"
        )

        disease_model = None
        disease_class_names = []

else:

    print(
        "[DISEASE MODEL] Model or "
        "class_names.json not found."
    )

    print(
        f"Expected model: "
        f"{DISEASE_MODEL_PATH}"
    )

    print(
        f"Expected classes: "
        f"{CLASS_NAMES_PATH}"
    )


# ============================================================
# ALLOWED FILE CHECK
# ============================================================

def allowed_file(filename):

    if not filename:
        return False

    if "." not in filename:
        return False

    extension = filename.rsplit(
        ".",
        1
    )[1].lower()

    return extension in ALLOWED_EXTENSIONS


# ============================================================
# PARSE DISEASE LABEL
# ============================================================

def parse_label(label_str):

    """
    Converts labels such as:

        Tomato_EarlyBlight
        Tomato_Healthy
        BlackPepper_PolluDisease
        Rice___Bacterial_leaf_blight

    into:

        plant
        disease
        original label
    """

    try:

        # ----------------------------------------------------
        # Format:
        # Plant___Disease
        # ----------------------------------------------------

        if "___" in label_str:

            parts = label_str.split(
                "___",
                1
            )

            plant = (
                parts[0]
                .replace("_", " ")
                .strip()
            )

            if len(parts) > 1:

                disease = (
                    parts[1]
                    .replace("_", " ")
                    .strip()
                )

            else:

                disease = "Unknown"

        # ----------------------------------------------------
        # Format:
        # Plant_Disease
        # ----------------------------------------------------

        else:

            parts = label_str.split("_")

            if len(parts) >= 2:

                plant = parts[0].strip()

                disease = " ".join(
                    parts[1:]
                ).strip()

            else:

                plant = "Unknown"

                disease = (
                    label_str
                    .replace("_", " ")
                    .strip()
                )

        return (
            plant,
            disease,
            label_str
        )

    except Exception as e:

        print(
            f"[LABEL ERROR] {e}"
        )

        return (
            "Unknown",
            "Unknown",
            label_str
        )


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def preprocess_image(image_path):

    """
    Prepare image for the trained MobileNetV2 model.

    IMPORTANT:
    The trained model already contains its own
    MobileNetV2 preprocessing layer.

    Therefore:
        DO NOT use preprocess_input() here.

    Input:
        Original RGB image

    Output:
        (1, 224, 224, 3)

    Values:
        0 - 255
    """

    try:

        print()
        print(
            "[IMAGE] Opening image:"
        )

        print(
            image_path
        )

        # ----------------------------------------------------
        # Verify file exists
        # ----------------------------------------------------

        if not os.path.exists(image_path):

            print(
                "[IMAGE] File does not exist."
            )

            return None

        # ----------------------------------------------------
        # Open image
        # ----------------------------------------------------

        img = Image.open(
            image_path
        )

        print(
            f"[IMAGE] Original size: "
            f"{img.size}"
        )

        print(
            f"[IMAGE] Original mode: "
            f"{img.mode}"
        )

        # ----------------------------------------------------
        # Convert to RGB
        # ----------------------------------------------------

        img = img.convert(
            "RGB"
        )

        # ----------------------------------------------------
        # Resize
        # ----------------------------------------------------

        img = img.resize(
            (
                IMG_SIZE,
                IMG_SIZE
            ),
            Image.Resampling.LANCZOS
        )

        # ----------------------------------------------------
        # Convert to NumPy
        # ----------------------------------------------------

        img_array = np.asarray(
            img,
            dtype=np.float32
        )

        # ----------------------------------------------------
        # Add batch dimension
        # ----------------------------------------------------

        img_batch = np.expand_dims(
            img_array,
            axis=0
        )

        print(
            f"[IMAGE] Processed shape: "
            f"{img_batch.shape}"
        )

        print(
            f"[IMAGE] Data type: "
            f"{img_batch.dtype}"
        )

        print(
            f"[IMAGE] Data range: "
            f"{img_batch.min():.2f} - "
            f"{img_batch.max():.2f}"
        )

        print(
            "[IMAGE] Image processed successfully."
        )

        return img_batch

    except Exception as e:

        print(
            "[IMAGE] Error preprocessing image:"
        )

        print(
            f"{type(e).__name__}: {e}"
        )

        return None


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return jsonify({

        "status": "online",

        "message":
            "AgroSmart AI Backend API "
            "is running successfully!"

    })


@app.route("/api/tts/kannada", methods=["POST"])
def synthesize_kannada():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    text = data.get("text")
    if not isinstance(text, str) or not text.strip():
        return jsonify({"error": "Speech text is required."}), 400
    if len(text.encode("utf-8")) > 5000:
        return jsonify({"error": "Speech text must be 5000 bytes or fewer."}), 413

    api_key = os.environ.get("GOOGLE_TTS_API_KEY")
    if not api_key:
        return jsonify({
            "error": "Kannada speech is not configured. Set GOOGLE_TTS_API_KEY on the backend."
        }), 503

    payload = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": "kn-IN"},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": 0.95},
    }).encode("utf-8")
    endpoint = (
        "https://texttospeech.googleapis.com/v1/text:synthesize"
        f"?key={quote(api_key)}"
    )
    api_request = urllib.request.Request(
        endpoint,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(api_request, timeout=20) as api_response:
            result = json.loads(api_response.read().decode("utf-8"))
    except urllib.error.HTTPError:
        return jsonify({"error": "Kannada speech service rejected the request."}), 502
    except urllib.error.URLError:
        return jsonify({"error": "Kannada speech service could not be reached."}), 502

    audio_content = result.get("audioContent")
    if not isinstance(audio_content, str):
        return jsonify({"error": "Kannada speech service returned no audio."}), 502

    try:
        audio = base64.b64decode(audio_content, validate=True)
    except (ValueError, binascii.Error):
        return jsonify({"error": "Kannada speech service returned invalid audio."}), 502
    return Response(audio, mimetype="audio/mpeg")


# ============================================================
# KANNADA CHAT ASSISTANT
# ============================================================

@app.route(
    "/api/chat",
    methods=["POST"]
)
def chat():

    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({
            "success": False,
            "error": "A JSON request body is required."
        }), 400

    message = data.get("message")

    if not isinstance(message, str) or not message.strip():
        return jsonify({
            "success": False,
            "error": "Please enter a question."
        }), 400

    if len(message) > 4000:
        return jsonify({
            "success": False,
            "error": "The question is too long."
        }), 413

    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        return jsonify({
            "success": False,
            "error": "AI_NOT_CONFIGURED"
        }), 503

    history = data.get("history", [])
    contents = []
    saw_user_turn = False

    if isinstance(history, list):
        for turn in history[-12:]:
            if not isinstance(turn, dict):
                continue

            turn_text = turn.get("text")
            turn_role = turn.get("role")

            if not isinstance(turn_text, str) or not turn_text.strip():
                continue

            if turn_role == "user":
                role = "user"
                saw_user_turn = True
            elif turn_role == "assistant" and saw_user_turn:
                role = "model"
            else:
                continue

            contents.append({
                "role": role,
                "parts": [{"text": turn_text[:4000]}]
            })

    contents.append({
        "role": "user",
        "parts": [{"text": message.strip()}]
    })

    model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(model, safe='')}:generateContent"
    )
    payload = {
        "systemInstruction": {
            "parts": [{
                "text": (
                    "ನೀವು AgroSmart ಕೃಷಿ ಅಪ್ಲಿಕೇಶನ್‌ನ ಸಹಾಯಕರು. "
                    "ಬಳಕೆದಾರರು ಕನ್ನಡದಲ್ಲಿ ಅಥವಾ ಕನ್ನಡ-ಇಂಗ್ಲಿಷ್ ಮಿಶ್ರವಾಗಿ "
                    "ಕೇಳಬಹುದು. ಪ್ರತಿಯೊಂದು ಉತ್ತರವನ್ನು ಸರಳ, ಸಹಜ ಕನ್ನಡದಲ್ಲಿ ನೀಡಿ; "
                    "ಅಗತ್ಯವಿದ್ದಾಗ technical English ಪದಗಳನ್ನು ಉಳಿಸಬಹುದು. "
                    "ಹಿಂದಿನ ಸಂಭಾಷಣೆಯ ಸಂದರ್ಭವನ್ನು ಬಳಸಿ. AgroSmart ವೈಶಿಷ್ಟ್ಯಗಳ "
                    "ಬಗ್ಗೆ ತಿಳಿದಿರುವುದನ್ನು ವಿವರಿಸಿ. live sensor ಅಥವಾ ಹವಾಮಾನ "
                    "ಮಾಹಿತಿ ನಿಮ್ಮ ಬಳಿ ಇಲ್ಲದಿದ್ದರೆ ಇದೆ ಎಂದು ಹೇಳಬೇಡಿ. ಬೆಳೆ, "
                    "ರೋಗ ಅಥವಾ ರಾಸಾಯನಿಕ ಬಳಕೆಯ ಬಗ್ಗೆ ಖಚಿತವಲ್ಲದ ಸಲಹೆಯನ್ನು "
                    "ನೀಡಬೇಡಿ; ಅಗತ್ಯವಿದ್ದರೆ ಸ್ಥಳೀಯ ಕೃಷಿ ತಜ್ಞರನ್ನು ಸಂಪರ್ಕಿಸಲು ಹೇಳಿ. "
                    "ಸಾಧನದ command ಅನ್ನು ನಿಜವಾಗಿ ಕಾರ್ಯಗತಗೊಳಿಸಲಾಗಿದೆ ಎಂದು "
                    "ಹೇಳಬೇಡಿ; command ಅನ್ನು ಅಪ್ಲಿಕೇಶನ್ ನಿರ್ವಹಿಸುತ್ತದೆ."
                )
            }]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 900
        }
    }
    api_request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(api_request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        print(f"[CHAT ERROR] Gemini returned HTTP {error.code}")
        return jsonify({
            "success": False,
            "error": "AI_SERVICE_ERROR"
        }), 502
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
        print(f"[CHAT ERROR] {type(error).__name__}: {error}")
        return jsonify({
            "success": False,
            "error": "AI_SERVICE_UNAVAILABLE"
        }), 502

    candidates = result.get("candidates", [])
    if not candidates:
        return jsonify({
            "success": False,
            "error": "AI returned no answer. Please rephrase the question."
        }), 502

    parts = candidates[0].get("content", {}).get("parts", [])
    reply = "\n".join(
        part.get("text", "")
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str)
    ).strip()

    if not reply:
        return jsonify({
            "success": False,
            "error": "AI returned an empty answer. Please rephrase the question."
        }), 502

    return jsonify({
        "success": True,
        "reply": reply
    })


# ============================================================
# CROP PREDICTION
# ============================================================

@app.route(
    "/predict-crop",
    methods=["POST"]
)
def predict_crop():

    try:

        if crop_rf_model is None:

            return jsonify({

                "success": False,

                "error":
                    "Crop recommendation model "
                    "is not loaded."

            }), 503


        data = request.get_json(
            silent=True
        )


        if not data:

            return jsonify({

                "success": False,

                "error":
                    "No JSON data received."

            }), 400


        if "input" not in data:

            return jsonify({

                "success": False,

                "error":
                    "Missing 'input' field."

            }), 400


        values = data["input"]


        df_input = pd.DataFrame(
            [values],
            columns=crop_features
        )


        probabilities = (
            crop_rf_model
            .predict_proba(
                df_input
            )[0]
        )


        top5_indices = (
            np.argsort(
                probabilities
            )[::-1][:5]
        )


        result = []


        for idx in top5_indices:

            result.append({

                "crop":
                    str(
                        crop_label_encoder
                        .classes_[idx]
                    ),

                "prob":
                    round(
                        float(
                            probabilities[idx]
                            * 100
                        ),
                        2
                    )

            })


        return jsonify(
            result
        )


    except Exception as e:

        print(
            f"[CROP PREDICTION ERROR] {e}"
        )

        return jsonify({

            "success": False,

            "error":
                f"Crop prediction error: {str(e)}"

        }), 400


# ============================================================
# DISEASE PREDICTION
# ============================================================

@app.route(
    "/api/predict",
    methods=["POST"]
)
def predict_disease():

    try:

        print()
        print("=" * 60)
        print("NEW DISEASE PREDICTION REQUEST")
        print("=" * 60)


        # ----------------------------------------------------
        # CHECK IMAGE
        # ----------------------------------------------------

        if "image" not in request.files:

            print(
                "[ERROR] Image field missing."
            )

            return jsonify({

                "success": False,

                "error":
                    "No image field in request. "
                    "Use field name 'image'."

            }), 400


        file = request.files[
            "image"
        ]


        # ----------------------------------------------------
        # CHECK FILE NAME
        # ----------------------------------------------------

        if not file.filename:

            print(
                "[ERROR] Empty filename."
            )

            return jsonify({

                "success": False,

                "error":
                    "No file selected."

            }), 400


        print(
            f"[UPLOAD] Filename: "
            f"{file.filename}"
        )


        # ----------------------------------------------------
        # CHECK EXTENSION
        # ----------------------------------------------------

        if not allowed_file(
            file.filename
        ):

            print(
                "[ERROR] Invalid file extension."
            )

            return jsonify({

                "success": False,

                "error":
                    "Invalid file type. "
                    "Allowed: "
                    + ", ".join(
                        sorted(
                            ALLOWED_EXTENSIONS
                        )
                    )

            }), 400


        # ----------------------------------------------------
        # CHECK FILE SIZE
        # ----------------------------------------------------

        file.seek(
            0,
            os.SEEK_END
        )

        file_size = file.tell()

        file.seek(0)


        print(
            f"[UPLOAD] File size: "
            f"{file_size / (1024 * 1024):.2f} MB"
        )


        if file_size == 0:

            return jsonify({

                "success": False,

                "error":
                    "Uploaded file is empty."

            }), 400


        if file_size > MAX_FILE_SIZE:

            return jsonify({

                "success": False,

                "error":
                    "File too large. "
                    f"Maximum size is "
                    f"{MAX_FILE_SIZE / (1024 * 1024):.1f} MB."

            }), 400


        # ----------------------------------------------------
        # CHECK MODEL
        # ----------------------------------------------------

        if disease_model is None:

            print(
                "[ERROR] Disease model is not loaded."
            )

            return jsonify({

                "success": False,

                "error":
                    "Disease prediction model "
                    "is not loaded."

            }), 503


        if not disease_class_names:

            print(
                "[ERROR] Class names are not loaded."
            )

            return jsonify({

                "success": False,

                "error":
                    "class_names.json is not loaded."

            }), 503


        # ----------------------------------------------------
        # TEMP IMAGE PATH
        # ----------------------------------------------------

        temp_path = os.path.join(

            BASE_DIR,

            "temp_"
            + os.urandom(8).hex()
            + ".png"

        )


        print(
            f"[UPLOAD] Temporary path: "
            f"{temp_path}"
        )


        # ----------------------------------------------------
        # SAVE IMAGE
        # ----------------------------------------------------

        file.save(
            temp_path
        )


        try:

            # ------------------------------------------------
            # PREPROCESS
            # ------------------------------------------------

            img_batch = preprocess_image(
                temp_path
            )


            if img_batch is None:

                return jsonify({

                    "success": False,

                    "error":
                        "Could not process image. "
                        "Ensure it is a valid JPG, JPEG, "
                        "PNG, or WEBP image."

                }), 400


            # ------------------------------------------------
            # MODEL PREDICTION
            # ------------------------------------------------

            print(
                "[PREDICTION] Running model..."
            )


            predictions = (
                disease_model.predict(
                    img_batch,
                    verbose=0
                )[0]
            )


            print(
                "[PREDICTION] Model prediction completed."
            )


            # ------------------------------------------------
            # VERIFY OUTPUT
            # ------------------------------------------------

            if len(predictions) != len(
                disease_class_names
            ):

                print(
                    "[ERROR] Model output does not "
                    "match class names."
                )

                print(
                    f"Model outputs: "
                    f"{len(predictions)}"
                )

                print(
                    f"Class names: "
                    f"{len(disease_class_names)}"
                )

                return jsonify({

                    "success": False,

                    "error":
                        "Model output classes do not "
                        "match class_names.json."

                }), 500


            # ------------------------------------------------
            # TOP PREDICTION
            # ------------------------------------------------

            top_idx = int(
                np.argmax(
                    predictions
                )
            )


            top_confidence = (
                float(
                    predictions[
                        top_idx
                    ]
                )
                * 100
            )


            top_label = (
                disease_class_names[
                    top_idx
                ]
            )


            # ------------------------------------------------
            # PARSE LABEL
            # ------------------------------------------------

            plant, disease, label = (
                parse_label(
                    top_label
                )
            )


            print()
            print(
                "----------------------------------------"
            )

            print(
                f"[PREDICTION] Plant: "
                f"{plant}"
            )

            print(
                f"[PREDICTION] Disease: "
                f"{disease}"
            )

            print(
                f"[PREDICTION] Label: "
                f"{label}"
            )

            print(
                f"[PREDICTION] Confidence: "
                f"{top_confidence:.2f}%"
            )

            print(
                "----------------------------------------"
            )


            # ------------------------------------------------
            # LOW CONFIDENCE
            # ------------------------------------------------

            if (
                top_confidence
                < CONFIDENCE_THRESHOLD * 100
            ):

                print(
                    "[PREDICTION] Low confidence."
                )


                return jsonify({

                    "success": True,

                    "prediction": {

                        "plant":
                            "Unknown",

                        "disease":
                            "Uncertain",

                        "label":
                            "Unknown",

                        "confidence":
                            round(
                                top_confidence,
                                2
                            )

                    },

                    "message":
                        f"Prediction confidence is "
                        f"{top_confidence:.1f}%. "
                        "Please upload a clearer "
                        "plant leaf image."

                })


            # ------------------------------------------------
            # SUCCESS
            # ------------------------------------------------

            return jsonify({

                "success": True,

                "prediction": {

                    "plant":
                        plant,

                    "disease":
                        disease,

                    "label":
                        label,

                    "confidence":
                        round(
                            top_confidence,
                            2
                        )

                }

            })


        finally:

            # ------------------------------------------------
            # DELETE TEMP FILE
            # ------------------------------------------------

            if os.path.exists(
                temp_path
            ):

                try:

                    os.remove(
                        temp_path
                    )

                    print(
                        "[FILE] Temporary image deleted."
                    )

                except Exception as e:

                    print(
                        f"[FILE] Could not delete "
                        f"temporary image: {e}"
                    )


    except Exception as e:

        print()
        print(
            "[DISEASE PREDICTION ERROR]"
        )

        print(
            f"{type(e).__name__}: {e}"
        )


        return jsonify({

            "success": False,

            "error":
                f"Prediction error: {str(e)}"

        }), 500


# ============================================================
# LEGACY DISEASE ENDPOINT
# ============================================================

@app.route(
    "/predict-disease",
    methods=["POST"]
)
def predict_disease_legacy():

    return predict_disease()


# ============================================================
# SENSOR POST
# ============================================================

@app.route(
    "/sensor",
    methods=["POST"]
)
def receive_sensor():

    global sensor_data

    try:

        data = request.get_json(
            silent=True
        )


        if data is None:

            return jsonify({

                "success": False,

                "error":
                    "Invalid JSON data."

            }), 400


        sensor_data = data


        return jsonify({

            "success": True,

            "message":
                "Sensor data received successfully",

            "data":
                sensor_data

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "error":
                str(e)

        }), 400


# ============================================================
# SENSOR GET
# ============================================================

@app.route(
    "/get_sensor",
    methods=["GET"]
)
def get_sensor():

    return jsonify(
        sensor_data
    )


# ============================================================
# SERVER START
# ============================================================

if __name__ == "__main__":

    print()
    print("=" * 60)
    print("              AgroSmart AI Backend")
    print("=" * 60)

    print(
        f"Disease Model: "
        f"{'LOADED' if disease_model is not None else 'NOT LOADED'}"
    )

    print(
        f"Classes: "
        f"{len(disease_class_names)}"
    )

    print(
        f"Image Size: "
        f"{IMG_SIZE} x {IMG_SIZE}"
    )

    print(
        "Disease API:"
    )

    print(
        "http://127.0.0.1:5000/api/predict"
    )

    print(
        "Server:"
    )

    print(
        "http://127.0.0.1:5000"
    )

    print("=" * 60)
    print()


    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )