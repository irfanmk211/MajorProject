
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA5Ngm4gs4PyK7IvbnsugQGNsSZVPaR8wM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "agrosmart-mp.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "agrosmart-mp",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "652871993060",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:652871993060:web:842e454e11ab3f3a8ecef1",
};

// Initialize Firebase only once
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Check Firebase configuration
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// Export Firebase app
export { app };
export default app;
