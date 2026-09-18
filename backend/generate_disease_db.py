import json
import re
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CLASS_NAMES_PATH = os.path.join(BASE_DIR, "class_names.txt")

with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
    class_names = [line.strip() for line in f if line.strip()]

def format_camel_case(s):
    s = re.sub(r'([a-z])([A-Z])', r'\1 \2', s)
    return s.strip()

def get_crop_and_disease(raw_label):
    if '__' in raw_label:
        parts = raw_label.split('__')
        crop = parts[0]
        disease_raw = parts[-1]
    elif '_' in raw_label:
        parts = raw_label.split('_', 1)
        crop = parts[0]
        disease_raw = parts[1]
    else:
        crop = raw_label
        disease_raw = 'Condition'
    
    crop_clean = format_camel_case(crop)
    disease_clean = format_camel_case(disease_raw)
    return crop_clean, disease_clean

db = {}
for label in class_names:
    crop, disease_clean = get_crop_and_disease(label)
    display_name = f"{crop} - {disease_clean}"
    is_healthy = "healthy" in label.lower() or "healthy" in disease_clean.lower()
    
    if is_healthy:
        db[label] = {
            "displayName": display_name,
            "crop": crop,
            "disease": disease_clean,
            "status": "Healthy",
            "description": f"The {crop} leaf exhibits vibrant coloration, optimal chlorophyll density, and no observable signs of viral, bacterial, or fungal pathogens.",
            "symptoms": "Uniform leaf pigmentation, intact margins, vigorous cellular structure, and absence of wilting, chlorosis, or necrotic spots.",
            "causes": "Optimal soil moisture, balanced nitrogen-phosphorus-potassium (NPK) ratios, and proper sunlight exposure.",
            "prevention": "Conduct routine crop scouting, maintain consistent drip irrigation scheduling, and apply mulching to conserve root zone moisture.",
            "organic": "Apply preventive foliar neem oil spray (1%) or enriched vermicompost tea to strengthen native leaf microflora.",
            "chemical": "No chemical fungicide or pesticide required. Maintain balanced micronutrient fertigation.",
            "fertilizers": "Maintain balanced organic compost or slow-release NPK fertilizer appropriate for the crop vegetative stage.",
            "precautions": "Avoid overwatering and ensure soil has good drainage to prevent root rot conditions."
        }
    else:
        db[label] = {
            "displayName": display_name,
            "crop": crop,
            "disease": disease_clean,
            "status": "Infected",
            "description": f"{disease_clean} identified on {crop} foliage. This condition impacts photosynthesis, nutrient transport, and crop yield if left unmanaged.",
            "symptoms": f"Characteristic symptoms of {disease_clean} including foliar spotting, curling, chlorosis, or localized tissue necrosis on {crop} leaves.",
            "causes": "Fungal or bacterial inoculum spread by splashing water, high relative humidity (>80%), infected tools, or insect vectors.",
            "prevention": "Prune and destroy infected foliage immediately, improve canopy airflow, use certified disease-free planting stock, and avoid overhead watering.",
            "organic": "Spray cold-pressed Neem Oil (3-5 ml/L with soap emulsifier), Trichoderma viride bio-fungicide, or Pseudomonas fluorescens.",
            "chemical": f"For severe infections of {disease_clean}, apply targeted curative fungicides/bactericides (e.g. Copper Oxychloride 50 WP @ 2.5g/L or Carbendazim 50 WP @ 1g/L).",
            "fertilizers": "Apply Potassium (K) and Silicate foliar sprays to reinforce plant cell walls; minimize excess Nitrogen.",
            "precautions": "Observe standard Pre-Harvest Intervals (PHI), rotate fungicide FRAC codes, and use protective gear during spraying."
        }

output_path = os.path.join(BASE_DIR, "disease_info.json")
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(db, f, indent=2)

print(f"Successfully generated {len(db)} disease records in {output_path}")
