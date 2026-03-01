const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const translations = {
    en: {
        title: "Paddy Health & Disease Report",
        date: "Date",
        field: "Field",
        risk_score: "Risk Score",
        dominant_disease: "Dominant Disease",
        severity: "Severity",
        status: "Status",
        where_problem: "Where is the problem? (Infection Map)",
        what_to_do: "What to do now? (Recommendations)",
        action: "Action",
        treatment: "Treatment",
        dosage: "Dosage",
        spray_window: "Best Spray Time",
        why_suggestion: "Why this suggestion?",
        safety_note: "Safety Note",
        analyzed_view: "AI Vision: Analyzed Drone View",
        cost_breakdown: "Financial: Cost Estimation Breakdown",
        medicine: "Recommended Medicine",
        total_cost: "Total Application Cost (Est.)",
        levels: {
            CRITICAL: "CRITICAL",
            HIGH: "HIGH",
            MEDIUM: "MEDIUM",
            LOW: "LOW"
        }
    },
    te: {
        title: "వరి ఆరోగ్యం మరియు తెగులు నివేదిక",
        date: "తేదీ",
        field: "పొలం",
        risk_score: "ప్రమాద స్థాయి",
        dominant_disease: "ప్రధాన తెగులు",
        severity: "తీవ్రత",
        status: "స్థితి",
        where_problem: "సమస్య ఎక్కడ ఉంది? (మ్యాప్)",
        what_to_do: "ఇప్పుడు ఏమి చేయాలి? (సూచనలు)",
        action: "చేయవలసిన పని",
        treatment: "చికిత్స",
        dosage: "మోతాదు",
        spray_window: "పిచికారీ చేయడానికి ఉత్తమ సమయం",
        why_suggestion: "ఈ సూచన ఎందుకు?",
        safety_note: "భద్రతా గమనిక",
        analyzed_view: "AI దృష్టి: విశ్లేషించబడిన చిత్రం",
        cost_breakdown: "ఖర్చు అంచనా వివరాలు",
        medicine: "సిఫార్సు చేయబడిన మందు",
        total_cost: "మొత్తం ఖర్చు (అంచనా)",
        levels: {
            CRITICAL: "అత్యంత ప్రమాదకరం",
            HIGH: "ప్రమాదకరం",
            MEDIUM: "మధ్యస్థం",
            LOW: "తక్కువ"
        }
    }
};

class ReportEngine {
    constructor() {
        this.reportsDir = path.join(__dirname, '../uploads/reports');
        if (!fs.existsSync(this.reportsDir)) {
            fs.mkdirSync(this.reportsDir, { recursive: true });
        }
    }

    /**
     * Generate a PDF Report
     */
    async generatePDF(data, lang = 'en') {
        const t = translations[lang] || translations.en;
        const reportId = `report_${Date.now()}`;
        const filePath = path.join(this.reportsDir, `${reportId}.pdf`);

        return new Promise((resolve, reject) => {
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const stream = fs.createWriteStream(filePath);

            doc.pipe(stream);

            // --- Header ---
            this.drawHeader(doc, t, data);

            // --- Risk Summary ---
            this.drawRiskSection(doc, t, data);

            // --- Analyzed Image (New) ---
            this.drawAnalyzedImageSection(doc, t, data);

            // --- Map Section (Simulated Grid) ---
            this.drawMapSection(doc, t, data);

            // --- Recommendation Section ---
            this.drawRecommendationSection(doc, t, data);

            // --- Cost Estimation (New) ---
            this.drawCostSection(doc, t, data);

            // --- Why & Safety ---
            this.drawFooter(doc, t, data);

            doc.end();

            stream.on('finish', () => resolve({ reportId, filePath }));
            stream.on('error', reject);
        });
    }

    drawHeader(doc, t, data) {
        doc.fillColor('#2d3436').fontSize(24).text(t.title, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#636e72').text(`${t.date}: ${new Date().toLocaleDateString()} | ${t.field}: ${data.field_name || 'My Farm'}`, { align: 'center' });
        doc.moveDown(1.5);
        doc.path('M 50 ' + doc.y + ' L 545 ' + doc.y).stroke('#dfe6e9');
        doc.moveDown(1.5);
    }

    drawRiskSection(doc, t, data) {
        const riskLevel = data.risk_level || 'LOW';
        const score = data.risk_score || 0;
        const colors = { CRITICAL: '#d63031', HIGH: '#e17055', MEDIUM: '#fdcb6e', LOW: '#00b894' };

        doc.fontSize(18).fillColor('#2d3436').text(`${t.risk_score}: `, { continued: true });
        doc.fillColor(colors[riskLevel]).text(`${score}/100 (${t.levels[riskLevel]})`);
        doc.moveDown(0.5);
        doc.fontSize(14).fillColor('#2d3436').text(`${t.dominant_disease}: ${data.dominant_disease || 'None Detected'}`);
        doc.moveDown(1.5);
    }

    /**
     * Fix paths that might be from a different folder name (e.g. 'agriculture new' vs 'agriculture new (1)')
     */
    fixImagePath(p) {
        if (!p) return null;
        if (fs.existsSync(p)) return p;

        // Try resolving relative to current root
        const filename = path.basename(p);
        const localPath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(localPath)) return localPath;

        const uploadsPath = path.join(__dirname, '../uploads/reports', filename);
        if (fs.existsSync(uploadsPath)) return uploadsPath;

        return null; // Still not found
    }

    drawAnalyzedImageSection(doc, t, data) {
        const imagePath = this.fixImagePath(data.annotated_image);
        if (!imagePath) return;

        doc.fontSize(16).fillColor('#2d3436').text(t.analyzed_view);
        doc.moveDown(0.5);

        try {
            doc.image(imagePath, {
                fit: [500, 250],
                align: 'center'
            });
            doc.moveDown(10); // Provide enough space after image
        } catch (err) {
            console.error("PDF Image Error:", err);
        }

        doc.moveDown(1);
    }

    drawMapSection(doc, t, data) {
        doc.fontSize(16).fillColor('#2d3436').text(t.where_problem);
        doc.moveDown(1);

        const startX = 50;
        const startY = doc.y;
        const cellSize = 15;
        const rows = 10;
        const cols = 32;

        doc.rect(startX, startY, cols * cellSize, rows * cellSize).fill('#f1f2f6');
        const infectedTiles = data.infected_tiles || [[1, 2], [1, 3], [5, 5], [10, 8], [11, 8], [12, 1]];
        doc.fillColor('#ff7675');
        infectedTiles.forEach(tile => {
            doc.rect(startX + tile[0] * cellSize, startY + tile[1] * cellSize, cellSize, cellSize).fill();
        });

        doc.strokeColor('#ced4da').lineWidth(0.5);
        for (let i = 0; i <= cols; i++) doc.moveTo(startX + i * cellSize, startY).lineTo(startX + i * cellSize, startY + rows * cellSize).stroke();
        for (let i = 0; i <= rows; i++) doc.moveTo(startX, startY + i * cellSize).lineTo(startX + cols * cellSize, startY + i * cellSize).stroke();

        doc.y = startY + (rows * cellSize) + 30;
    }

    drawRecommendationSection(doc, t, data) {
        const rec = data.recommendation || {};
        doc.fontSize(16).fillColor('#2d3436').text(t.what_to_do);
        doc.moveDown(0.5);

        doc.fontSize(12).fillColor('#2d3436');
        doc.text(`• ${t.action}: ${rec.action || 'Monitoring'}`);
        doc.text(`• ${t.treatment}: ${rec.treatment?.product_name || 'Tricyclazole 75% WP'}`);
        doc.text(`• ${t.dosage}: ${rec.treatment?.dosage_per_acre || '120g in 200L water'}`);
        doc.text(`• ${t.spray_window}: ${rec.best_spray_window?.[0]?.time || '06:00 AM - 09:00 AM'}`);

        doc.moveDown(1.5);
    }

    drawCostSection(doc, t, data) {
        doc.fontSize(16).fillColor('#2d3436').text(t.cost_breakdown);
        doc.moveDown(0.5);

        // Fallback demo data if real cost info is missing
        const cost = data.cost_data || {
            medicine_name: "Tricyclazole (Beam/Amistar)",
            medicine_cost: 1550,
            equipment_cost: 350,
            application_cost: 450,
            total_min: 2350,
            total_max: 2800
        };

        const startX = 60;

        doc.fontSize(11).fillColor('#636e72');
        doc.text(`${t.medicine}:`, startX, doc.y);
        doc.fillColor('#2d3436').text(`${cost.medicine_name}`, startX + 180, doc.y - 13);
        doc.moveDown(0.3);

        doc.fillColor('#636e72').text("Estimated Medicine Cost:", startX, doc.y);
        doc.fillColor('#2d3436').text(`₹${cost.medicine_cost}`, startX + 180, doc.y - 13);
        doc.moveDown(0.3);

        doc.fillColor('#636e72').text("Labor & Machinery:", startX, doc.y);
        doc.fillColor('#2d3436').text(`₹${(cost.equipment_cost || 0) + (cost.application_cost || 0)}`, startX + 180, doc.y - 13);
        doc.moveDown(0.8);

        doc.fontSize(14).fillColor('#2d3436').text(`${t.total_cost}: `, { continued: true });
        doc.fillColor('#d63031').text(`₹${cost.total_min} - ₹${cost.total_max}`);

        doc.moveDown(1.5);
    }

    drawFooter(doc, t, data) {
        doc.fontSize(14).fillColor('#2d3436').text(t.why_suggestion);
        (data.explainability || []).slice(0, 3).forEach(reason => {
            doc.fontSize(11).fillColor('#636e72').text(`- ${reason}`);
        });

        doc.moveDown(1.5);
        doc.fontSize(12).fillColor('#d63031').text(`${t.safety_note}: ${data.recommendation?.constraints_analysis || "Avoid spraying in high wind (>15km/h) or upcoming rain."}`);
    }

    /**
     * Create WhatsApp-friendly image cards using Sharp
     */
    async generateWhatsAppCards(data, lang = 'en') {
        const t = translations[lang] || translations.en;
        const cardId = `card_${Date.now()}`;
        const portraitId = `portrait_${Date.now()}`;
        const squarePath = path.join(this.reportsDir, `${cardId}.png`);
        const portraitPath = path.join(this.reportsDir, `${portraitId}.png`);

        const score = data.risk_score || 0;
        const riskColor = score > 70 ? '#d63031' : (score > 40 ? '#e17055' : '#00b894');

        // --- Square Card (1080x1080) ---
        const squareSvg = `
        <svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
            <rect width="100%" height="200" fill="${riskColor}"/>
            <text x="50%" y="120" font-family="Arial" font-size="60" fill="white" text-anchor="middle" font-weight="bold">${t.title.replace(/&/g, '&amp;')}</text>
            <text x="50%" y="350" font-family="Arial" font-size="120" fill="${riskColor}" text-anchor="middle" font-weight="bold">${score}</text>
            <text x="50%" y="420" font-family="Arial" font-size="40" fill="#636e72" text-anchor="middle">${t.risk_score}</text>
            <text x="50%" y="1000" font-family="Arial" font-size="30" fill="#b2bec3" text-anchor="middle">Generated by PaddyPulse AI • ${new Date().toLocaleDateString()}</text>
        </svg>`;

        // --- Portrait Story (1080x1920) ---
        const portraitSvg = `
        <svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f1f2f6"/>
            <rect width="100%" height="400" fill="${riskColor}"/>
            <text x="50%" y="220" font-family="Arial" font-size="80" fill="white" text-anchor="middle" font-weight="bold">${t.title.replace(/&/g, '&amp;')}</text>
            
            <circle cx="540" cy="700" r="200" fill="white" />
            <text x="540" y="740" font-family="Arial" font-size="160" fill="${riskColor}" text-anchor="middle" font-weight="bold">${score}</text>
            
            <rect x="100" y="1000" width="880" height="600" rx="30" fill="white" />
            <text x="540" y="1100" font-family="Arial" font-size="60" fill="#2d3436" text-anchor="middle" font-weight="bold">${t.what_to_do}</text>
            <text x="150" y="1250" font-family="Arial" font-size="45" fill="#636e72">${t.action}: ${data.recommendation?.action || 'N/A'}</text>
            <text x="150" y="1350" font-family="Arial" font-size="45" fill="#636e72">${t.treatment}: ${data.recommendation?.treatment?.product_name || 'N/A'}</text>

            <text x="50%" y="1850" font-family="Arial" font-size="35" fill="#b2bec3" text-anchor="middle">PaddyPulse AI Early Warning System</text>
        </svg>`;

        await sharp(Buffer.from(squareSvg)).png().toFile(squarePath);
        await sharp(Buffer.from(portraitSvg)).png().toFile(portraitPath);

        return { cardId, portraitId, squarePath, portraitPath, cardId: cardId }; // Fix mapping
    }

    /**
     * Complete Workflow Service
     * Gathering data -> Generating Files -> Saving to DB
     */
    async generateFullReportStack(farmId, lang = 'en') {
        const db = require('../database');

        return new Promise((resolve, reject) => {
            const sql = `
                SELECT r.*, f.farmer_name as field_name 
                FROM disease_risk_assessments r
                JOIN farms f ON r.user_id = f.user_id -- Adjusted join
                WHERE f.farm_id = ? 
                ORDER BY r.timestamp DESC LIMIT 1
            `;

            db.get(sql, [farmId], async (err, riskData) => {
                if (err || !riskData) return reject(new Error("No data found"));

                const reportData = {
                    field_name: riskData.field_name,
                    risk_score: riskData.overall_risk_score,
                    risk_level: riskData.overall_risk_score > 75 ? 'CRITICAL' : (riskData.overall_risk_score > 50 ? 'HIGH' : 'MEDIUM'),
                    dominant_disease: 'Blast', // In a real system, compute from scan detections
                    recommendation: JSON.parse(riskData.recommendation_json || '{}'),
                    explainability: [
                        "Environmental suitability for fungi is high",
                        "Neighboring zones report infection spread",
                        "Daily risk trend is accelerating"
                    ]
                };

                const pdf = await this.generatePDF(reportData, lang);
                const card = await this.generateWhatsAppCards(reportData, lang);

                const title = lang === 'te' ? 'వరి చిత్ర నివేదిక' : 'Paddy Health Report';
                db.run(
                    "INSERT INTO reports (farm_id, title, file_path, card_path, status) VALUES (?, ?, ?, ?, ?)",
                    [farmId, title, pdf.reportId, card.cardId, 'Ready'],
                    function (err) {
                        if (err) reject(err);
                        else resolve({ reportId: this.lastID, pdf, card });
                    }
                );
            });
        });
    }
}

module.exports = new ReportEngine();
