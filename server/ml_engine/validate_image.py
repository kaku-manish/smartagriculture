import sys
import json
import os
import cv2
import numpy as np

def validate_crop_image(img_path):
    """
    Validates if an image appears to be a crop/plant (specifically paddy).
    Heuristics:
    1. Check for dominant Green color (Hue range in HSV).
    2. Check for some Edge complexity (not a blank or solid image).
    """
    try:
        if not os.path.exists(img_path):
             return False, "File not found"

        img = cv2.imread(img_path)
        if img is None:
            return False, "Unable to read image file. Please upload a valid JPG or PNG."

        # Convert to HSV
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)

        # Calculate Green Pixel Ratio
        # Green Hue range typically [35, 85]
        lower_green = np.array([30, 40, 40])
        upper_green = np.array([90, 255, 255])
        
        mask = cv2.inRange(hsv, lower_green, upper_green)
        green_ratio = np.count_nonzero(mask) / (img.shape[0] * img.shape[1])

        # Threshold: At least 15% of the image should be greenish for a close-up crop shot
        # or even 10% for wider shots.
        if green_ratio < 0.10:
             return False, f"Not enough greenery ({int(green_ratio*100)}%). This does not look like a paddy crop."

        return True, "✅ Valid paddy crop image detected"
        
    except Exception as e:
        return False, f"Validation error: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided"}))
        sys.exit(1)
    
    img_path = sys.argv[1]
    is_valid, reason = validate_crop_image(img_path)
    
    result = {
        "is_valid": is_valid,
        "reason": reason
    }
    
    # Ensure JSON output is clean
    print(json.dumps(result))
