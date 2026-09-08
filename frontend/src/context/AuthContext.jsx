import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("agrosmart_user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = (email, password) =>
    new Promise((resolve) => {
      setTimeout(() => {
        const profile = {
          name: email.split("@")[0] || "Farmer",
          email,
          role: "Farmer",
          location: "Maharashtra, India",
          farmSize: "5 Acres",
          crops: ["Rice", "Wheat", "Cotton"],
        };
        setUser(profile);
        localStorage.setItem("agrosmart_user", JSON.stringify(profile));
        resolve(profile);
      }, 1500);
    });

  const guestLogin = () => {
    const profile = {
      name: "Guest Farmer",
      email: "guest@agrosmart.ai",
      role: "Guest",
      location: "Maharashtra, India",
      farmSize: "3 Acres",
      crops: ["Tomato", "Maize"],
    };
    setUser(profile);
    localStorage.setItem("agrosmart_user", JSON.stringify(profile));
    return profile;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("agrosmart_user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, guestLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
