import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, MapPin, Pencil, Plus, Sprout, Tractor } from "lucide-react";
import PageTransition from "../components/ui/PageTransition";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/languageState";
import {
  listFarms,
  listFields,
  saveFarm,
  saveField,
  saveFieldPhoto,
  setActiveField as persistActiveField,
} from "../services/farmerData";

const inputClass = "mt-2 w-full rounded-xl border border-emerald-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

export default function FarmFields() {
  const { user, authEnabled } = useAuth();
  const { t } = useLanguage();
  const [farms, setFarms] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [farmForm, setFarmForm] = useState({ name: "", sizeInAcres: "" });
  const [fieldForm, setFieldForm] = useState({ name: "", village: "", crop: "", sizeInAcres: "" });
  const [editingFarm, setEditingFarm] = useState("");
  const [editingField, setEditingField] = useState("");
  const [targetFarm, setTargetFarm] = useState("");
  const [fieldPhoto, setFieldPhoto] = useState(null);
  const [activeField, setSelectedField] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const savedFarms = await listFarms(user.uid);
      const savedFields = (await Promise.all(
        savedFarms.map(async (farm) => (await listFields(user.uid, farm.id)).map((field) => ({ ...field, farmName: farm.name })))
      )).flat();
      setFarms(savedFarms);
      setFields(savedFields);
      const active = localStorage.getItem(`agrosmart_active-field_${user.uid}`);
      setSelectedField(active ? JSON.parse(active).fieldId : "");
    } catch (loadError) {
      console.error("Could not load farms and fields:", loadError);
      setError(t("Farm information could not be loaded. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [t, user.uid]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (active) loadData();
    });
    return () => {
      active = false;
    };
  }, [loadData]);

  const saveFarmDetails = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveFarm(user.uid, {
        ...farmForm,
        sizeInAcres: Number(farmForm.sizeInAcres),
      }, editingFarm || undefined);
      setFarmForm({ name: "", sizeInAcres: "" });
      setEditingFarm("");
      setNotice(t("Farm saved."));
      await loadData();
    } catch (saveError) {
      console.error("Could not save farm:", saveError);
      setError(t("Farm could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const saveFieldDetails = async (event) => {
    event.preventDefault();
    if (!targetFarm) {
      setError(t("Choose a farm before adding a field."));
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const fieldId = await saveField(user.uid, targetFarm, {
        ...fieldForm,
        sizeInAcres: Number(fieldForm.sizeInAcres),
      }, editingField || undefined);
      if (fieldPhoto) {
        const photoURL = await saveFieldPhoto(user.uid, targetFarm, fieldId, fieldPhoto);
        await saveField(user.uid, targetFarm, { ...fieldForm, sizeInAcres: Number(fieldForm.sizeInAcres), photoURL }, fieldId);
      }
      setFieldForm({ name: "", village: "", crop: "", sizeInAcres: "" });
      setEditingField("");
      setFieldPhoto(null);
      setTargetFarm("");
      setNotice(t("Field saved."));
      await loadData();
    } catch (saveError) {
      console.error("Could not save field:", saveError);
      setError(saveError.message || t("Field could not be saved. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const editFarm = (farm) => {
    setEditingFarm(farm.id);
    setFarmForm({ name: farm.name || "", sizeInAcres: farm.sizeInAcres || "" });
  };

  const editField = (field) => {
    setEditingField(field.id);
    setTargetFarm(field.farmId);
    setFieldForm({
      name: field.name || "",
      village: field.village || "",
      crop: field.crop || "",
      sizeInAcres: field.sizeInAcres || "",
    });
  };

  const chooseActiveField = (field) => {
    setSelectedField(field.id);
    persistActiveField(user.uid, field.farmId, field.id);
  };

  if (loading) {
    return <div className="py-16 text-center text-emerald-800">{t("Loading farms and fields…")}</div>;
  }

  return (
    <PageTransition className="mx-auto max-w-6xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-br from-emerald-800 to-green-600 p-6 text-white shadow-lg sm:p-8">
        <div className="flex items-center gap-3">
          <Tractor size={30} />
          <div>
            <h1 className="text-2xl font-extrabold">{t("Farms & Fields")}</h1>
            <p className="mt-1 text-sm text-emerald-50">{t("Organize your farms and link sensor readings to a field.")}</p>
          </div>
        </div>
        {!authEnabled && <p className="mt-4 text-xs text-amber-100">{t("Demo mode stores farm data in this browser.")}</p>}
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</p>}

      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
        <h2 className="mb-4 text-lg font-bold text-slate-900">{editingFarm ? t("Edit farm") : t("Add a farm")}</h2>
        <form onSubmit={saveFarmDetails} className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-semibold text-slate-700">{t("Farm name")}
            <input className={inputClass} required maxLength={100} value={farmForm.name} onChange={(event) => setFarmForm({ ...farmForm, name: event.target.value })} />
          </label>
          <label className="text-sm font-semibold text-slate-700">{t("Farm size (acres)")}
            <input className={inputClass} required type="number" min="0.01" step="0.01" value={farmForm.sizeInAcres} onChange={(event) => setFarmForm({ ...farmForm, sizeInAcres: event.target.value })} />
          </label>
          <div className="flex items-end gap-2">
            <button disabled={saving} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              <Plus size={18} /> {saving ? t("Saving…") : editingFarm ? t("Update farm") : t("Add farm")}
            </button>
            {editingFarm && <button type="button" onClick={() => { setEditingFarm(""); setFarmForm({ name: "", sizeInAcres: "" }); }} className="min-h-12 rounded-xl border px-4">{t("Cancel")}</button>}
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{t("Your fields")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("Choose a field to attach incoming sensor readings to it.")}</p>
          </div>
          {!targetFarm && farms.length > 0 && (
            <button onClick={() => { setTargetFarm(farms[0].id); setEditingField(""); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 font-bold text-emerald-800 hover:bg-emerald-100">
              <Plus size={17} /> {t("Add field")}
            </button>
          )}
        </div>

        {farms.length === 0 && <p className="text-sm text-slate-500">{t("No farm has been added yet. Create a farm above to get started.")}</p>}
        {farms.map((farm) => (
          <div key={farm.id} className="mb-5 rounded-2xl border border-slate-100 p-4 last:mb-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800">{farm.name}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><MapPin size={15} />{farm.district || user.district || t("Location not set")} · {farm.sizeInAcres} {t("acres")}</p>
              </div>
              <button onClick={() => editFarm(farm)} aria-label={`${t("Edit")} ${farm.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil size={17} /></button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.filter((field) => field.farmId === farm.id).map((field) => (
                <article key={field.id} className={`rounded-xl border p-4 ${activeField === field.id ? "border-emerald-400 bg-emerald-50/60" : "border-slate-100 bg-slate-50/70"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Sprout className="mt-0.5 shrink-0 text-emerald-700" size={18} />
                      <div>
                        <h4 className="font-bold text-slate-800">{field.name}</h4>
                        <p className="mt-1 text-xs text-slate-500">{field.village} · {field.sizeInAcres} {t("acres")}</p>
                        {field.crop && <p className="mt-1 text-xs text-slate-600">{t("Crop")}: {field.crop}</p>}
                      </div>
                    </div>
                    <button onClick={() => editField(field)} aria-label={`${t("Edit")} ${field.name}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-white"><Pencil size={15} /></button>
                  </div>
                  <button onClick={() => chooseActiveField(field)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    {activeField === field.id ? <><Check size={15} /> {t("Sensor field selected")}</> : t("Use for sensor readings")}
                  </button>
                </article>
              ))}
              {fields.every((field) => field.farmId !== farm.id) && <p className="text-sm text-slate-400">{t("No fields added to this farm yet.")}</p>}
            </div>
          </div>
        ))}

        {targetFarm && (
          <form onSubmit={saveFieldDetails} className="mt-5 grid gap-4 rounded-2xl bg-emerald-50/70 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <h3 className="font-bold text-slate-800 sm:col-span-2 lg:col-span-3">{editingField ? t("Edit field") : t("Add a field")}</h3>
            <label className="text-sm font-semibold text-slate-700">{t("Field name")}
              <input className={inputClass} required maxLength={100} value={fieldForm.name} onChange={(event) => setFieldForm({ ...fieldForm, name: event.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-700">{t("Village")}
              <input className={inputClass} required maxLength={100} value={fieldForm.village} onChange={(event) => setFieldForm({ ...fieldForm, village: event.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-700">{t("Area (acres)")}
              <input className={inputClass} required type="number" min="0.01" step="0.01" value={fieldForm.sizeInAcres} onChange={(event) => setFieldForm({ ...fieldForm, sizeInAcres: event.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-700">{t("Main crop (optional)")}
              <input className={inputClass} maxLength={100} value={fieldForm.crop} onChange={(event) => setFieldForm({ ...fieldForm, crop: event.target.value })} />
            </label>
            <label className="text-sm font-semibold text-slate-700">{t("Field image (optional)")}
              <input className={inputClass} type="file" accept="image/jpeg,image/png,image/webp" disabled={!authEnabled} onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && file.size > 5 * 1024 * 1024) {
                  setError(t("Choose a field image smaller than 5 MB."));
                  event.target.value = "";
                  return;
                }
                setFieldPhoto(file || null);
              }} />
            </label>
            <div className="flex items-end gap-2">
              <button disabled={saving} className="min-h-12 flex-1 rounded-xl bg-emerald-700 px-4 font-bold text-white disabled:opacity-60">{saving ? t("Saving…") : editingField ? t("Update field") : t("Save field")}</button>
              <button type="button" onClick={() => { setTargetFarm(""); setEditingField(""); }} className="min-h-12 rounded-xl border border-slate-200 bg-white px-4">{t("Cancel")}</button>
            </div>
          </form>
        )}
      </section>
      <p className="text-sm text-slate-500">{t("Sensor readings are saved under the selected field.")} <Link className="font-semibold text-emerald-800 underline" to="/soil">{t("View soil monitoring")}</Link></p>
    </PageTransition>
  );
}
