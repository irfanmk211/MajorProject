import diseaseData from "./disease_info.json";

const healthyKeywords = ["healthy", "___healthy"];

function normalizeLabel(label) {
  if (!label) return "";
  return label
    .replace(/___/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findDiseaseEntry(label) {
  if (!label) return null;

  if (diseaseData[label]) {
    return diseaseData[label];
  }

  const target = normalizeLabel(label);

  for (const [key, entry] of Object.entries(diseaseData)) {
    if (normalizeLabel(key) === target) {
      return entry;
    }
  }

  return null;
}

export function isHealthy(label) {
  const lower = label?.toLowerCase() || "";
  return healthyKeywords.some(
    (keyword) =>
      lower.includes(keyword.replace("___", " ")) ||
      lower.endsWith("healthy")
  );
}

export function formatDiseaseName(label) {
  const entry = findDiseaseEntry(label);

  if (entry?.displayName) {
    return entry.displayName;
  }

  if (!label) return "Unknown";

  return label.replace(/___/g, " - ").replace(/_/g, " ");
}

// No reference image
export function getDiseaseImage() {
  return null;
}

export function getDiseaseInfo(label) {
  const entry = findDiseaseEntry(label);

  if (entry) {
    return {
      displayName: entry.displayName || formatDiseaseName(label),
      crop: entry.crop || "Plant",
      image: null,
      description: entry.description,
      symptoms: entry.symptoms,
      causes: entry.causes,
      prevention: entry.prevention,
      organic: entry.organic,
      chemical: entry.chemical,
      fertilizers: entry.fertilizers,
      precautions: entry.precautions,
    };
  }

  return {
    displayName: formatDiseaseName(label),
    crop: label?.split(/[\s_]+/)[0] || "Plant",
    image: null,
    description:
      "No detailed advisory is available for this disease.",
    symptoms: "N/A",
    causes: "N/A",
    prevention: "N/A",
    organic: "N/A",
    chemical: "N/A",
    fertilizers: "N/A",
    precautions: "N/A",
  };
}

export const DISEASE_CLASS_COUNT = Object.keys(diseaseData).length;