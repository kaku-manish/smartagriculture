"""Quick test of the full drone analysis pipeline"""
import sys
import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ML_ENGINE = BASE_DIR.parent / "server" / "ml_engine"
PYTHON_EXE = sys.executable

# Create a small test image
import cv2
import numpy as np
test_img_path = str(BASE_DIR / "uploads" / "test_img.jpg")
img = np.zeros((224, 224, 3), dtype=np.uint8)
img[:, :] = (34, 139, 34)  # green
cv2.imwrite(test_img_path, img)
print(f"Test image created: {test_img_path}")

# Test validate_image.py
print("\n--- Testing validate_image.py ---")
validate_script = str(ML_ENGINE / "validate_image.py")
result = subprocess.run([PYTHON_EXE, validate_script, test_img_path],
                        capture_output=True, text=True, timeout=30)
print("stdout:", result.stdout)
print("stderr:", result.stderr[:500] if result.stderr else "")
print("returncode:", result.returncode)

# Test predict_yolo.py
print("\n--- Testing predict_yolo.py ---")
predict_script = str(ML_ENGINE / "predict_yolo.py")
result2 = subprocess.run([PYTHON_EXE, predict_script, test_img_path],
                         capture_output=True, text=True, timeout=60)
print("stdout:", result2.stdout)
print("stderr:", result2.stderr[:1000] if result2.stderr else "")
print("returncode:", result2.returncode)
