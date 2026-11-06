
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB38FXXH1Y4w-zNHSYGCR8RvbLKLrmxWGM",
  authDomain: "agrosmart-d8d63.firebaseapp.com",
  projectId: "agrosmart-d8d63",
  storageBucket: "agrosmart-d8d63.firebasestorage.app",
  messagingSenderId: "1005424695257",
  appId: "1:1005424695257:web:55365ec5947ac5e5f02bc8",
  measurementId: "G-PKHSYXHDS6"
};

// Initialize Firebase only once
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Check Firebase configuration
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

// Export Firebase app
export default app;
