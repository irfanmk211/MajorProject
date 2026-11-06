import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import { db, isFirebaseConfigured, storage } from "../firebase";

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

export async function saveProfilePhoto(uid, file) {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  const imageRef = ref(storage, `users/${uid}/profile/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return imageRef.fullPath;
}

export async function saveFieldPhoto(uid, farmId, fieldId, file) {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  const imageRef = ref(storage, `users/${uid}/farms/${farmId}/fields/${fieldId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await uploadBytes(imageRef, file, { contentType: file.type });
  return imageRef.fullPath;
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
