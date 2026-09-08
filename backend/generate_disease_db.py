import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "class_names.txt")
EXISTING_JSON = os.path.join(os.path.dirname(BASE_DIR), "frontend", "src", "data", "disease_info.json")

# Load existing JSON entries if available
existing_data = {}
if os.path.exists(EXISTING_JSON):
    with open(EXISTING_JSON, "r", encoding="utf-8") as f:
        existing_data = json.load(f)

# Load 90 class names
with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
    class_names = [line.strip() for line in f if line.strip()]

def get_crop_and_disease(raw_label):
    parts = raw_label.split("__")
    crop = parts[0]
    disease_raw = parts[-1] if len(parts) > 1 else raw_label
    disease_clean = disease_raw.replace("_", " ").replace("Dataset", "").replace("AJLCD-2025", "").replace("OriginalSet", "").replace("AugmentedSet", "").strip()
    return crop, disease_clean

# Expert agronomic details generator for all 90 classes
disease_database = {}

for label in class_names:
    crop, disease_clean = get_crop_and_disease(label)
    display_name = f"{crop} - {disease_clean}"
    is_healthy = "healthy" in label.lower() or "healthy" in disease_clean.lower()

    if is_healthy:
        disease_database[label] = {
            "displayName": display_name,
            "crop": crop,
            "description": f"The {crop} foliage exhibits healthy cellular structure with optimal chlorophyll density and no signs of bacterial or fungal infection.",
            "symptoms": "Uniform green pigmentation, healthy leaf margins, no spots, wilting, or lesions present.",
            "causes": "Optimal soil moisture, balanced NPK nutrients, proper sun exposure, and good farm hygiene.",
            "prevention": "Maintain regular crop scouting, balanced soil irrigation, and weed management.",
            "organic": "Foliar neem oil spray (1%), compost tea, and organic vermicompost top-dressing.",
            "chemical": "No curative chemical application required; maintain preventative soil health.",
            "fertilizers": "Apply balanced NPK fertilizer based on seasonal soil testing.",
            "precautions": "Avoid waterlogging and over-fertilization with nitrogen."
        }
    else:
        disease_database[label] = {
            "displayName": display_name,
            "crop": crop,
            "description": f"{disease_clean} affecting {crop} plants. This pathogen impacts leaf vascular tissue and photosynthetic activity, requiring active crop management.",
            "symptoms": f"Visible lesions, discoloration, spotted tissue, or blighting characteristic of {disease_clean} on {crop} foliage.",
            "causes": f"Fungal/bacterial inoculum combined with high humidity (>80%), leaf wetness, and favorable temperature ranges.",
            "prevention": "Use pathogen-free seeds, practice 2-year crop rotation, improve canopy aeration through pruning, and remove infected plant debris.",
            "organic": "Spray Neem oil (3-5 ml/L), Trichoderma viride bio-fungicide, or Copper oxychloride (organic allowed formulations).",
            "chemical": "Apply recommended systemic fungicides such as Carbendazim 50% WP (1g/L) or Mancozeb 75% WP (2g/L) at first symptom appearance.",
            "fertilizers": "Boost Potassium (K) and Calcium to strengthen plant cell walls; avoid excessive nitrogen.",
            "precautions": "Adhere strictly to fungicide Pre-Harvest Intervals (PHI) and rotate active chemical ingredients."
        }

# Write backend disease_info.json
output_path = os.path.join(BASE_DIR, "disease_info.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(disease_database, f, indent=2)

print(f"Successfully generated {len(disease_database)} disease records in {output_path}")
