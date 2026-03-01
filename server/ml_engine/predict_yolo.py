import sys
import json
import os
from ultralytics import YOLO

# Path to the best trained model (Updated to the 97% accuracy model)
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'runs/paddy_cls2/weights/best.pt')

# Validation disabled as per user request to avoid blocking uploads
CONFIDENCE_THRESHOLD = 0.15  # Minimum confidence to list a secondary disease

def predict(img_path):
    if not os.path.exists(MODEL_PATH):
        return {"error": "Model not found. Please train the model first."}

    try:
        model = YOLO(MODEL_PATH)
        
        # Predict
        results = model(img_path)
        
        # Parse results
        result = results[0]
        
        # Get Top-3 Predictions for multi-disease support
        top3_indices = result.probs.top5[:3]  # Get indices of top 5, take top 3
        top3_confs = [float(result.probs.data[i]) for i in top3_indices]
        
        # Primary disease
        primary_disease = result.names[top3_indices[0]]
        primary_conf = top3_confs[0]
        
        # Check for secondary/tertiary diseases (if confidence > 15%)
        detected_diseases = [primary_disease]
        for i in range(1, len(top3_indices)):
            if top3_confs[i] >= CONFIDENCE_THRESHOLD:
                detected_diseases.append(result.names[top3_indices[i]])
        
        # Combine names for UI
        final_disease_name = ", ".join(detected_diseases) if len(detected_diseases) > 1 else primary_disease
        
        # Generate plot/annotation
        import cv2
        plotted_img = result.plot()
        
        # Generate output path
        base_name = os.path.basename(img_path)
        name, ext = os.path.splitext(base_name)
        annotated_filename = f"{name}_analyzed{ext}"
        output_dir = os.path.dirname(img_path)
        annotated_path = os.path.join(output_dir, annotated_filename)
        
        cv2.imwrite(annotated_path, plotted_img)

        return {
            "disease": final_disease_name,
            "confidence": primary_conf,
            "all_detected": detected_diseases,
            "annotated_image": annotated_path
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
