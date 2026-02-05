import os
import sys
import json
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image

# Suppress TF logs
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'paddy_disease_model.h5')
INDICES_PATH = os.path.join(os.path.dirname(__file__), 'class_indices.json')
IMG_SIZE = (224, 224)

# Confidence threshold - images below this are likely not crops
CONFIDENCE_THRESHOLD = 0.40  # 40% minimum confidence

def load_resources():
    if not os.path.exists(MODEL_PATH) or not os.path.exists(INDICES_PATH):
        return None, None
    
    model = load_model(MODEL_PATH)
    with open(INDICES_PATH, 'r') as f:
        indices = json.load(f)
    
    # Invert mapping: index -> label
    labels = {v: k for k, v in indices.items()}
    return model, labels

def predict(img_path):
    model, labels = load_resources()
    if not model:
        return {"error": "Model not found. Please train the model first."}

    try:
        img = image.load_img(img_path, target_size=IMG_SIZE)
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array /= 255.0

        predictions = model.predict(img_array)
        predicted_class_idx = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class_idx])
        
        predicted_label = labels.get(predicted_class_idx, "Unknown")

        # CRITICAL VALIDATION: Check if confidence is too low
        # Low confidence indicates the image is likely not a crop/plant
        if confidence < CONFIDENCE_THRESHOLD:
            return {
                "error": "INVALID_IMAGE",
                "message": "This image does not appear to be a paddy crop. Please upload a clear image of paddy leaves or plants.",
                "confidence": confidence,
                "detected": predicted_label
            }

        return {
            "disease": predicted_label,
            "confidence": confidence
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)

    img_path = sys.argv[1]
    result = predict(img_path)
    print(json.dumps(result))
