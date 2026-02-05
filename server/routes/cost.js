const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /cost/estimate/:farmId
// Calculate cost estimation based on latest disease detection and farm size
router.get('/estimate/:farmId', (req, res) => {
    const { farmId } = req.params;

    // Get latest disease analysis
    const analysisQuery = `
        SELECT disease_type, severity, confidence 
        FROM drone_analysis 
        WHERE farm_id = ? 
        ORDER BY analysis_date DESC 
        LIMIT 1
    `;

    db.get(analysisQuery, [farmId], (err, analysis) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch analysis' });
        }

        if (!analysis || !analysis.disease_type) {
            return res.json({
                message: 'No disease detected yet. Upload an image for analysis first.',
                hasData: false
            });
        }

        // Get farm details
        const farmQuery = `SELECT field_size, location, farmer_name FROM farms WHERE farm_id = ?`;

        db.get(farmQuery, [farmId], (err, farm) => {
            if (err || !farm) {
                return res.status(500).json({ error: 'Failed to fetch farm details' });
            }

            // Get medicine recommendation
            const diseaseQuery = `
                SELECT medicine, medicine_secondary, dosage, timeline, preventive_measures
                FROM kb_diseases 
                WHERE LOWER(disease_name) = LOWER(?)
                LIMIT 1
            `;

            db.get(diseaseQuery, [analysis.disease_type], (err, disease) => {
                if (err || !disease) {
                    return res.json({
                        message: 'Treatment information not available for this disease',
                        hasData: false
                    });
                }

                // Get medicine prices
                const priceQuery = `
                    SELECT medicine_name, brand_name, unit_price, unit
                    FROM medicine_prices
                    WHERE LOWER(medicine_name) = LOWER(?) OR LOWER(medicine_name) = LOWER(?)
                `;

                db.all(priceQuery, [disease.medicine, disease.medicine_secondary], (err, prices) => {
                    if (err) {
                        return res.status(500).json({ error: 'Failed to fetch prices' });
                    }

                    // Calculate costs
                    const fieldSize = farm.field_size || 1;

                    // Parse dosage (e.g., "500g/acre", "2.5ml/liter", "150ml/ha")
                    const parseDosage = (dosageStr) => {
                        const match = dosageStr.match(/(\d+\.?\d*)\s*(ml|g|kg|liter)?/i);
                        if (match) {
                            return parseFloat(match[1]);
                        }
                        return 0;
                    };

                    const dosageAmount = parseDosage(disease.dosage);

                    // Convert to liters/kg based on field size
                    // Assuming dosage is per acre, convert to total quantity needed
                    let quantityNeeded = dosageAmount * fieldSize;

                    // If dosage is in ml, convert to liters
                    if (disease.dosage.toLowerCase().includes('ml')) {
                        quantityNeeded = quantityNeeded / 1000; // ml to liters
                    }

                    // If dosage is in g, convert to kg
                    if (disease.dosage.toLowerCase().includes('g') && !disease.dosage.toLowerCase().includes('kg')) {
                        quantityNeeded = quantityNeeded / 1000; // g to kg
                    }

                    // Calculate medicine cost
                    const primaryPrice = prices.find(p => p.medicine_name.toLowerCase() === disease.medicine.toLowerCase());
                    const secondaryPrice = prices.find(p => p.medicine_name.toLowerCase() === disease.medicine_secondary.toLowerCase());

                    const primaryCost = primaryPrice ? (primaryPrice.unit_price * quantityNeeded) : 0;
                    const secondaryCost = secondaryPrice ? (secondaryPrice.unit_price * quantityNeeded) : 0;

                    // Equipment cost (sprayer rental, etc.) - flat rate + per acre
                    const equipmentCost = 200 + (fieldSize * 50);

                    // Application cost (if farmer hires labor) - per acre
                    const applicationCost = fieldSize * 150;

                    // Total estimation
                    const totalMin = Math.round(primaryCost + equipmentCost);
                    const totalMax = Math.round(primaryCost + equipmentCost + applicationCost);

                    // Alternative option total
                    const alternativeTotalMin = Math.round(secondaryCost + equipmentCost);
                    const alternativeTotalMax = Math.round(secondaryCost + equipmentCost + applicationCost);

                    res.json({
                        hasData: true,
                        disease: {
                            name: analysis.disease_type,
                            severity: analysis.severity || 'MEDIUM',
                            confidence: analysis.confidence ? (analysis.confidence * 100).toFixed(1) : 'N/A'
                        },
                        farm: {
                            size: fieldSize,
                            location: farm.location,
                            farmerName: farm.farmer_name
                        },
                        primary: {
                            medicine: disease.medicine,
                            brand: primaryPrice?.brand_name || 'Generic',
                            dosage: disease.dosage,
                            unitPrice: primaryPrice?.unit_price || 0,
                            unit: primaryPrice?.unit || 'liter',
                            quantityNeeded: quantityNeeded.toFixed(2),
                            medicineCost: Math.round(primaryCost),
                            equipmentCost: equipmentCost,
                            applicationCost: applicationCost,
                            totalMin: totalMin,
                            totalMax: totalMax
                        },
                        alternative: disease.medicine_secondary ? {
                            medicine: disease.medicine_secondary,
                            brand: secondaryPrice?.brand_name || 'Generic',
                            unitPrice: secondaryPrice?.unit_price || 0,
                            unit: secondaryPrice?.unit || 'liter',
                            quantityNeeded: quantityNeeded.toFixed(2),
                            medicineCost: Math.round(secondaryCost),
                            equipmentCost: equipmentCost,
                            applicationCost: applicationCost,
                            totalMin: alternativeTotalMin,
                            totalMax: alternativeTotalMax
                        } : null,
                        timeline: disease.timeline,
                        preventiveMeasures: disease.preventive_measures
                    });
                });
            });
        });
    });
});

// GET /cost/medicines - Get all medicine prices (for admin management)
router.get('/medicines', (req, res) => {
    const query = `SELECT * FROM medicine_prices WHERE available = 1 ORDER BY medicine_name`;

    db.all(query, [], (err, medicines) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch medicines' });
        }
        res.json(medicines);
    });
});

// PUT /cost/medicine/:id - Update medicine price (admin only)
router.put('/medicine/:id', (req, res) => {
    const { id } = req.params;
    const { unit_price, brand_name, available } = req.body;

    const query = `
        UPDATE medicine_prices 
        SET unit_price = ?, brand_name = ?, available = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(query, [unit_price, brand_name, available, id], function (err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update medicine' });
        }
        res.json({ message: 'Medicine updated successfully', changes: this.changes });
    });
});

// GET /cost/diseases - Get list of all unique disease names
router.get('/diseases', (req, res) => {
    const query = `SELECT DISTINCT disease_name FROM kb_diseases ORDER BY disease_name`;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch diseases' });
        res.json(rows.map(r => r.disease_name));
    });
});

// POST /cost/medicine - Add new medicine (admin only)
router.post('/medicine', (req, res) => {
    const { medicine_name, brand_name, unit_price, unit, disease_name } = req.body;

    const query = `
        INSERT INTO medicine_prices (medicine_name, brand_name, unit_price, unit, disease_name)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [medicine_name, brand_name, unit_price, unit, disease_name], function (err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to add medicine' });
        }
        res.json({ message: 'Medicine added successfully', id: this.lastID });
    });
});

// GET /cost/grouped-medicines - Get medicines grouped by disease
router.get('/grouped-medicines', (req, res) => {
    const query = `
        SELECT 
            COALESCE(mp.disease_name, d.disease_name) as disease_group, 
            mp.id, 
            mp.medicine_name, 
            mp.brand_name, 
            mp.unit_price, 
            mp.unit, 
            mp.available
        FROM medicine_prices mp
        LEFT JOIN (
            SELECT DISTINCT medicine, disease_name FROM kb_diseases
            UNION
            SELECT DISTINCT medicine_secondary, disease_name FROM kb_diseases
        ) d ON LOWER(mp.medicine_name) = LOWER(d.medicine)
        WHERE COALESCE(mp.disease_name, d.disease_name) IS NOT NULL
        ORDER BY disease_group, mp.medicine_name
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch grouped medicines' });
        }

        const grouped = rows.reduce((acc, row) => {
            const dName = row.disease_group || 'Uncategorized';
            if (!acc[dName]) {
                acc[dName] = [];
            }

            const isDuplicate = acc[dName].find(m =>
                m.id === row.id ||
                m.medicine_name.toLowerCase() === row.medicine_name.toLowerCase()
            );

            if (!isDuplicate) {
                acc[dName].push({
                    id: row.id,
                    medicine_name: row.medicine_name,
                    brand_name: row.brand_name,
                    unit_price: row.unit_price,
                    unit: row.unit,
                    available: row.available
                });
            }
            return acc;
        }, {});

        res.json(grouped);
    });
});

module.exports = router;
