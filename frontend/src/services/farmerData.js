import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../firebase";
import { API_BASE_URL } from "../config";

const localKey = (uid, type) => `agrosmart_${type}_${uid}`;

function readLocal(uid, type, fallback) {
  try {
    return JSON.parse(localStorage.getItem(localKey(uid, type))) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(uid, type, value) {
  localStorage.setItem(localKey(uid, type), JSON.stringify(value));
}

async function callDeviceApi(path, body) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Sign in before managing connected devices.");
  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  let finalResponse = response;
  if (response.status === 401) {
    const refreshedToken = await currentUser.getIdToken(true);
    finalResponse = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshedToken}`,
      },
      body: JSON.stringify(body),
    });
  }
  const responseText = await finalResponse.text();
  let result;
  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(`The device service returned an invalid response (HTTP ${finalResponse.status}).`);
  }
  if (!finalResponse.ok) throw new Error(result.error || "The device request failed.");
  return result;
}

export async function createDevicePairCode(farmId, fieldId) {
  return callDeviceApi("/api/devices/pair-codes", {
    ...(farmId && fieldId ? { farmId, fieldId } : {}),
  });
}

export async function sendDeviceCommand(deviceId, action, mode, durationMinutes) {
  return callDeviceApi("/api/devices/command", {
    deviceId,
    action,
    mode,
    ...(durationMinutes ? { durationMinutes } : {}),
  });
}

export async function saveCropPredictionHistory(values, predictions) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Please sign in before saving crop predictions.");

  const input = Object.fromEntries(
    ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
      .map((field) => [field, Number(values[field])])
  );
  const rankedPredictions = predictions.map((item, index) => ({
    crop: String(item.crop),
    probability: Number(item.prob),
    rank: index + 1,
  }));
  await addDoc(collection(db, "users", currentUser.uid, "crop_predictions"), {
    userId: currentUser.uid,
    input,
    predictions: rankedPredictions,
    createdAt: serverTimestamp(),
  });
}

export async function updateDeviceDetails(deviceId, name, farmId, fieldId) {
  return callDeviceApi("/api/devices/update", { deviceId, name, farmId, fieldId });
}

export async function deleteDevice(deviceId) {
  return callDeviceApi("/api/devices/delete", { deviceId });
}

export async function uploadImage(file, purpose, { farmId, fieldId } = {}) {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Sign in before uploading an image.");

  const formData = new FormData();
  formData.append("image", file);
  formData.append("purpose", purpose);
  if (farmId) formData.append("farmId", farmId);
  if (fieldId) formData.append("fieldId", fieldId);

  const token = await currentUser.getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/uploads/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const result = await response.json();
  if (!response.ok || typeof result.url !== "string") {
    throw new Error(result.error || "Image upload failed.");
  }
  return result.url;
}

export async function getFarmerProfile(uid) {
  if (!isFirebaseConfigured) return readLocal(uid, "profile", null);
  const profile = await getDoc(doc(db, "users", uid));
  return profile.exists() ? profile.data() : null;
}

export async function saveFarmerProfile(uid, profile) {
  const data = { ...profile, updatedAt: new Date().toISOString() };
  if (isFirebaseConfigured) {
    await setDoc(doc(db, "users", uid), {
      ...data,
      profileComplete: true,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } else {
    writeLocal(uid, "profile", { ...data, profileComplete: true });
  }
  return { ...data, profileComplete: true };
}

export async function listFarms(uid) {
  if (!isFirebaseConfigured) return readLocal(uid, "farms", []);
  const snapshot = await getDocs(collection(db, "users", uid, "farms"));
  return snapshot.docs.map((farm) => ({ id: farm.id, ...farm.data() }));
}

export async function saveFarm(uid, farm, farmId) {
  if (isFirebaseConfigured) {
    const farms = collection(db, "users", uid, "farms");
    const data = { ...farm, updatedAt: serverTimestamp() };
    if (farmId) {
      await updateDoc(doc(farms, farmId), data);
      return farmId;
    }
    const created = await addDoc(farms, { ...data, createdAt: serverTimestamp() });
    return created.id;
  }

  const farms = readLocal(uid, "farms", []);
  const id = farmId || crypto.randomUUID();
  const next = farmId
    ? farms.map((item) => item.id === id ? { ...item, ...farm } : item)
    : [...farms, { id, ...farm }];
  writeLocal(uid, "farms", next);
  return id;
}

export async function listFields(uid, farmId) {
  if (!isFirebaseConfigured) {
    return readLocal(uid, "fields", []).filter((field) => field.farmId === farmId);
  }
  const snapshot = await getDocs(collection(db, "users", uid, "farms", farmId, "fields"));
  return snapshot.docs.map((field) => ({ id: field.id, ...field.data(), farmId }));
}

export async function saveField(uid, farmId, field, fieldId) {
  if (isFirebaseConfigured) {
    const fields = collection(db, "users", uid, "farms", farmId, "fields");
    const data = { ...field, updatedAt: serverTimestamp() };
    if (fieldId) {
      await updateDoc(doc(fields, fieldId), data);
      return fieldId;
    }
    const created = await addDoc(fields, { ...data, createdAt: serverTimestamp() });
    return created.id;
  }

  const fields = readLocal(uid, "fields", []);
  const id = fieldId || crypto.randomUUID();
  const next = fieldId
    ? fields.map((item) => item.id === id ? { ...item, ...field } : item)
    : [...fields, { id, farmId, ...field }];
  writeLocal(uid, "fields", next);
  return id;
}

export async function recordSensorReading(uid, farmId, fieldId, reading) {
  if (!fieldId) return false;
  if (isFirebaseConfigured) {
    if (!farmId) return false;
    const fieldRef = doc(db, "users", uid, "farms", farmId, "fields", fieldId);
    const field = await getDoc(fieldRef);
    if (!field.exists()) return false;
    const allowedKeys = ["temperature", "humidity", "soil", "soil_moisture_percent", "ldr", "irrigation", "pump_state", "source"];
    const safeReading = Object.fromEntries(
      Object.entries(reading).filter(([key, value]) => (
        allowedKeys.includes(key) && (typeof value === "string" || (typeof value === "number" && Number.isFinite(value)))
      ))
    );
    await addDoc(collection(fieldRef, "readings"), {
      ...safeReading,
      recordedAt: serverTimestamp(),
    });
    return true;
  }

  const readings = readLocal(uid, "sensor-readings", []);
  writeLocal(uid, "sensor-readings", [
    ...readings,
    { ...reading, farmId, fieldId, recordedAt: new Date().toISOString() },
  ]);
  return true;
}

export async function recordReadingForActiveField(uid, reading) {
  const activeField = readLocal(uid, "active-field", null);
  if (!activeField?.farmId || !activeField?.fieldId) return false;
  const throttleKey = localKey(uid, `last-reading-${activeField.fieldId}`);
  const lastRecordedAt = Number(localStorage.getItem(throttleKey) || 0);
  if (Date.now() - lastRecordedAt < 60_000) return false;
  const saved = await recordSensorReading(uid, activeField.farmId, activeField.fieldId, reading);
  if (saved) localStorage.setItem(throttleKey, String(Date.now()));
  return saved;
}

export function setActiveField(uid, farmId, fieldId) {
  writeLocal(uid, "active-field", { farmId, fieldId });
}

export function getActiveField(uid) {
  return readLocal(uid, "active-field", null);
}

export function setActiveDevice(uid, deviceId) {
  writeLocal(uid, "active-device", deviceId);
  window.dispatchEvent(new CustomEvent("agrosmart:active-device-changed", { detail: { uid } }));
}

export function getActiveDeviceId(uid) {
  return readLocal(uid, "active-device", "");
}

export function subscribeToActiveDeviceChanges(uid, onChange) {
  const storageKey = localKey(uid, "active-device");
  const handleDeviceChange = (event) => {
    if (event.detail?.uid === uid) onChange();
  };
  const handleStorageChange = (event) => {
    if (event.key === storageKey) onChange();
  };
  window.addEventListener("agrosmart:active-device-changed", handleDeviceChange);
  window.addEventListener("storage", handleStorageChange);
  return () => {
    window.removeEventListener("agrosmart:active-device-changed", handleDeviceChange);
    window.removeEventListener("storage", handleStorageChange);
  };
}

export function selectUserDevice(uid, devices) {
  const activeDeviceId = getActiveDeviceId(uid);
  return devices.find((device) => device.id === activeDeviceId) || devices[0] || null;
}

export function isDeviceReadingFresh(device, now, maxAgeMs = 150_000) {
  const recordedAt = device?.latestReading?.recordedAt?.toDate?.();
  return Boolean(recordedAt && now >= recordedAt.getTime() && now - recordedAt.getTime() < maxAgeMs);
}

export function subscribeToUserDevices(uid, onChange, onError) {
  return onSnapshot(
    collection(db, "users", uid, "devices"),
    (snapshot) => onChange(snapshot.docs.map((device) => ({ id: device.id, ...device.data() }))),
    onError
  );
}

export function subscribeToDeviceReadings(uid, deviceId, onChange, onError) {
  const readingsQuery = query(
    collection(db, "users", uid, "devices", deviceId, "readings"),
    orderBy("recordedAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    readingsQuery,
    (snapshot) => onChange(snapshot.docs.map((reading) => ({ id: reading.id, ...reading.data() }))),
    onError
  );
}

export function subscribeToFieldReadings(uid, farmId, fieldId, onChange, onError) {
  const readingsQuery = query(
    collection(db, "users", uid, "farms", farmId, "fields", fieldId, "readings"),
    orderBy("recordedAt", "desc"),
    limit(100)
  );
  return onSnapshot(
    readingsQuery,
    (snapshot) => onChange(snapshot.docs.map((reading) => ({ id: reading.id, ...reading.data() }))),
    onError
  );
}

export function subscribeToDeviceHistory(uid, deviceId, farmId, fieldId, onChange, onError) {
  let deviceReadings = [];
  let fieldReadings = [];

  const publishReadings = () => {
    const legacyReadings = fieldReadings.map((reading) => {
      const moistureValue = reading.soil_moisture_percent ?? reading.soil_moisture ?? reading.soil;
      const moisture = moistureValue == null ? NaN : Number(moistureValue);
      return {
        ...reading,
        moisture: Number.isFinite(moisture) ? moisture : reading.moisture,
        motor: reading.motor ?? reading.pump_state ?? reading.irrigation,
      };
    });
    const timestamp = (reading) => reading.recordedAt?.toMillis?.() ?? 0;
    onChange(
      [...deviceReadings, ...legacyReadings]
        .sort((left, right) => timestamp(right) - timestamp(left))
        .slice(0, 100)
    );
  };

  const unsubscribeDevice = subscribeToDeviceReadings(
    uid,
    deviceId,
    (readings) => {
      deviceReadings = readings;
      publishReadings();
    },
    onError
  );
  const unsubscribeField = farmId && fieldId
    ? subscribeToFieldReadings(
      uid,
      farmId,
      fieldId,
      (readings) => {
        fieldReadings = readings;
        publishReadings();
      },
      onError
    )
    : () => {};

  return () => {
    unsubscribeDevice();
    unsubscribeField();
  };
}

export async function getActiveUserDevice(uid) {
  const snapshot = await getDocs(collection(db, "users", uid, "devices"));
  const devices = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  return selectUserDevice(uid, devices);
}
