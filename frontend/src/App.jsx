import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Crop from "./pages/Crop";
import Disease from "./pages/Disease";
import SoilMonitoring from "./pages/SoilMonitoring";
import SmartIrrigation from "./pages/SmartIrrigation";
import Weather from "./pages/Weather";
import Profile from "./pages/Profile";
import ProfileSetup from "./pages/ProfileSetup";
import FarmFields from "./pages/FarmFields";
import About from "./pages/About";
import Contact from "./pages/Contact";
import VoiceAssistant from "./components/VoiceAssistant";
import { useEffect } from "react";


function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Login />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/farms" element={<FarmFields />} />
          <Route path="/crop" element={<Crop />} />
          <Route path="/disease" element={<Disease />} />
          <Route path="/soil" element={<SoilMonitoring />} />
          <Route path="/irrigation" element={<SmartIrrigation />} />
          <Route path="/weather" element={<Weather />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AnimatedRoutes />
            <VoiceAssistant />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
