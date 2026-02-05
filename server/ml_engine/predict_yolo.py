import sys
import json
import os
from ultralytics import YOLO

# Path to the best trained model
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'runs/paddy_cls/weights/best.pt')

# Validation disabled as per user request to avoid blocking uploads
CONFIDENCE_THRESHOLD = 0.0  

def predict(img_path):
    if not os.path.exists(MODEL_PATH):
        return {"error": "Model not found. Please train the model first."}

    try:
        model = YOLO(MODEL_PATH)
        
        # Predict
        results = model(img_path)
        
        # Parse results
        result = results[0]
        top1_index = result.probs.top1
        top1_conf = float(result.probs.top1conf)
        class_name = result.names[top1_index]
        
        # --- VALIDATION DISABLED ---
        # We now accept ALL predictions, regardless of confidence score.
        # This ensures the user never gets an upload error.
        
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
            "disease": class_name,
            "confidence": top1_conf,
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
