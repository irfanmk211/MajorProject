import os
import json
import base64
import binascii
import hashlib
import hmac
import numpy as np
import pandas as pd
import pickle
import secrets
import threading
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from io import BytesIO
from urllib.parse import quote

import cloudinary
import cloudinary.uploader
import firebase_admin
from firebase_admin import auth as firebase_auth, credentials, firestore as admin_firestore, messaging
from flask import Flask, Response, request, jsonify
from flask_cors import CORS
from PIL import Image

try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
except ImportError:
    pass

# ============================================================
# LITERT
# ============================================================

try:
    from ai_edge_litert.interpreter import Interpreter
except ImportError as e:
    print(f"[LITERT ERROR] {e}")
    Interpreter = None


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

CROP_MODEL_PATH = os.path.join(BASE_DIR, "crop_model.pkl")


# ============================================================
# DISEASE MODEL
# ============================================================

DISEASE_MODEL_PATH = os.path.join(
    BASE_DIR,
    "plant_disease_model.tflite"
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
MAX_IMAGE_UPLOAD_SIZE = 5 * 1024 * 1024

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
disease_input_details = None
disease_output_details = None
disease_class_names = []
disease_inference_lock = threading.Lock()


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
    Interpreter is not None
    and os.path.exists(DISEASE_MODEL_PATH)
    and os.path.exists(CLASS_NAMES_PATH)
):

    try:

        print(
            "[DISEASE MODEL] Loading model..."
        )

        disease_model = Interpreter(
            model_path=DISEASE_MODEL_PATH,
            num_threads=1
        )
        disease_model.allocate_tensors()
        disease_input_details = disease_model.get_input_details()[0]
        disease_output_details = disease_model.get_output_details()[0]

        print(
            "[DISEASE MODEL] LiteRT model loaded successfully."
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
        print(
            f"[DISEASE MODEL] Output shape: "
            f"{disease_output_details['shape']}"
        )

    except Exception as e:

        print(
            "[DISEASE MODEL] "
            f"Could not load model: {e}"
        )

        disease_model = None
        disease_input_details = None
        disease_output_details = None
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


def get_firebase_admin_app():
    try:
        return firebase_admin.get_app("agrosmart-upload-auth")
    except ValueError:
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
        if not service_account_json:
            raise RuntimeError("Firebase Admin credentials are not configured.")
        try:
            service_account = json.loads(service_account_json)
        except json.JSONDecodeError as error:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.") from error
        expected_project = os.environ.get("FIREBASE_PROJECT_ID", "agrosmart-mp")
        if service_account.get("project_id") != expected_project:
            raise RuntimeError(f"Firebase service account must belong to {expected_project}.")
        return firebase_admin.initialize_app(
            credentials.Certificate(service_account),
            name="agrosmart-upload-auth",
        )


def verify_user_request():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    try:
        admin_app = get_firebase_admin_app()
        return firebase_auth.verify_id_token(
            authorization.removeprefix("Bearer "),
            app=admin_app,
        )
    except RuntimeError as error:
        print(f"[FIREBASE AUTH CONFIG ERROR] {error}")
        return None
    except firebase_admin.exceptions.FirebaseError as error:
        error_code = getattr(error, "code", "unknown")
        print(f"[FIREBASE AUTH VERIFY ERROR] {type(error).__name__} (code={error_code})")
        return None


def verify_device_request(admin_app):
    device_id = request.headers.get("X-AgroSmart-Device", "").replace(":", "").replace("-", "").lower()
    device_token = request.headers.get("X-AgroSmart-Token", "")
    if len(device_id) != 12 or any(character not in "0123456789abcdef" for character in device_id):
        return None
    if len(device_token) < 32 or len(device_token) > 128:
        return None

    firestore = admin_firestore.client(app=admin_app)
    device_query = firestore.collection_group("devices").where("deviceId", "==", device_id).limit(1).get()
    if not device_query:
        return None
    device_ref = device_query[0].reference
    device = device_query[0].to_dict() or {}
    expected_hash = device.get("tokenHash", "")
    token_hash = hashlib.sha256(device_token.encode("utf-8")).hexdigest()
    if not expected_hash or not hmac.compare_digest(expected_hash, token_hash):
        return None
    return firestore, device_ref, device


def send_user_pushes(firestore, user_id, title, body, data):
    tokens = firestore.collection("users", user_id, "notification_tokens").stream()
    for token_doc in tokens:
        token = token_doc.to_dict().get("token")
        if not token:
            continue
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data={key: str(value) for key, value in data.items()},
            token=token,
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    icon="/favicon.svg",
                    data=data,
                    actions=[
                        {"action": "continue", "title": "Continue"},
                        {"action": "stop", "title": "Stop"},
                    ] if data.get("type") == "manual_timer_expired" else [],
                ),
                fcm_options=messaging.WebpushFCMOptions(link="/irrigation"),
            ),
        )
        try:
            messaging.send(message, app=get_firebase_admin_app())
        except firebase_admin.exceptions.FirebaseError as error:
            print(f"[PUSH ERROR] Could not notify user {user_id}: {error}")


@app.route("/api/uploads/images", methods=["POST"])
def upload_image():
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return jsonify({"error": "Sign in before uploading an image."}), 401

    try:
        admin_app = get_firebase_admin_app()
    except RuntimeError as error:
        print(f"[IMAGE UPLOAD CONFIG ERROR] {error}")
        return jsonify({"error": "Image uploads are not configured on the backend."}), 503

    try:
        decoded_token = firebase_auth.verify_id_token(
            authorization.removeprefix("Bearer "),
            app=admin_app,
        )
    except (firebase_admin.exceptions.FirebaseError, ValueError):
        return jsonify({"error": "Your session is invalid or expired. Sign in again."}), 401

    if not os.environ.get("CLOUDINARY_URL"):
        return jsonify({"error": "Cloudinary is not configured on the backend."}), 503

    if request.content_length is not None and request.content_length > MAX_IMAGE_UPLOAD_SIZE + 64 * 1024:
        return jsonify({"error": "Image must be 5 MB or smaller."}), 413

    image = request.files.get("image")
    purpose = request.form.get("purpose")
    if image is None:
        return jsonify({"error": "An image file is required."}), 400
    if purpose not in {"profile", "field"}:
        return jsonify({"error": "Purpose must be 'profile' or 'field'."}), 400

    image_bytes = image.stream.read(MAX_IMAGE_UPLOAD_SIZE + 1)
    if not image_bytes:
        return jsonify({"error": "The uploaded image is empty."}), 400
    if len(image_bytes) > MAX_IMAGE_UPLOAD_SIZE:
        return jsonify({"error": "Image must be 5 MB or smaller."}), 413

    try:
        uploaded_image = Image.open(BytesIO(image_bytes))
        uploaded_image.verify()
        image_format = uploaded_image.format
    except Exception:
        return jsonify({"error": "Upload a valid JPEG, PNG, or WEBP image."}), 400
    if image_format not in {"JPEG", "PNG", "WEBP"}:
        return jsonify({"error": "Upload a valid JPEG, PNG, or WEBP image."}), 400

    folder = f"agrosmart/users/{decoded_token['uid']}/profile"
    if purpose == "field":
        farm_id = request.form.get("farmId", "")
        field_id = request.form.get("fieldId", "")
        if not farm_id or not field_id or any(
            character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
            for character in farm_id + field_id
        ):
            return jsonify({"error": "A valid farm and field ID are required."}), 400
        folder = f"agrosmart/users/{decoded_token['uid']}/farms/{farm_id}/fields/{field_id}"

    try:
        cloudinary.config(cloudinary_url=os.environ["CLOUDINARY_URL"])
        result = cloudinary.uploader.upload(
            BytesIO(image_bytes),
            folder=folder,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png", "webp"],
        )
    except Exception as error:
        print(f"[CLOUDINARY UPLOAD ERROR] {type(error).__name__}: {error}")
        return jsonify({"error": "Image upload failed. Please try again."}), 502

    image_url = result.get("secure_url")
    if not isinstance(image_url, str):
        print("[CLOUDINARY UPLOAD ERROR] Response did not include a secure URL.")
        return jsonify({"error": "Image upload failed. Please try again."}), 502
    return jsonify({"url": image_url}), 201


@app.route("/api/devices/pair-codes", methods=["POST"])
def create_device_pair_code():
    user = verify_user_request()
    if not user:
        if not os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            return jsonify({"error": "Device pairing is not configured on the backend."}), 503
        return jsonify({"error": "Sign in again before pairing a device."}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400
    farm_id = data.get("farmId")
    field_id = data.get("fieldId")
    if not isinstance(farm_id, str) or not farm_id or not isinstance(field_id, str) or not field_id:
        return jsonify({"error": "Select a farm and field before pairing."}), 400
    if any(character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for character in farm_id + field_id):
        return jsonify({"error": "The selected farm or field ID is invalid."}), 400

    try:
        firestore = admin_firestore.client(app=get_firebase_admin_app())
        field_ref = firestore.collection("users", user["uid"], "farms", farm_id, "fields", field_id)
        if not field_ref.get().exists:
            return jsonify({"error": "The selected field was not found in your account."}), 404

        code = secrets.token_urlsafe(9)
        firestore.collection("device_pair_codes").document(code).set({
            "userId": user["uid"],
            "farmId": farm_id,
            "fieldId": field_id,
            "expiresAt": datetime.now(timezone.utc) + timedelta(minutes=10),
            "createdAt": admin_firestore.SERVER_TIMESTAMP,
        })
    except firebase_admin.exceptions.FirebaseError as error:
        print(f"[DEVICE PAIRING ERROR] {error}")
        return jsonify({"error": "Could not create a pairing code. Please try again."}), 503
    return jsonify({"pairingCode": code, "expiresInSeconds": 600}), 201


@app.route("/api/devices/pair", methods=["POST"])
def pair_device():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400
    code = data.get("pairingCode")
    device_id = data.get("deviceId")
    device_token = data.get("deviceToken")
    if not isinstance(code, str) or len(code) != 12 or any(
        character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
        for character in code
    ):
        return jsonify({"error": "A valid 12-character pairing code is required."}), 400
    if not isinstance(device_id, str) or not isinstance(device_token, str):
        return jsonify({"error": "The device ID and device credential are required."}), 400
    device_id = device_id.replace(":", "").replace("-", "").lower()
    if len(device_id) != 12 or any(character not in "0123456789abcdef" for character in device_id):
        return jsonify({"error": "The device identifier is invalid."}), 400
    if len(device_token) < 32 or len(device_token) > 128:
        return jsonify({"error": "The device credential is invalid."}), 400

    try:
        firestore = admin_firestore.client(app=get_firebase_admin_app())
        code_ref = firestore.collection("device_pair_codes").document(code)
        transaction = firestore.transaction()

        @admin_firestore.transactional
        def claim_code(transaction):
            code_snapshot = code_ref.get(transaction=transaction)
            pairing = code_snapshot.to_dict() if code_snapshot.exists else None
            if not pairing:
                return None
            expires_at = pairing.get("expiresAt")
            if not expires_at or expires_at <= datetime.now(timezone.utc):
                transaction.delete(code_ref)
                return None

            user_id = pairing["userId"]
            device_ref = firestore.collection("users", user_id, "devices").document(device_id)
            transaction.set(device_ref, {
                "deviceId": device_id,
                "name": f"Irrigation unit {device_id[-4:]}",
                "farmId": pairing["farmId"],
                "fieldId": pairing["fieldId"],
                "mode": "manual",
                "motorState": "off",
                "tokenHash": hashlib.sha256(device_token.encode("utf-8")).hexdigest(),
                "pairedAt": admin_firestore.SERVER_TIMESTAMP,
                "lastSeenAt": admin_firestore.SERVER_TIMESTAMP,
            })
            transaction.set(device_ref.collection("commands").document("current"), {
                "commandId": secrets.token_hex(8),
                "mode": "manual",
                "motor": "off",
                "updatedAt": admin_firestore.SERVER_TIMESTAMP,
            })
            transaction.delete(code_ref)
            return {"userId": user_id, "deviceId": device_id}

        claimed = claim_code(transaction)
    except firebase_admin.exceptions.FirebaseError as error:
        print(f"[DEVICE PAIRING ERROR] {error}")
        return jsonify({"error": "Device pairing failed. Please generate a new code."}), 503
    if not claimed:
        return jsonify({"error": "Pairing code is invalid or expired. Generate a new code."}), 400
    return jsonify({"success": True, **claimed}), 201


@app.route("/api/devices/command", methods=["GET"])
def get_device_command():
    try:
        admin_app = get_firebase_admin_app()
    except RuntimeError as error:
        print(f"[DEVICE CONFIG ERROR] {error}")
        return jsonify({"error": "Device API is not configured."}), 503
    verified = verify_device_request(admin_app)
    if not verified:
        return jsonify({"error": "Device is not paired or its credential is invalid."}), 401
    firestore, device_ref, device = verified
    command_ref = device_ref.collection("commands").document("current")
    command_snapshot = command_ref.get()
    command = command_snapshot.to_dict() if command_snapshot.exists else {
        "commandId": "default",
        "mode": "manual",
        "motor": "off",
    }
    device_ref.update({"lastSeenAt": admin_firestore.SERVER_TIMESTAMP})
    return jsonify(command)


@app.route("/api/devices/command", methods=["POST"])
def set_device_command():
    user = verify_user_request()
    if not user:
        if not os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            return jsonify({"error": "Device control is not configured on the backend."}), 503
        return jsonify({"error": "Sign in again to control the device."}), 401
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400
    device_id = data.get("deviceId")
    mode = data.get("mode")
    action = data.get("action")
    if not isinstance(device_id, str) or len(device_id) != 12:
        return jsonify({"error": "A valid device ID is required."}), 400
    if mode not in {"manual", "automatic"}:
        return jsonify({"error": "Mode must be 'manual' or 'automatic'."}), 400
    if action not in {"start", "stop", "continue", "mode"}:
        return jsonify({"error": "Action must be start, stop, continue, or mode."}), 400

    try:
        firestore = admin_firestore.client(app=get_firebase_admin_app())
        device_ref = firestore.collection("users", user["uid"], "devices").document(device_id)
        device_snapshot = device_ref.get()
        if not device_snapshot.exists:
            return jsonify({"error": "Device not found in your account."}), 404
        device = device_snapshot.to_dict() or {}
        command = {"commandId": secrets.token_hex(8), "mode": mode}
        if action in {"start", "continue"}:
            if mode != "manual":
                return jsonify({"error": "Manual motor runs require manual mode."}), 400
            duration = data.get("durationMinutes", device.get("lastDurationMinutes", 60))
            if isinstance(duration, bool) or not isinstance(duration, int) or not 1 <= duration <= 1440:
                return jsonify({"error": "Manual duration must be from 1 minute to 24 hours."}), 400
            command.update({"motor": "on", "durationMinutes": duration})
            device_ref.update({"lastDurationMinutes": duration})
        elif action == "stop":
            command["motor"] = "off"
        else:
            command["motor"] = "auto" if mode == "automatic" else "off"
        command["updatedAt"] = admin_firestore.SERVER_TIMESTAMP
        device_ref.update({"mode": mode})
        device_ref.collection("commands").document("current").set(command)
    except firebase_admin.exceptions.FirebaseError as error:
        print(f"[DEVICE COMMAND ERROR] {error}")
        return jsonify({"error": "Could not send the motor command."}), 503
    return jsonify({"success": True, "commandId": command["commandId"]})


@app.route("/api/devices/update", methods=["POST"])
def update_device():
    user = verify_user_request()
    if not user:
        if not os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            return jsonify({"error": "Device management is not configured on the backend."}), 503
        return jsonify({"error": "Sign in again to update the device."}), 401

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400
    device_id = data.get("deviceId")
    name = data.get("name")
    farm_id = data.get("farmId")
    field_id = data.get("fieldId")
    if not isinstance(device_id, str) or len(device_id) != 12 or any(
        character not in "0123456789abcdef" for character in device_id.lower()
    ):
        return jsonify({"error": "A valid device ID is required."}), 400
    if not isinstance(name, str) or not name.strip() or len(name.strip()) > 64:
        return jsonify({"error": "Device name must be from 1 to 64 characters."}), 400
    if not isinstance(farm_id, str) or not farm_id or not isinstance(field_id, str) or not field_id or any(
        character not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
        for character in farm_id + field_id
    ):
        return jsonify({"error": "A valid farm and field are required."}), 400

    try:
        firestore = admin_firestore.client(app=get_firebase_admin_app())
        device_ref = firestore.collection("users", user["uid"], "devices").document(device_id.lower())
        device_snapshot = device_ref.get()
        if not device_snapshot.exists:
            return jsonify({"error": "Device not found in your account."}), 404
        device = device_snapshot.to_dict() or {}
        if device.get("motorState") == "on":
            return jsonify({"error": "Stop the motor before changing the device assignment."}), 409
        field_ref = firestore.collection("users", user["uid"], "farms", farm_id, "fields", field_id)
        if not field_ref.get().exists:
            return jsonify({"error": "The selected field was not found in your account."}), 404
        device_ref.update({
            "name": name.strip(),
            "farmId": farm_id,
            "fieldId": field_id,
            "updatedAt": admin_firestore.SERVER_TIMESTAMP,
        })
    except RuntimeError as error:
        print(f"[DEVICE UPDATE CONFIG ERROR] {error}")
        return jsonify({"error": "Device management is not configured on the backend."}), 503
    except firebase_admin.exceptions.FirebaseError as error:
        print(f"[DEVICE UPDATE ERROR] {error}")
        return jsonify({"error": "Could not update the device."}), 503
    return jsonify({"success": True})


@app.route("/api/devices/delete", methods=["POST"])
def delete_device():
    user = verify_user_request()
    if not user:
        if not os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON"):
            return jsonify({"error": "Device management is not configured on the backend."}), 503
        return jsonify({"error": "Sign in again to remove the device."}), 401

    data = request.get_json(silent=True)
    device_id = data.get("deviceId") if isinstance(data, dict) else None
    if not isinstance(device_id, str) or len(device_id) != 12 or any(
        character not in "0123456789abcdef" for character in device_id.lower()
    ):
        return jsonify({"error": "A valid device ID is required."}), 400

    try:
        firestore = admin_firestore.client(app=get_firebase_admin_app())
        device_ref = firestore.collection("users", user["uid"], "devices").document(device_id.lower())
        device_snapshot = device_ref.get()
        if not device_snapshot.exists:
            return jsonify({"error": "Device not found in your account."}), 404
        device = device_snapshot.to_dict() or {}
        if device.get("motorState") == "on":
            return jsonify({"error": "Stop the motor and wait for its OFF state before removing the device."}), 409

        device_ref.collection("commands").document("current").delete()
        device_ref.delete()
    except RuntimeError as error:
        print(f"[DEVICE DELETE CONFIG ERROR] {error}")
        return jsonify({"error": "Device management is not configured on the backend."}), 503
    except firebase_admin.exceptions.FirebaseError as error:
        print(f"[DEVICE DELETE ERROR] {error}")
        return jsonify({"error": "Could not remove the device."}), 503
    return jsonify({"success": True})


@app.route("/api/devices/telemetry", methods=["POST"])
def receive_device_telemetry():
    try:
        admin_app = get_firebase_admin_app()
    except RuntimeError as error:
        print(f"[DEVICE CONFIG ERROR] {error}")
        return jsonify({"error": "Device API is not configured."}), 503
    verified = verify_device_request(admin_app)
    if not verified:
        return jsonify({"error": "Device is not paired or its credential is invalid."}), 401
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "A JSON request body is required."}), 400

    numeric_ranges = {
        "n": (0, 10000), "p": (0, 10000), "k": (0, 10000),
        "temperature": (-40, 85), "humidity": (0, 100), "moisture": (0, 100),
    }
    reading = {}
    for key, (minimum, maximum) in numeric_ranges.items():
        value = data.get(key)
        if isinstance(value, bool):
            return jsonify({"error": f"{key} must be a number."}), 400
        if value is not None:
            try:
                value = float(value)
            except (TypeError, ValueError):
                return jsonify({"error": f"{key} must be a number."}), 400
            if not np.isfinite(value) or not minimum <= value <= maximum:
                return jsonify({"error": f"{key} is outside its allowed range."}), 400
            reading[key] = value
    if "moisture" not in reading:
        return jsonify({"error": "moisture is required."}), 400
    if data.get("ldr") not in {"day", "night"}:
        return jsonify({"error": "ldr must be 'day' or 'night'."}), 400
    if data.get("motor") not in {"on", "off"}:
        return jsonify({"error": "motor must be 'on' or 'off'."}), 400
    if data.get("mode") not in {"manual", "automatic"}:
        return jsonify({"error": "mode must be 'manual' or 'automatic'."}), 400
    reading.update({
        "ldr": data["ldr"],
        "motor": data["motor"],
        "mode": data["mode"],
        "source": "Irrigation device",
        "recordedAt": admin_firestore.SERVER_TIMESTAMP,
    })
    event = data.get("event")
    if event not in {None, "manual_timer_expired"}:
        return jsonify({"error": "Unsupported telemetry event."}), 400

    firestore, device_ref, device = verified
    user_ref = device_ref.parent.parent
    user_id = user_ref.id
    farm_id = device.get("farmId")
    field_id = device.get("fieldId")
    if not farm_id or not field_id:
        return jsonify({"error": "Device has no assigned farm field."}), 409
    field_ref = firestore.collection("users", user_id, "farms", farm_id, "fields", field_id)
    field_snapshot = field_ref.get()
    if not field_snapshot.exists:
        return jsonify({"error": "The assigned field no longer exists."}), 409

    try:
        field_ref.collection("readings").add(reading)
        moisture_band = "low" if reading["moisture"] < 30 else "high" if reading["moisture"] >= 60 else "normal"
        previous_band = device.get("moistureBand")
        patch = {
            "lastSeenAt": admin_firestore.SERVER_TIMESTAMP,
            "motorState": reading["motor"],
            "mode": reading["mode"],
            "latestReading": {**reading, "recordedAt": admin_firestore.SERVER_TIMESTAMP},
            "moistureBand": moisture_band,
        }
        device_ref.update(patch)

        if event == "manual_timer_expired":
            send_user_pushes(
                firestore, user_id, "Manual watering timer ended",
                "The motor was stopped. Open AgroSmart to continue for the previous duration or leave it stopped.",
                {"type": "manual_timer_expired", "deviceId": device_ref.id, "url": "/irrigation"},
            )
        elif moisture_band != previous_band and moisture_band in {"low", "high"}:
            if moisture_band == "low":
                body = "Soil moisture is below 30%. Start the motor manually or review automatic mode."
            elif reading["mode"] == "automatic":
                body = "Soil moisture reached 60%. Automatic mode should stop the motor."
            else:
                body = "Soil moisture is above 60%. Consider stopping the motor."
            send_user_pushes(
                firestore, user_id, "Soil moisture alert", body,
                {"type": f"moisture_{moisture_band}", "deviceId": device_ref.id, "url": "/irrigation"},
            )
    except firebase_admin.exceptions.FirebaseError as error:
        print(f"[DEVICE TELEMETRY ERROR] {error}")
        return jsonify({"error": "Could not save device telemetry."}), 503
    return jsonify({"success": True}), 201


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


            with disease_inference_lock:
                disease_model.set_tensor(
                    disease_input_details["index"],
                    img_batch
                )
                disease_model.invoke()
                predictions = disease_model.get_tensor(
                    disease_output_details["index"]
                )[0]


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
        port=int(os.environ.get("PORT", "5000")),
        debug=False
    )