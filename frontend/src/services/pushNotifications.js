import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { app, auth, db } from "../firebase";

const DEFAULT_VAPID_KEY = "BB8PNJzGFJkUn9tdJrN5sAxz8Howma90a52pl5Bs3r2xXX8b0nH855l-1rayLEXkbxOB_1D1CqF1wL8m2yXj8FQ";

async function tokenDocumentId(token) {
  if (typeof window !== "undefined" && window.crypto && crypto.subtle) {
    const bytes = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for contexts where subtle crypto is unavailable
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    hash = (hash << 5) - hash + token.charCodeAt(i);
    hash |= 0;
  }
  return `tok_${Math.abs(hash)}_${token.slice(-16)}`;
}

export function getPushPermissionStatus() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission; // "default", "granted", or "denied"
}

export async function registerPushNotifications() {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before enabling notifications.");
  if (!("Notification" in window) || !(await isSupported())) {
    throw new Error("Push notifications are not supported by this browser.");
  }

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || DEFAULT_VAPID_KEY;
  if (!vapidKey) throw new Error("Push notifications are not configured.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Allow notifications in your browser settings to receive alerts.");

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error("Could not register this browser for push notifications.");

  const tokenId = await tokenDocumentId(token);
  await setDoc(doc(db, "users", user.uid, "notification_tokens", tokenId), {
    token,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  return onMessage(messaging, (payload) => {
    window.dispatchEvent(new CustomEvent("agrosmart:push-message", { detail: payload }));
  });
}
