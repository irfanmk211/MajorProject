# AgroSmart - Plant Disease Detection System

## Overview

AgroSmart is a smart agriculture web application that uses Machine Learning to predict plant diseases from leaf images. This document covers the complete setup, training, deployment, and testing of the plant disease detection model.

**Architecture:**
- **Frontend**: React + Vite (existing)
- **Backend**: Flask API (Python)
- **ML Model**: MobileNetV2 with Transfer Learning (Keras/TensorFlow)
- **Input**: Plant leaf images (224x224 pixels)
- **Output**: Disease prediction with confidence score

---

## Project Structure

```
AgroSmart-main/
├── backend/
│   ├── app.py                      # Flask API server
│   ├── requirements.txt            # Backend dependencies
│   ├── plant_disease_model.keras   # Trained model (generated)
│   └── class_names.json            # Class labels (generated)
│
├── training/
│   ├── train.py                    # Training script
│   ├── evaluate.py                 # Evaluation script
│   ├── data_loader.py              # Dataset loader
│   ├── requirements.txt            # Training dependencies
│   └── __init__.py
│
├── frontend/
│   ├── src/
│   │   └── pages/Disease.jsx       # Disease prediction UI
│   ├── package.json
│   └── ...
│
└── README.md                       # This file
```

---

## Prerequisites

- **Python 3.9+** (3.10 or 3.11 recommended)
- **Node.js 16+** and npm (for frontend)
- **Git** (optional, for version control)
- **Disk space**: ~2-3 GB (for model + datasets + virtual environment)
- **GPU** (optional but recommended for faster training) - NVIDIA GPU with CUDA

---

## Step 1: Prepare Your Dataset

### Dataset Structure

Your datasets are organized by crop type in `c:\Datasets\`. The training pipeline automatically discovers classes from the folder structure.

**Supported structures:**

```
Tomato/
├── train/
│   ├── Bacterial_spot/
│   │   └── image1.jpg, image2.jpg, ...
│   ├── Early_blight/
│   │   └── image1.jpg, image2.jpg, ...
│   ├── healthy/
│   │   └── ...
│   └── ...
└── valid/
    └── (same structure)
```

or

```
BlackPepper/
├── Footrot/
│   └── image1.jpg, image2.jpg, ...
├── Healthy/
│   └── ...
└── ...
```

**Automatic Split:**
- The training script automatically creates **70% train / 15% validation / 15% test** splits
- Split is reproducible using a fixed random seed (42)

### Dataset Path
```
Dataset Root: c:\Datasets
```

---

## Step 2: Install Training Dependencies

Open PowerShell and navigate to the training directory:

```powershell
cd C:\Users\Kruthi\Downloads\AgroSmart-main\training

# Create virtual environment (optional but recommended)
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt
```

**Expected installations:**
- tensorflow==2.14.0
- keras==2.14.0
- numpy
- scikit-learn
- matplotlib
- seaborn
- Pillow

---

## Step 3: Train the Model

### Quick Start (Recommended)

```powershell
# From training/ directory
cd C:\Users\Kruthi\Downloads\AgroSmart-main\training

python train.py --dataset "C:\Datasets" --model-dir "..\backend" --epochs-head 10 --epochs-finetune 15
```

### Training Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--dataset` | (required) | Path to dataset root (e.g., `C:\Datasets`) |
| `--model-dir` | `../backend` | Directory to save trained model |
| `--img-size` | 224 | Input image size (224x224 for MobileNetV2) |
| `--epochs-head` | 10 | Epochs for training classification head |
| `--epochs-finetune` | 15 | Epochs for fine-tuning upper layers |

### What Happens During Training

1. **Data Discovery**: Scans dataset folders and discovers all classes
2. **Train/Val/Test Split**: Creates 70/15/15 split with fixed seed
3. **Preprocessing**: 
   - Resizes images to 224x224
   - Applies data augmentation (rotation, zoom, contrast, etc.)
   - Normalizes to MobileNetV2 input range ([-1, 1])
4. **Phase 1 - Head Training** (10 epochs):
   - Loads pretrained MobileNetV2 (ImageNet weights)
   - Freezes base model
   - Trains classification head only
   - Uses early stopping and learning rate reduction
5. **Phase 2 - Fine-tuning** (15 epochs):
   - Unfreezes top 50 layers of MobileNetV2
   - Fine-tunes with lower learning rate (0.0001)
   - Validates with EarlyStopping
6. **Saves Model**: 
   - `plant_disease_model.keras` - Trained model
   - `class_names.json` - Class mapping

### Expected Duration
- **With GPU**: 15-30 minutes for full dataset
- **With CPU**: 1-2 hours
- Depends on dataset size and hardware

### Training Output

The script will print:
```
============================================================
LOADING DATASET
============================================================
Discovered 42 classes:
  - Tomato___Early_Blight: 456 images
  - Tomato___Late_Blight: 512 images
  ...
Train: 6432
Val: 1374
Test: 1374

============================================================
BUILDING MODEL
============================================================
Model architecture:
Total params: 2,261,504
...

============================================================
PHASE 1: TRAINING CLASSIFICATION HEAD
============================================================
Epoch 1/10
1200/1200 [==============================] - 45s 38ms/step - loss: 0.8453 - accuracy: 0.7432 - val_loss: 0.5123 - val_accuracy: 0.8234
...

============================================================
PHASE 2: FINE-TUNING
============================================================
...

============================================================
TRAINING COMPLETE!
============================================================
```

---

## Step 4: Evaluate the Model

After training, evaluate performance on test set:

```powershell
cd C:\Users\Kruthi\Downloads\AgroSmart-main\training

python evaluate.py \
  --model "..\backend\plant_disease_model.keras" \
  --class-names "..\backend\class_names.json" \
  --dataset "C:\Datasets" \
  --output "evaluation_results"
```

### Evaluation Metrics

The script generates:

1. **Overall Metrics:**
   - Accuracy
   - Precision (weighted)
   - Recall (weighted)
   - F1-Score

2. **Per-Class Metrics:**
   - Precision, Recall, F1 for each disease class
   - Identifies poorly performing classes (< 50% recall)

3. **Outputs:**
   - `evaluation_results/evaluation_report.json` - Metrics
   - `evaluation_results/confusion_matrix.png` - Visualization

**Example output:**
```
Overall Metrics:
  Accuracy:  0.8756
  Precision: 0.8823
  Recall:    0.8756
  F1-Score:  0.8763

Per-Class Metrics:
Tomato___Early_Blight    0.92    0.89    0.90
Tomato___Late_Blight     0.87    0.91    0.89
...

Poorly Performing Classes (Recall < 0.5):
  Rice___Bacterial_leaf_blight: 0.4234 recall
```

---

## Step 5: Install Backend Dependencies

```powershell
cd C:\Users\Kruthi\Downloads\AgroSmart-main\backend

# Create virtual environment (optional)
python -m venv venv
.\venv\Scripts\Activate

# Install dependencies
pip install -r requirements.txt
```

---

## Step 6: Start the Backend API

```powershell
cd C:\Users\Kruthi\Downloads\AgroSmart-main\backend

# If using virtual environment
.\venv\Scripts\Activate

# Run Flask app
python app.py
```

**Expected output:**
```
 * Serving Flask app 'app'
 * Debug mode: on
WARNING in app.run(), this is a development server...
Press CTRL+C to quit

[CROP MODEL] Loading model from: C:\Users\Kruthi\OneDrive\Documents\Datatrain\crop_model.pkl
[CROP MODEL] Loaded successfully with 22 classes.

[DISEASE MODEL] Loaded model from: C:\Users\Kruthi\Downloads\AgroSmart-main\backend\plant_disease_model.keras
[DISEASE MODEL] Loaded 42 class names from JSON
[DISEASE MODEL] Classes: ['Black_Pepper___Footrot', 'Black_Pepper___Healthy', ...]

 * Running on http://127.0.0.1:5000
```

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Health check |
| `/api/predict` | POST | Predict disease from image |
| `/predict-disease` | POST | Legacy endpoint (redirects to `/api/predict`) |
| `/predict-crop` | POST | Crop recommendation (existing) |
| `/sensor` | POST | Receive sensor data (existing) |
| `/get_sensor` | GET | Get sensor data (existing) |

---

## Step 7: Start the Frontend

```powershell
cd C:\Users\Kruthi\Downloads\AgroSmart-main\frontend

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

**Expected output:**
```
  VITE v8.0.10  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Press h to show help
```

Open browser: **http://localhost:5173**

---

## Step 8: Test the Complete Flow

### Using Frontend UI

1. Navigate to **Plant Disease Detection** page
2. Upload or drag-drop a plant leaf image
3. Click **"Predict Disease"**
4. See results: Plant name, Disease, Confidence

### Using API (cURL or Postman)

**Request:**
```bash
curl -X POST http://localhost:5000/api/predict \
  -F "image=@leaf_image.jpg"
```

**Response (Success):**
```json
{
  "success": true,
  "prediction": {
    "plant": "Black Pepper",
    "disease": "Footrot",
    "label": "Black_Pepper___Footrot",
    "confidence": 94.7
  },
  "top_predictions": [
    {
      "label": "Black_Pepper___Footrot",
      "confidence": 94.7
    },
    {
      "label": "Black_Pepper___Healthy",
      "confidence": 3.1
    },
    {
      "label": "Black_Pepper___Leaf_Spot",
      "confidence": 2.2
    }
  ]
}
```

**Response (Low Confidence):**
```json
{
  "success": true,
  "prediction": {
    "plant": "Unknown",
    "disease": "Uncertain",
    "label": "Unknown",
    "confidence": 43.2
  },
  "message": "Image confidence (43.2%) is below threshold (60%). Please upload a clearer plant leaf image.",
  "top_predictions": [...]
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid file type. Allowed: jpg, jpeg, png, webp"
}
```

### Using Python Requests

```python
import requests

# Test with local image
url = "http://localhost:5000/api/predict"
files = {"image": open("test_leaf.jpg", "rb")}

response = requests.post(url, files=files)
result = response.json()

print(f"Plant: {result['prediction']['plant']}")
print(f"Disease: {result['prediction']['disease']}")
print(f"Confidence: {result['prediction']['confidence']}%")
```

---

## Configuration

### Backend Configuration (app.py)

```python
IMG_SIZE = 224                    # Input image size
CONFIDENCE_THRESHOLD = 0.60       # Minimum confidence (0-1)
MAX_FILE_SIZE = 10 * 1024 * 1024 # Max upload size (10 MB)
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
```

### Frontend Configuration (frontend/src/config.js or Disease.jsx)

Update API URL if needed:
```javascript
const API_URL = "http://127.0.0.1:5000";  // Or your backend URL
```

---

## Model Architecture Details

### MobileNetV2

- **Base Model**: MobileNetV2 pretrained on ImageNet
- **Input Size**: 224 x 224 x 3 (RGB)
- **Preprocessing**: 
  - Normalize to [-1, 1] using MobileNetV2 preprocessing
  - Data augmentation: rotation, zoom, contrast, horizontal flip
- **Classification Head**:
  - Global Average Pooling
  - Dense(256, relu) + Dropout(0.5)
  - Dense(128, relu) + Dropout(0.3)
  - Dense(num_classes, softmax)

### Training Strategy

1. **Phase 1 (Head Training)**:
   - Base model frozen
   - Train only classification head
   - Higher learning rate (0.001)
   - Epochs: 10 (with early stopping)
   - Purpose: Quickly adapt to disease classes

2. **Phase 2 (Fine-tuning)**:
   - Unfreeze top 50 layers of MobileNetV2
   - Lower layers stay frozen
   - Lower learning rate (0.0001)
   - Epochs: 15 (with early stopping)
   - Purpose: Fine-tune features for better performance

### Callbacks

- **EarlyStopping**: Stops training if validation loss doesn't improve for 5 epochs
- **ReduceLROnPlateau**: Reduces learning rate if validation loss plateaus
- **ModelCheckpoint**: Saves best model based on validation accuracy

---

## Class Names Format

Classes are automatically discovered from dataset structure. Example:

```json
[
  "Tomato___Early_Blight",
  "Tomato___Late_Blight",
  "Tomato___Bacterial_Spot",
  "Tomato___Healthy",
  "Black_Pepper___Footrot",
  "Black_Pepper___Healthy",
  "Rice___Bacterial_leaf_blight",
  "Rice___Brown_spot",
  "Rice___Leaf_smut"
]
```

**Label Parsing:**
- Format: `Plant___Disease`
- Parsed as: `Plant: "Plant Name"`, `Disease: "Disease Name"`
- Original label preserved in response

---

## Troubleshooting

### 1. Model Not Found
```
[DISEASE MODEL] Model or class names file not found.
  Expected model at: C:\Users\Kruthi\Downloads\AgroSmart-main\backend\plant_disease_model.keras
```

**Solution:** Train the model first using `train.py`

### 2. Out of Memory (OOM) Error During Training
```
tensorflow.python.framework.errors_impl.ResourceExhaustedError: OOM when allocating tensor
```

**Solutions:**
- Reduce batch size in `data_loader.py` (currently 32)
- Use GPU if available
- Reduce number of epochs
- Train on subset of data first

### 3. No Images Found
```
ValueError: No images found in C:\Datasets
```

**Solution:** 
- Verify dataset path exists and contains images
- Ensure images have `.jpg`, `.jpeg`, `.png`, or `.webp` extension
- Check folder structure matches expected format

### 4. CORS Error in Frontend
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution:** Backend already has CORS enabled. Ensure:
- Backend is running on `http://127.0.0.1:5000`
- Frontend is running on `http://localhost:5173`
- Both are on localhost (same machine) or backend has proper CORS headers

### 5. GPU Not Being Used

```python
# Check GPU availability
import tensorflow as tf
print("Num GPUs:", len(tf.config.list_physical_devices('GPU')))
```

**Solution:**
- Install CUDA and cuDNN
- Install tensorflow-gpu: `pip install tensorflow[and-cuda]==2.14.0`

---

## Performance Tips

1. **Faster Training:**
   - Use GPU (NVIDIA with CUDA)
   - Reduce image preprocessing time by pre-caching augmented images
   - Use mixed precision training

2. **Better Accuracy:**
   - Increase training epochs (if dataset is large enough)
   - Add more data augmentation
   - Use ensemble of multiple models
   - Manually label hard examples and retrain

3. **Faster Inference:**
   - Use model quantization (convert to TFLite)
   - Deploy on GPU
   - Use batch prediction for multiple images

---

## Complete Command Reference

### Training
```bash
# Train from scratch
cd training
python train.py --dataset "C:\Datasets" --model-dir "..\backend" --epochs-head 10 --epochs-finetune 15

# Custom parameters
python train.py --dataset "C:\Datasets" --img-size 224 --epochs-head 5 --epochs-finetune 10
```

### Evaluation
```bash
# Evaluate on test set
cd training
python evaluate.py \
  --model "..\backend\plant_disease_model.keras" \
  --class-names "..\backend\class_names.json" \
  --dataset "C:\Datasets" \
  --output "evaluation_results"
```

### Backend
```bash
# Start API server
cd backend
python app.py

# Server runs on http://127.0.0.1:5000
```

### Frontend
```bash
# Start development server
cd frontend
npm install  # If dependencies not installed
npm run dev

# Access on http://localhost:5173
```

---

## API Response Examples

### Disease Prediction - Success

**Request:**
```
POST /api/predict
Content-Type: multipart/form-data
file: <binary image data>
```

**Response (200 OK):**
```json
{
  "success": true,
  "prediction": {
    "plant": "Tomato",
    "disease": "Early Blight",
    "label": "Tomato___Early_Blight",
    "confidence": 92.34
  },
  "top_predictions": [
    {
      "label": "Tomato___Early_Blight",
      "confidence": 92.34
    },
    {
      "label": "Tomato___Late_Blight",
      "confidence": 5.67
    },
    {
      "label": "Tomato___Healthy",
      "confidence": 1.99
    }
  ]
}
```

### Disease Prediction - Low Confidence

**Response (200 OK):**
```json
{
  "success": true,
  "prediction": {
    "plant": "Unknown",
    "disease": "Uncertain",
    "label": "Unknown",
    "confidence": 38.92
  },
  "message": "Image confidence (38.92%) is below threshold (60%). Please upload a clearer plant leaf image.",
  "top_predictions": [...]
}
```

### Disease Prediction - Error

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid file type. Allowed: jpg, jpeg, png, webp"
}
```

---

## Files Modified/Created

### Created Files
- `training/data_loader.py` - Dataset loading and splitting
- `training/train.py` - Model training script
- `training/evaluate.py` - Model evaluation script
- `training/requirements.txt` - Training dependencies
- `training/__init__.py` - Python module marker
- `backend/requirements.txt` - Backend dependencies

### Modified Files
- `backend/app.py` - Updated disease prediction endpoint
  - Changed image size from 160x160 to 224x224
  - Updated preprocessing to use MobileNetV2.preprocess_input
  - Added proper label parsing
  - Added confidence threshold
  - Improved error handling
  - Added `/api/predict` endpoint

### Unchanged Files
- `frontend/` - All React components work as-is
- `backend/app.py` - Existing crop prediction endpoint unchanged

---

## Next Steps & Future Improvements

1. **Model Improvements:**
   - Collect more data for poorly performing classes
   - Implement class balancing (weighted loss)
   - Try EfficientNet or Vision Transformer
   - Ensemble multiple models

2. **System Improvements:**
   - Add model versioning
   - Implement caching for frequent predictions
   - Add logging and monitoring
   - Create API documentation (Swagger/OpenAPI)

3. **Frontend Improvements:**
   - Show confidence bar chart
   - Display treatment recommendations per disease
   - Add camera capture (mobile)
   - Save prediction history

4. **Deployment:**
   - Containerize with Docker
   - Deploy on cloud (AWS, GCP, Azure)
   - Use Kubernetes for scaling
   - Set up CI/CD pipeline

---

## Support & Contact

For issues or questions:
1. Check the Troubleshooting section
2. Review training logs for errors
3. Verify dataset structure and paths
4. Ensure all dependencies are installed

---

**Last Updated:** 2026-10-03
**Model Version:** MobileNetV2 v1.0
**Dataset:** Multi-crop plant disease detection
