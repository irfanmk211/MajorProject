import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyA5Ngm4gs4PyK7IvbnsugQGNsSZVPaR8wM",
  authDomain: "agrosmart-mp.firebaseapp.com",
  projectId: "agrosmart-mp",
  storageBucket: "agrosmart-mp.firebasestorage.app",
  messagingSenderId: "652871993060",
  appId: "1:652871993060:web:842e454e11ab3f3a8ecef1"
};

const app = initializeApp(firebaseConfig);

export default app;
