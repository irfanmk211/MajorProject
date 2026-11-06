import { createContext, useContext } from "react";

export const LanguageContext = createContext(null);
export const SUPPORTED_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "kn", label: "Kannada" },
];

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}
