"""
Quick API Test Script
Test the plant disease prediction API
"""

import requests
import sys
from pathlib import Path

# Configuration
API_BASE_URL = "http://127.0.0.1:5000"
API_ENDPOINT = f"{API_BASE_URL}/api/predict"


def test_api_health():
    """Test if backend is running."""
    print("\n" + "="*60)
    print("TEST 1: Backend Health Check")
    print("="*60)
    
    try:
        response = requests.get(f"{API_BASE_URL}/")
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Backend is running!")
            print(f"  Status: {data['status']}")
            print(f"  Message: {data['message']}")
            return True
        else:
            print(f"✗ Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"✗ Cannot connect to backend at {API_BASE_URL}")
        print("  Make sure Flask is running: python app.py")
        return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_api_prediction(image_path):
    """Test disease prediction with an image."""
    print("\n" + "="*60)
    print("TEST 2: Disease Prediction")
    print("="*60)
    
    if not Path(image_path).exists():
        print(f"✗ Image file not found: {image_path}")
        return False
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': f}
            print(f"Sending image: {image_path}")
            response = requests.post(API_ENDPOINT, files=files)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                print("✓ Prediction successful!")
                pred = data['prediction']
                print(f"  Plant: {pred['plant']}")
                print(f"  Disease: {pred['disease']}")
                print(f"  Label: {pred['label']}")
                print(f"  Confidence: {pred['confidence']}%")
                
                if data.get('message'):
                    print(f"  ⚠ Message: {data['message']}")
                
                if 'top_predictions' in data:
                    print(f"\n  Top 3 Predictions:")
                    for i, pred in enumerate(data['top_predictions'], 1):
                        print(f"    {i}. {pred['label']}: {pred['confidence']}%")
                
                return True
            else:
                print(f"✗ Prediction failed: {data.get('error', 'Unknown error')}")
                return False
        else:
            print(f"✗ API returned status {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_api_invalid_file():
    """Test error handling with invalid file."""
    print("\n" + "="*60)
    print("TEST 3: Error Handling (Invalid File)")
    print("="*60)
    
    try:
        # Test with no file
        response = requests.post(API_ENDPOINT, files={})
        data = response.json()
        
        if not data.get('success'):
            print(f"✓ Correctly rejected empty request")
            print(f"  Error: {data['error']}")
            return True
        else:
            print(f"✗ Should have rejected empty request")
            return False
    
    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def find_test_image():
    """Find a test image from the dataset."""
    dataset_root = Path("C:\\Datasets")
    
    if not dataset_root.exists():
        return None
    
    # Look for any image file
    for img_file in dataset_root.rglob("*.jpg"):
        return str(img_file)
    
    for img_file in dataset_root.rglob("*.png"):
        return str(img_file)
    
    return None


def main():
    print("\n" + "="*60)
    print("AGROSMART - PLANT DISEASE DETECTION API TEST")
    print("="*60)
    
    # Test 1: Health check
    if not test_api_health():
        print("\n✗ Backend is not running. Start it with:")
        print("  cd backend")
        print("  python app.py")
        sys.exit(1)
    
    # Test 2: Invalid file
    test_api_invalid_file()
    
    # Test 3: Real prediction
    test_image = find_test_image()
    if test_image:
        print(f"\nFound test image: {test_image}")
        test_api_prediction(test_image)
    else:
        print("\n⚠ No test images found in C:\\Datasets")
        print("  Train the model first: python training/train.py --dataset C:\\Datasets")
    
    print("\n" + "="*60)
    print("TESTS COMPLETE")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
