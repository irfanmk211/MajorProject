import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  ScanLine,
  Leaf,
  AlertTriangle,
  CheckCircle,
  Stethoscope,
  Bug,
  Shield,
  Sprout,
  FlaskConical,
  AlertCircle,
} from "lucide-react";
import GlassCard from "../components/ui/GlassCard";
import RippleButton from "../components/ui/RippleButton";
import PageTransition from "../components/ui/PageTransition";
import ScanAnimation from "../components/ui/ScanAnimation";
import ExpandableCard from "../components/ui/ExpandableCard";
import CircularGauge from "../components/ui/CircularGauge";
import {
  formatDiseaseName,
  getDiseaseInfo,
  getDiseaseImage,
  isHealthy,
} from "../data/diseaseInfo";
import { getCropImagePlaceholder } from "../data/cropImages";
import { API_BASE_URL } from "../config";

export default function Disease() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResult(null);
    setError(null);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError("Please upload a leaf image first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);

    const executePrediction = async (attempt = 1) => {
      try {
        const res = await fetch(`${API_BASE_URL}/predict-disease`, {
          method: "POST",
          body: formData,
        });

        const text = await res.text();
        let data = {};
        try {
          data = JSON.parse(text);
        } catch (parseErr) {
          throw new Error("Server returned non-JSON response (possibly waking up).");
        }

        console.log("Backend response:", data);

        if (res.ok && data.success) {
          const transformedResult = {
            label: data.prediction?.label || data.label,
            confidence: data.prediction?.confidence || data.confidence,
            message: data.message || null,
            disease_info: data.disease_info || null,
            top_predictions: data.top_predictions || [],
          };

          setResult(transformedResult);
          setError(null);
        } else {
          setError(data.error || "Prediction failed. Please try again with a clear plant leaf photo.");
        }
      } catch (err) {
        console.error(`Prediction error (attempt ${attempt}):`, err);
        if (attempt < 2) {
          // Automatic 3s retry for cold starts
          await new Promise((resolve) => setTimeout(resolve, 3000));
          return executePrediction(attempt + 1);
        }
        setError("Cloud AI server is currently waking up or busy. Please try again in 10-15 seconds.");
      } finally {
        if (attempt >= 2) {
          setLoading(false);
        }
      }
    };

    await executePrediction(1);
    setLoading(false);
  };
  const diseaseInfo = (result?.disease_info && result.disease_info.description) 
    ? result.disease_info 
    : (result ? getDiseaseInfo(result.label) : null);
  const healthy = result ? isHealthy(result.label) : false;
  const uncertain = result?.label === "Unknown" || result?.uncertain || (result?.confidence !== undefined && Number(result.confidence) < 45);
  const displayName = diseaseInfo?.displayName || (result ? formatDiseaseName(result.label) : "");
  const referenceImage = result ? getDiseaseImage(result.label) : null;

  const handleImageError = (event) => {
    event.currentTarget.src = getCropImagePlaceholder();
  };

  return (
    <PageTransition className="mx-auto max-w-6xl space-y-8">
      <GlassCard hover={false}>
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-3 text-white">
            <ScanLine size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Plant Disease Detection</h3>
            <p className="text-sm text-slate-500">Upload a leaf image for AI-powered diagnosis</p>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragOver
              ? "border-agri-500 bg-agri-50/50 dark:bg-agri-900/20"
              : "border-slate-300 dark:border-white/20"
          }`}
        >
          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <Upload size={48} className="mx-auto text-agri-500 mb-4" />
          </motion.div>
          <p className="font-semibold text-slate-700 dark:text-white">
            Drag & drop your leaf image here
          </p>
          <p className="mt-1 text-sm text-slate-500">or click to browse</p>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files[0])}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </div>

        {preview && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
            <img src={preview} alt="Preview" className="mx-auto max-h-72 rounded-2xl object-contain bg-slate-900/5 dark:bg-black/20 p-2 shadow-lg" />
          </motion.div>
        )}

        {loading && <div className="mt-6"><ScanAnimation active={loading} imageUrl={preview} /></div>}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 rounded-2xl border border-red-200 bg-red-50/90 p-4 dark:border-red-900/40 dark:bg-red-950/40"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 text-red-600 dark:text-red-400 shrink-0" size={20} />
              <div>
                <h4 className="font-semibold text-red-800 dark:text-red-200">Image Validation Alert</h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="mt-6 flex justify-center">
          <RippleButton onClick={handleUpload} disabled={!file || loading}>
            {loading ? "Scanning..." : "Predict Disease"}
          </RippleButton>
        </div>
      </GlassCard>

      {result && diseaseInfo && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <GlassCard glow>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your Upload</p>
                {preview && (
                  <img src={preview} alt="Uploaded leaf" className="w-full rounded-2xl object-contain max-h-72 bg-slate-900/5 dark:bg-black/20 p-2 shadow-lg" />
                )}
              </div>
            
              <div className="flex flex-col items-center justify-center text-center">
                <CircularGauge value={result.confidence} unit="%" label="Confidence" size={140} />
                <h3 className="mt-4 text-2xl font-bold text-slate-800 dark:text-white">{displayName}</h3>
                <p className="mt-1 text-sm text-slate-500">{diseaseInfo.crop}</p>
                <span
                  className={`mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${
                    uncertain
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                      : healthy
                      ? "bg-agri-100 text-agri-700 dark:bg-agri-900/40 dark:text-agri-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {uncertain ? <AlertCircle size={16} /> : healthy ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                  {uncertain ? "Inconclusive / Low Confidence" : healthy ? "Healthy" : "Diseased"}
                </span>
              </div>
            </div>
          </GlassCard>

          {uncertain && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 dark:border-amber-700/40 dark:bg-amber-950/40 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" size={20} />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-200">Diagnostic Uncertainty Warning</h4>
                  <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                    The AI diagnosis confidence is low ({result.confidence}%). The uploaded image may not be an actual plant leaf or might have unusual lighting/obstructions. For reliable diagnosis, please upload a well-lit, close-up photo of an actual crop leaf.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {result.top_predictions && result.top_predictions.length > 1 && (
            <GlassCard>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Top Diagnostic Probabilities
              </h4>
              <div className="space-y-3">
                {result.top_predictions.map((pred, i) => (
                  <div key={i} className="flex flex-col space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-slate-700 dark:text-slate-200">
                        {formatDiseaseName(pred.label)}
                      </span>
                      <span className="font-bold text-agri-600 dark:text-agri-400">
                        {pred.confidence}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          i === 0
                            ? "bg-gradient-to-r from-agri-500 to-emerald-400"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                        style={{ width: `${Math.min(pred.confidence, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {result.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-900/30"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 text-yellow-600 dark:text-yellow-400" size={20} />
                <p className="text-sm text-yellow-800 dark:text-yellow-200">{result.message}</p>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            <ExpandableCard title="Disease Description" icon={Leaf} defaultOpen>
              {diseaseInfo.description}
            </ExpandableCard>
            <ExpandableCard title="Symptoms" icon={Stethoscope}>
              {diseaseInfo.symptoms}
            </ExpandableCard>
            <ExpandableCard title="Causes" icon={Bug}>
              {diseaseInfo.causes}
            </ExpandableCard>
            <ExpandableCard title="Prevention" icon={Shield}>
              {diseaseInfo.prevention}
            </ExpandableCard>
            <ExpandableCard title="Organic Treatment" icon={Sprout}>
              {diseaseInfo.organic}
            </ExpandableCard>
            <ExpandableCard title="Chemical Treatment" icon={FlaskConical}>
              {diseaseInfo.chemical}
            </ExpandableCard>
            <ExpandableCard title="Fertilizer Recommendation" icon={FlaskConical}>
              {diseaseInfo.fertilizers}
            </ExpandableCard>
            <ExpandableCard title="Precautions" icon={AlertCircle}>
              {diseaseInfo.precautions}
            </ExpandableCard>
          </div>
        </motion.div>
      )}
    </PageTransition>
  );
}
