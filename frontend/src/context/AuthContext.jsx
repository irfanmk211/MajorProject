import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../firebase";
import { getFarmerProfile, saveFarmerProfile } from "../services/farmerData";

const AuthContext = createContext(null);

function getDemoUser() {
  const stored = localStorage.getItem("agrosmart_user");
  if (!stored) return null;
  const user = JSON.parse(stored);
  const uid = user.uid || user.email;
  const savedProfile = localStorage.getItem(`agrosmart_profile_${uid}`);
  const profile = savedProfile ? JSON.parse(savedProfile) : null;
  return {
    ...user,
    ...profile,
    uid,
    name: profile?.fullName || user.name,
  };
}

function getInitialDemoSession() {
  if (isFirebaseConfigured) return { user: null, profileComplete: false };
  try {
    const user = getDemoUser();
    return {
      user,
      profileComplete: Boolean(user && (user.isGuest || localStorage.getItem(`agrosmart_profile_${user.uid}`))),
    };
  } catch (error) {
    console.error("Could not restore the saved AgroSmart session:", error);
    localStorage.removeItem("agrosmart_user");
    return { user: null, profileComplete: false };
  }
}

export function AuthProvider({ children }) {
  const [initialSession] = useState(getInitialDemoSession);
  const [user, setUser] = useState(initialSession.user);
  const [profileComplete, setProfileComplete] = useState(initialSession.profileComplete);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    return onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (!firebaseUser) {
        const demoUser = getDemoUser();
        const guestUser = demoUser?.isGuest ? demoUser : null;
        setUser(guestUser);
        if (guestUser) localStorage.setItem("agrosmart_user", JSON.stringify(guestUser));
        setProfileComplete(Boolean(guestUser));
        setLoading(false);
        return;
      }

      try {
        const profile = await getFarmerProfile(firebaseUser.uid);
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || profile?.fullName || "",
          ...profile,
        });
        setProfileComplete(Boolean(profile?.profileComplete));
      } catch (error) {
        console.error("Could not load the farmer profile:", error);
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
        setProfileComplete(false);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email, password, createAccount = false) => {
    if (isFirebaseConfigured) {
      const credential = createAccount
        ? await createUserWithEmailAndPassword(auth, email, password)
        : await signInWithEmailAndPassword(auth, email, password);
      const profile = await getFarmerProfile(credential.user.uid);
      return { profileComplete: Boolean(profile?.profileComplete) };
    }

    const stored = localStorage.getItem("agrosmart_user");
    const existing = stored ? JSON.parse(stored) : null;
    if (createAccount && existing?.email?.toLowerCase() === email.toLowerCase()) {
      throw new Error("An account with this email already exists.");
    }
    if (!createAccount && existing && existing.email.toLowerCase() !== email.toLowerCase()) {
      throw new Error("This demo session belongs to a different email. Use Sign Up to create another demo session.");
    }
    const newUser = {
      uid: email.toLowerCase(),
      name: email.split("@")[0] || "Farmer",
      email,
      role: "Farmer",
      location: "",
      farmSize: "",
      crops: [],
    };
    const savedProfile = localStorage.getItem(`agrosmart_profile_${newUser.uid}`);
    const profile = savedProfile ? JSON.parse(savedProfile) : null;
    const demoUser = { ...newUser, ...profile, name: profile?.fullName || newUser.name, uid: newUser.uid, email };
    localStorage.setItem("agrosmart_user", JSON.stringify(demoUser));
    setUser(demoUser);
    const complete = Boolean(profile?.profileComplete);
    setProfileComplete(complete);
    return { profileComplete: complete };
  };

  const guestLogin = () => {
    const guest = {
      uid: "guest@agrosmart.ai",
      name: "Guest Farmer",
      email: "guest@agrosmart.ai",
      role: "Guest",
      location: "Maharashtra, India",
      farmSize: "3 Acres",
      crops: ["Tomato", "Maize"],
      isGuest: true,
    };
    setUser(guest);
    setProfileComplete(true);
    localStorage.setItem("agrosmart_user", JSON.stringify(guest));
    return guest;
  };

  const saveProfile = async (profile) => {
    if (!user?.uid) throw new Error("Sign in before saving a farmer profile.");
    const savedProfile = await saveFarmerProfile(user.uid, {
      ...profile,
      email: user.email,
    });
    const nextUser = {
      ...user,
      ...savedProfile,
      name: savedProfile.fullName || user.name,
      uid: user.uid,
      email: user.email,
    };
    setUser(nextUser);
    setProfileComplete(true);
    if (!isFirebaseConfigured) {
      localStorage.setItem("agrosmart_user", JSON.stringify(nextUser));
    }
    return savedProfile;
  };

  const logout = async () => {
    if (isFirebaseConfigured && !user?.isGuest) {
      await signOut(auth);
    } else {
      localStorage.removeItem("agrosmart_user");
      setUser(null);
      setProfileComplete(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, profileComplete, authEnabled: isFirebaseConfigured, login, guestLogin, logout, saveProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
