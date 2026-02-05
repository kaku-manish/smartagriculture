const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Configure Multer for File Uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, 'drone_' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Helper to run image pre-validation script
function runImageValidation(imagePath) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '../ml_engine/validate_image.py');
        const pythonProcess = spawn('python', [pythonScript, imagePath]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(`Validation script exited with code ${code}. Error: ${errorString}`);
                return;
            }
            try {
                const lines = dataString.trim().split('\n');
                const jsonStr = lines[lines.length - 1];
                const result = JSON.parse(jsonStr);
                resolve(result);
            } catch (e) {
                reject(`Failed to parse validation output: ${dataString}`);
            }
        });
    });
}

// Helper to run Python prediction script
function runPredictionScript(imagePath) {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, '../ml_engine/predict_yolo.py');
        const pythonProcess = spawn('python', [pythonScript, imagePath]);

        let dataString = '';
        let errorString = '';

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                reject(`Python script exited with code ${code}. Error: ${errorString}`);
                return;
            }
            try {
                // Find json in output (in case of other logs)
                const lines = dataString.trim().split('\n');
                const jsonStr = lines[lines.length - 1]; // Assume last line is JSON
                const result = JSON.parse(jsonStr);
                resolve(result);
            } catch (e) {
                reject(`Failed to parse Python output: ${dataString}`);
            }
        });
    });
}

// GET /drone/history/:farmId
router.get('/history/:farmId', (req, res) => {
    const farmId = req.params.farmId;
    const sql = `SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC`;

    db.all(sql, [farmId], (err, rows) => {
        if (err) {
            console.error("Error fetching drone history:", err.message);
            return res.status(500).json({ error: 'Failed to fetch history' });
        }
        res.json({ history: rows });
    });
});

// POST /drone/analysis (Now supports multipart/form-data for image)
router.post('/analysis', upload.single('image'), async (req, res) => {
    // 1. Handle File Upload
    let image_reference = req.body.image_reference; // Fallback for simulation
    let disease_type = req.body.disease_type || 'Analyzing...';
    let severity = req.body.severity || 'N/A';
    const farm_id = req.body.farm_id || 1; // Default to 1

    if (req.file) {
        image_reference = req.file.path;
        console.log(`Processing image: ${image_reference}`);

        try {
            // STEP 1: Pre-validate image (check if it's actually a crop/plant)
            console.log(`Pre-validating image: ${image_reference}`);
            const validation = await runImageValidation(image_reference);

            if (!validation.is_valid) {
                console.log("Image validation failed:", validation.reason);
                // Delete the uploaded file since it's not valid
                if (fs.existsSync(image_reference)) {
                    fs.unlinkSync(image_reference);
                }
                return res.status(400).json({
                    error: "INVALID_IMAGE",
                    message: validation.reason || "This image does not appear to be a paddy crop. Please upload a clear image of paddy leaves or plants."
                });
            }

            console.log("Image validation passed:", validation.reason);

            // STEP 2: Run ML Prediction (only if pre-validation passed)
            const prediction = await runPredictionScript(image_reference);

            // CRITICAL: Check if image is invalid (not a crop)
            if (prediction.error === "INVALID_IMAGE") {
                console.log("Invalid image detected:", prediction.message);
                // Delete the uploaded file since it's not valid
                if (fs.existsSync(image_reference)) {
                    fs.unlinkSync(image_reference);
                }
                return res.status(400).json({
                    error: "INVALID_IMAGE",
                    message: prediction.message || "This image does not appear to be a paddy crop. Please upload a clear image of paddy leaves or plants.",
                    confidence: prediction.confidence,
                    detected: prediction.detected
                });
            }

            if (prediction.error) {
                console.error("ML Error:", prediction.error);
                disease_type = "Detection Failed";
            } else {
                disease_type = prediction.disease || 'Unknown';
                // Use actual confidence from ML
                // High severity if > 75% confidence, else Medium/Low
                severity = prediction.confidence > 0.75 ? 'HIGH' : (prediction.confidence > 0.4 ? 'MEDIUM' : 'LOW');
            }

            // Extract extra data
            const confidence = prediction.confidence || 0;
            const annotated_image_ref = prediction.annotated_image || image_reference; // Fallback to original

            // CONFIDENCE THRESHOLD CHECK
            // If confidence is too low (e.g., < 40%), we assume it's noise/non-paddy and DO NOT save to history.
            if (confidence < 0.40) {
                console.log(`Low confidence detection (${(confidence * 100).toFixed(1)}%). Skipping DB save.`);
                // We still return the result to the user so they see "Unknown/Low Confidence" but it won't clutter history.
                return res.json({
                    message: 'Analysis completed (Low Confidence - Not Saved)',
                    analysis_id: null,
                    result: {
                        disease_type: 'Unknown / Low Confidence',
                        severity: 'LOW',
                        confidence: confidence,
                        image_reference,
                        annotated_image_reference: image_reference
                    }
                });
            }

            // 3. Save to Database (Updated Schema)
            const sql = `INSERT INTO drone_analysis (farm_id, disease_type, severity, image_reference, confidence, annotated_image_reference) 
                         VALUES (?, ?, ?, ?, ?, ?)`;

            db.run(sql, [farm_id, disease_type, severity, image_reference, confidence, annotated_image_ref], function (err) {
                if (err) {
                    console.error("DB Insert Error:", err.message);
                    return res.status(500).json({ error: 'Failed to insert analysis' });
                }
                res.json({
                    message: 'Analysis completed',
                    analysis_id: this.lastID,
                    result: {
                        disease_type,
                        severity,
                        confidence,
                        image_reference,
                        annotated_image_reference: annotated_image_ref
                    }
                });
            });
        } catch (err) {
            console.error("Prediction Script Failed:", err);
            res.status(500).json({ error: "Analysis process failed" });
        }
    } else {
        res.status(400).json({ error: "No image uploaded" });
    }
});

module.exports = router;
