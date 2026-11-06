import { useRef, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Sprout,
  Tractor,
  UserRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { SUPPORTED_LANGUAGES, useLanguage } from "../context/languageState";
import { districtsByState, states, taluksByStateAndDistrict } from "../data/stateLocations";
import { listFarms, saveFarm, saveProfilePhoto } from "../services/farmerData";

const emptyProfile = {
  preferredLanguage: "en",
  fullName: "",
  mobileNumber: "",
  gender: "",
  age: "",
  state: "",
  district: "",
  taluk: "",
  village: "",
  completeAddress: "",
  farmerCategory: "",
  farmSize: "",
  farmingType: "",
  mainOccupation: "",
  landOwnership: "",
};

const controlClass = "mt-2 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-100";

function FormField({ label, children, className = "" }) {
  return (
    <label className={`block text-sm font-semibold text-slate-700 ${className}`}>
      {label}
      {children}
    </label>
  );
}

function Section({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
      <div className="mb-6 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Icon size={22} />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function ProfileSetup() {
  const { user, loading, profileComplete, authEnabled } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-emerald-700">{t("Loading your farmer profile…")}</div>;
  }
  if (!user) return <Navigate to="/" replace />;
  if (profileComplete && searchParams.get("edit") !== "1") return <Navigate to="/dashboard" replace />;
  return <ProfileSetupForm key={user.uid} user={user} profileComplete={profileComplete} authEnabled={authEnabled} />;
}

function ProfileSetupForm({ user, profileComplete, authEnabled }) {
  const { saveProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editing = searchParams.get("edit") === "1";
  const [form, setForm] = useState(() => ({
    ...emptyProfile,
    ...Object.fromEntries(
      Object.keys(emptyProfile).map((key) => {
        const value = key === "preferredLanguage"
          ? language
          : user?.[key] ?? emptyProfile[key];
        if (key === "preferredLanguage" && !SUPPORTED_LANGUAGES.some(({ value: code }) => code === value)) {
          return [key, language];
        }
        return [key, value];
      })
    ),
  }));
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef(null);

  const districts = districtsByState[form.state] || [];
  const districtOptions = form.district && !districts.includes(form.district)
    ? [form.district, ...districts]
    : districts;
  const availableTaluks = taluksByStateAndDistrict[form.state]?.[form.district] || [];
  const taluks = form.taluk && !availableTaluks.includes(form.taluk)
    ? [form.taluk, ...availableTaluks]
    : availableTaluks;
  const isMandalBased = form.state === "Andhra Pradesh" || form.state === "Telangana";
  const update = (event) => {
    const { name, value } = event.target;
    if (name === "preferredLanguage") setLanguage(value);
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "state" ? { district: "", taluk: "" } : {}),
      ...(name === "district" ? { taluk: "" } : {}),
    }));
    setSuccess("");
  };

  const save = async (continueToDashboard) => {
    if (!formRef.current?.reportValidity()) return;
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      let photoURL = user.photoURL || "";
      if (photo) photoURL = await saveProfilePhoto(user.uid, photo);
      const saved = await saveProfile({ ...form, photoURL });
      const farms = await listFarms(user.uid);
      const defaultFarm = {
        name: `${saved.fullName}'s Farm`,
        sizeInAcres: Number(saved.farmSize),
        farmingType: saved.farmingType,
        landOwnership: saved.landOwnership,
        state: saved.state,
        district: saved.district,
        taluk: saved.taluk,
        village: saved.village,
      };
      await saveFarm(user.uid, defaultFarm, farms[0]?.id);
      setLanguage(saved.preferredLanguage);
      setSuccess(t("Your farmer profile has been saved successfully."));
      if (continueToDashboard) navigate("/dashboard", { replace: true, state: { profileSaved: true } });
    } catch (saveError) {
      console.error("Could not save the farmer profile:", saveError);
      setError(saveError.message || t("We couldn't save your profile. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#dcfce7,_#f8fafc_55%)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link to={profileComplete ? "/dashboard" : "/"} className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-600">
          <ArrowLeft size={17} /> {profileComplete ? t("Back to dashboard") : t("Back to sign in")}
        </Link>
        <header className="mb-8 rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-green-600 px-6 py-8 text-white shadow-xl sm:px-9">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-white/15 p-3"><Sprout size={28} /></span>
            <div>
              <p className="text-sm font-semibold text-emerald-100">{t("AgroSmart Farmer Profile")}</p>
              <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
                {editing ? t("Edit your profile") : t("Let’s set up your farm")}
              </h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-emerald-50 sm:text-base">
            {t("Tell us a little about yourself and your farm so AgroSmart can make your experience more useful.")}
          </p>
          {!authEnabled && (
            <p className="mt-4 rounded-xl bg-amber-100/15 px-4 py-3 text-xs leading-5 text-amber-50">
              {t("Demo mode is active. Profile data is saved in this browser until Firebase is configured.")}
            </p>
          )}
        </header>

        <form
          ref={formRef}
          onSubmit={(event) => {
            event.preventDefault();
            save(true);
          }}
          className="space-y-5"
        >
          <Section icon={CircleUserRound} title={t("Personal information")} description={t("Your contact and location details.")}>
            <FormField label={t("Preferred language")}>
              <select className={controlClass} name="preferredLanguage" value={form.preferredLanguage} onChange={update} required>
                {SUPPORTED_LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>{t(label)}</option>
                ))}
              </select>
            </FormField>
            <FormField label={t("Full name")}>
              <input className={controlClass} name="fullName" autoComplete="name" value={form.fullName} onChange={update} maxLength={100} required />
            </FormField>
            <FormField label={t("Mobile number")}>
              <input className={controlClass} name="mobileNumber" type="tel" inputMode="numeric" autoComplete="tel-national" value={form.mobileNumber} onChange={update} pattern="[6-9][0-9]{9}" title={t("Enter a valid 10-digit Indian mobile number.")} maxLength={10} placeholder={t("10-digit mobile number")} required />
            </FormField>
            <FormField label={t("Email address")}>
              <input className={controlClass} type="email" value={user.email || ""} readOnly disabled />
            </FormField>
            <FormField label={t("Gender")}>
              <select className={controlClass} name="gender" value={form.gender} onChange={update} required>
                <option value="">{t("Select gender")}</option>
                <option value="Male">{t("Male")}</option><option value="Female">{t("Female")}</option><option value="Other">{t("Other")}</option>
              </select>
            </FormField>
            <FormField label={t("Age")}>
              <input className={controlClass} name="age" type="number" min="16" max="120" value={form.age} onChange={update} required />
            </FormField>
            <FormField label={t("State")}>
              <select className={controlClass} name="state" value={form.state} onChange={update} required>
                <option value="">{t("Select state")}</option>
                {states.map((state) => <option key={state} value={state}>{t(state)}</option>)}
              </select>
            </FormField>
            <FormField label={t("District")}>
              {districts.length ? (
                <select className={controlClass} name="district" value={form.district} onChange={update} disabled={!form.state} required>
                  <option value="">{t("Select district")}</option>
                  {districtOptions.map((district) => <option key={district} value={district}>{t(district)}</option>)}
                </select>
              ) : (
                <input className={controlClass} name="district" value={form.district} onChange={update} disabled={!form.state} placeholder={form.state ? t("Enter your district") : t("Select a state first")} required />
              )}
            </FormField>
            <FormField label={t(isMandalBased ? "Mandal" : "Taluk")}>
              {taluks.length ? (
                <span className="relative block">
                  <select className={`${controlClass} appearance-none pr-10`} name="taluk" value={form.taluk} onChange={update} required>
                    <option value="">{t(isMandalBased ? "Select mandal" : "Select taluk")}</option>
                    {taluks.map((taluk) => <option key={taluk} value={taluk}>{t(taluk)}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-slate-400" size={17} />
                </span>
              ) : (
                <input className={controlClass} name="taluk" value={form.taluk} onChange={update} disabled={!form.district} placeholder={form.district ? t(isMandalBased ? "Enter your mandal" : "Enter your taluk") : t("Select a district first")} required />
              )}
            </FormField>
            <FormField label={t("Village")}>
              <input className={controlClass} name="village" value={form.village} onChange={update} maxLength={100} required />
            </FormField>
            <FormField label={t("Complete address")} className="sm:col-span-2">
              <textarea className={`${controlClass} min-h-24 resize-y`} name="completeAddress" value={form.completeAddress} onChange={update} maxLength={500} required />
            </FormField>
            <FormField label={t("Profile photo (optional)")} className="sm:col-span-2">
              <input className={controlClass} type="file" accept="image/jpeg,image/png,image/webp" disabled={!authEnabled} onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && file.size > 5 * 1024 * 1024) {
                  setError(t("Choose a profile photo smaller than 5 MB."));
                  event.target.value = "";
                  return;
                }
                setPhoto(file || null);
              }} />
            </FormField>
          </Section>

          <Section icon={Tractor} title={t("Farming information")} description={t("A few details help us tailor farm tools and recommendations.")}>
            <FormField label={t("Farmer category")}>
              <select className={controlClass} name="farmerCategory" value={form.farmerCategory} onChange={update} required>
                <option value="">{t("Select farmer category")}</option>
                <option value="Small Farmer">{t("Small Farmer")}</option><option value="Marginal Farmer">{t("Marginal Farmer")}</option><option value="Medium Farmer">{t("Medium Farmer")}</option><option value="Large Farmer">{t("Large Farmer")}</option>
              </select>
            </FormField>
            <FormField label={t("Farm size (acres)")}>
              <input className={controlClass} name="farmSize" type="number" min="0.01" max="100000" step="0.01" value={form.farmSize} onChange={update} required />
            </FormField>
            <FormField label={t("Farming type")}>
              <select className={controlClass} name="farmingType" value={form.farmingType} onChange={update} required>
                <option value="">{t("Select farming type")}</option>
                <option value="Organic">{t("Organic")}</option><option value="Conventional">{t("Conventional")}</option><option value="Mixed">{t("Mixed")}</option>
              </select>
            </FormField>
            <FormField label={t("Main occupation")}>
              <input className={controlClass} name="mainOccupation" value={form.mainOccupation} onChange={update} maxLength={100} required />
            </FormField>
            <FormField label={t("Land ownership")}>
              <select className={controlClass} name="landOwnership" value={form.landOwnership} onChange={update} required>
                <option value="">{t("Select land ownership")}</option>
                <option value="Own">{t("Own")}</option><option value="Lease">{t("Lease")}</option><option value="Both">{t("Both")}</option>
              </select>
            </FormField>
          </Section>

          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          {success && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18} />{success}</p>}
          <div className="flex flex-col-reverse gap-3 pb-8 sm:flex-row sm:justify-end">
            {profileComplete && <button type="button" onClick={() => navigate("/dashboard")} className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700">{t("Cancel")}</button>}
            <button type="button" disabled={saving} onClick={() => save(false)} className="rounded-xl border border-emerald-700 px-5 py-3 font-bold text-emerald-800 transition hover:bg-emerald-50 disabled:opacity-60">
              {saving ? t("Saving…") : t("Save Profile")}
            </button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:opacity-60">
              <UserRound size={18} /> {saving ? t("Saving…") : t("Save & Continue")}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
