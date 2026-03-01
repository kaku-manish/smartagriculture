const express = require('express');
const router = express.Router();
const db = require('../database');
const reportEngine = require('../engine/report_engine');
const path = require('path');

// GET /field/:id/message-summary
router.get('/field/:id/message-summary', (req, res) => {
    const farmId = req.params.id;
    const summaryEngine = require('../engine/summary_engine');

    const sql = `
        SELECT r.*, f.farmer_name, (SELECT COUNT(*) FROM field_zones WHERE farm_id = f.farm_id) as zones_count
        FROM farms f
        LEFT JOIN disease_risk_assessments r ON r.zone_id = f.farm_id
        WHERE f.farm_id = ? 
        ORDER BY r.timestamp DESC LIMIT 1
    `;

    db.get(sql, [farmId], (err, data) => {
        if (err || !data || !data.overall_risk_score) {
            return res.status(404).json({ error: "No risk data found to generate summary." });
        }

        const rec = JSON.parse(data.recommendation_json || '{}');
        const inputData = {
            risk_score: Math.round(data.overall_risk_score),
            risk_level: data.overall_risk_score > 75 ? 'CRITICAL' : (data.overall_risk_score > 50 ? 'HIGH' : 'MEDIUM'),
            disease: 'Blast', // Fallback or dynamic
            zones_count: data.zones_count || 1,
            treatment: rec.treatment?.product_name || 'Tricyclazole 75% WP',
            dosage: rec.treatment?.dosage_per_acre || '120g in 200L water',
            spray_window: rec.best_spray_window?.[0]?.time || '06:00 AM - 09:00 AM',
            reasons: [
                "Humidity levels are critically high",
                "Spore count in neighboring zones is rising",
                "Crop stage is highly vulnerable"
            ],
            reasons_te: [
                "గాలిలో తేమ శాతం అధికంగా ఉంది",
                "పొరుగు పొలాల్లో తెగులు వ్యాప్తి చెందుతోంది",
                "వరి పంట ప్రస్తుత దశలో తెగులు సులభంగా ఆశించే అవకాశం ఉంది"
            ]
        };

        const summary = summaryEngine.generate(inputData);
        res.json(summary);
    });
});

// GET /reports/:farmId - Fetch reports for a specific farm
router.get('/:farmId', (req, res) => {
    const farmId = req.params.farmId;
    db.all("SELECT * FROM reports WHERE farm_id = ? ORDER BY generated_date DESC", [farmId], (err, rows) => {
        if (err) return res.status(500).json({ error: "Failed to fetch reports" });
        res.json({ reports: rows });
    });
});

// POST /reports/generate
router.post('/generate', async (req, res) => {
    const { farm_id, language = 'en' } = req.body;
    console.log(`[REPORTS] Generating report for farm_id: ${farm_id} (language: ${language})`);

    try {
        // 1. Fetch current data for the farm separately
        db.get("SELECT * FROM farms WHERE farm_id = ?", [farm_id], (err, farm) => {
            if (err || !farm) {
                console.log("❌ Report Generation Failed: Farm not found:", farm_id);
                return res.status(404).json({ error: "No risk data found for this farm." });
            }

            db.get("SELECT * FROM disease_risk_assessments WHERE zone_id = ? ORDER BY timestamp DESC LIMIT 1", [farm_id], (err, r) => {
                db.get("SELECT * FROM drone_analysis WHERE farm_id = ? ORDER BY analysis_date DESC LIMIT 1", [farm_id], (err, da) => {
                    if (!r && !da) {
                        console.log("❌ Report Generation Failed: No risk data found for farm_id:", farm_id);
                        return res.status(404).json({ error: "No risk data found for this farm." });
                    }

                    // Default risk score if none exists but we have drone data
                    const overall_risk_score = (r && r.overall_risk_score) ? r.overall_risk_score : (da && da.disease_type ? 75 : 0);
                    const detected_disease = (da && da.disease_type) ? da.disease_type : 'Blast';
                    const annotated_image = (da && da.annotated_image_reference) ? da.annotated_image_reference : null;

                    // Fetch latest cost estimation for this farm
                    db.get("SELECT report_data FROM reports WHERE farm_id = ? AND report_data IS NOT NULL ORDER BY generated_date DESC LIMIT 1", [farm_id], async (err, costRow) => {
                        let costInfo = null;
                        if (costRow && costRow.report_data) {
                            try {
                                const parsed = JSON.parse(costRow.report_data);
                                costInfo = parsed.costData?.primary ? {
                                    medicine_name: parsed.costData.primary.medicine,
                                    medicine_cost: parsed.costData.primary.medicineCost,
                                    equipment_cost: parsed.costData.primary.equipmentCost,
                                    application_cost: parsed.costData.primary.applicationCost,
                                    total_min: parsed.costData.primary.totalMin,
                                    total_max: parsed.costData.primary.totalMax
                                } : null;
                            } catch (e) { }
                        }

                        console.log(`📑 Generating enhanced report for Farm #${farm_id} (${farm.farmer_name})...`);

                        // Prepare data for engine
                        const reportData = {
                            field_name: farm.farmer_name,
                            risk_score: overall_risk_score,
                            risk_level: overall_risk_score > 75 ? 'CRITICAL' : (overall_risk_score > 50 ? 'HIGH' : 'MEDIUM'),
                            dominant_disease: detected_disease,
                            annotated_image: annotated_image,
                            cost_data: costInfo,
                            recommendation: (r && r.recommendation_json) ? JSON.parse(r.recommendation_json) : { "action": "Manual analysis needed" },
                            explainability: [
                                "Environmental suitability for fungi is high",
                                "Neighboring zones report infection spread",
                                "Daily risk trend is accelerating"
                            ]
                        };

                        try {
                            // 2. Generate PDF
                            console.log("- Creating PDF...");
                            const pdf = await reportEngine.generatePDF(reportData, language);

                            // 3. Generate WhatsApp Card
                            console.log("- Creating WhatsApp Cards...");
                            const card = await reportEngine.generateWhatsAppCards(reportData, language);

                            // 4. Save to DB
                            console.log("- Saving to database...");
                            const insertSql = `
                    INSERT INTO reports (farm_id, title, file_path, card_path, status) 
                    VALUES (?, ?, ?, ?, ?)
                `;
                            const title = language === 'te' ? 'వరి చిత్ర నివేదిక' : 'Paddy Health Report';

                            db.run(insertSql, [farm_id, title, pdf.reportId, card.cardId, 'Ready'], function (err) {
                                if (err) {
                                    console.error("❌ DB Insert Failed:", err.message);
                                    return res.status(500).json({ error: err.message });
                                }
                                console.log(`✅ Report #${this.lastID} ready.`);
                                res.json({
                                    message: "Report generated successfully",
                                    report_id: this.lastID,
                                    pdf_url: `/reports/download/${pdf.reportId}`,
                                    card_url: `/reports/cards/${card.cardId}`,
                                    risk_score: reportData.risk_score,
                                    risk_level: reportData.risk_level
                                });
                            });
                        } catch (engineErr) {
                            console.error("❌ Engine Failure:", engineErr.message);
                            res.status(500).json({ error: "Rendering engine failure: " + engineErr.message });
                        }
                    }); // cost get
                }); // da get
            }); // r get
        }); // farm get
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /reports/download/:id
router.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, '../uploads/reports', `${req.params.filename}.pdf`);
    res.download(filePath);
});

// GET /reports/cards/:filename
router.get('/cards/:filename', (req, res) => {
    const filePath = path.join(__dirname, '../uploads/reports', `${req.params.filename}.png`);
    res.sendFile(filePath);
});


module.exports = router;
