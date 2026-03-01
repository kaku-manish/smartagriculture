import os
import sys
import time
import json
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, Response

from database import db_all, db_run

router = APIRouter()
logger = logging.getLogger("agro-backend")

BASE_DIR = Path(__file__).resolve().parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ML_ENGINE_DIR = BASE_DIR.parent / "server" / "ml_engine"
MODEL_PATH = str(ML_ENGINE_DIR / "runs" / "paddy_cls2" / "weights" / "best.pt")

# ── Load ML model once at startup (in-process, no subprocess) ─────────────────
_yolo_model = None

def get_model():
    global _yolo_model
    if _yolo_model is None:
        try:
            from ultralytics import YOLO
            logger.info(f"Loading YOLO model from {MODEL_PATH}")
            _yolo_model = YOLO(MODEL_PATH)
            logger.info("YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            raise RuntimeError(f"Model load failed: {e}")
    return _yolo_model


def validate_image(image_path: str) -> tuple:
    """Returns (is_valid, reason)"""
    try:
        import cv2
        import numpy as np
        img = cv2.imread(image_path)
        if img is None:
            return False, "Unable to read image. Upload a valid JPG or PNG."
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lower_green = np.array([30, 40, 40])
        upper_green = np.array([90, 255, 255])
        mask = cv2.inRange(hsv, lower_green, upper_green)
        green_ratio = float(mask.sum()) / (img.shape[0] * img.shape[1] * 255)
        if green_ratio < 0.10:
            return False, f"Not enough greenery ({int(green_ratio*100)}%). Doesn't look like a paddy crop."
        return True, "Valid paddy crop image"
    except Exception as e:
        logger.warning(f"Image validation error: {e}")
        return True, "Validation skipped"


def run_prediction(image_path: str) -> dict:
    """Run YOLO prediction in-process (fast, reliable)"""
    try:
        import cv2
        model = get_model()
        results = model(image_path, verbose=False)
        result = results[0]

        CONFIDENCE_THRESHOLD = 0.15
        top5_indices = result.probs.top5
        top5_confs = [float(result.probs.data[i]) for i in top5_indices]

        primary_disease = result.names[top5_indices[0]]
        primary_conf = top5_confs[0]

        detected_diseases = [primary_disease]
        for i in range(1, min(3, len(top5_indices))):
            if top5_confs[i] >= CONFIDENCE_THRESHOLD:
                detected_diseases.append(result.names[top5_indices[i]])

        final_disease_name = ", ".join(detected_diseases) if len(detected_diseases) > 1 else primary_disease

        # Save annotated image
        plotted_img = result.plot()
        base_name = os.path.basename(image_path)
        name, ext = os.path.splitext(base_name)
        annotated_path = str(UPLOADS_DIR / f"{name}_analyzed{ext}")
        cv2.imwrite(annotated_path, plotted_img)

        return {
            "disease": final_disease_name,
            "confidence": primary_conf,
            "all_detected": detected_diseases,
            "annotated_image": annotated_path
        }
    except Exception as e:
        logger.error(f"Prediction error: {e}", exc_info=True)
        return {"error": str(e)}


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/history/{farmId}")
def get_drone_history(farmId: int, response: Response):
    try:
        rows = db_all(
            "SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC",
            [farmId]
        )
        return {"history": rows}
    except Exception as e:
        logger.error(f"Error fetching drone history: {e}")
        response.status_code = 500
        return {"error": "Failed to fetch history"}


@router.post("/analysis")
async def process_analysis(
    response: Response,
    image: UploadFile = File(None),
    farm_id: int = Form(1),
    disease_type: str = Form("Analyzing..."),
    severity: str = Form("N/A")
):
    if not image:
        response.status_code = 400
        return {"error": "No image uploaded"}

    image_path = None
    try:
        # ── Save uploaded file ─────────────────────────────────────────────────
        ext = os.path.splitext(image.filename or "image.jpg")[1] or ".jpg"
        timestamp = int(time.time() * 1000)
        filename = f"drone_{timestamp}{ext}"
        image_path = str(UPLOADS_DIR / filename)

        with open(image_path, "wb") as buffer:
            buffer.write(await image.read())

        logger.info(f"Image saved: {image_path}")

        # ── Validate image ─────────────────────────────────────────────────────
        is_valid, reason = validate_image(image_path)
        if not is_valid:
            if os.path.exists(image_path):
                os.remove(image_path)
            response.status_code = 400
            return {"error": "INVALID_IMAGE", "message": reason}

        logger.info("Image validation passed")

        # ── Run ML prediction ──────────────────────────────────────────────────
        prediction = run_prediction(image_path)

        if prediction.get("error"):
            logger.error(f"ML Error: {prediction['error']}")
            response.status_code = 500
            return {
                "error": "ML_PROCESS_ERROR",
                "message": "Analysis engine error.",
                "details": prediction["error"]
            }

        disease_type   = prediction.get("disease", "Unknown")
        confidence     = float(prediction.get("confidence", 0.0))
        annotated_ref  = prediction.get("annotated_image", image_path)

        if confidence > 0.75:
            severity = "HIGH"
        elif confidence > 0.4:
            severity = "MEDIUM"
        else:
            severity = "LOW"

        # ── Low confidence — don't save ────────────────────────────────────────
        if confidence < 0.40:
            logger.info(f"Low confidence ({confidence*100:.1f}%) — not saving to DB")
            return {
                "message": "Analysis completed (Low Confidence - Not Saved)",
                "analysis_id": None,
                "result": {
                    "disease_type": "Unknown / Low Confidence",
                    "severity": "LOW",
                    "confidence": confidence,
                    "image_reference": image_path,
                    "annotated_image_reference": annotated_ref
                }
            }

        # ── Save to DB ─────────────────────────────────────────────────────────
        sql = """INSERT INTO drone_analysis
                 (farm_id, disease_type, severity, image_reference, confidence, annotated_image_reference)
                 VALUES (?, ?, ?, ?, ?, ?)"""
        res_ins = db_run(sql, [farm_id, disease_type, severity, image_path, confidence, annotated_ref])
        logger.info(f"Analysis saved: id={res_ins['lastID']} disease={disease_type} conf={confidence:.2f}")

        return {
            "message": "Analysis completed",
            "analysis_id": res_ins["lastID"],
            "result": {
                "disease_type": disease_type,
                "severity": severity,
                "confidence": confidence,
                "image_reference": image_path,
                "annotated_image_reference": annotated_ref
            }
        }

    except Exception as e:
        logger.error(f"Unexpected error in /drone/analysis: {e}", exc_info=True)
        response.status_code = 500
        return {"error": f"Server error: {str(e)}"}
