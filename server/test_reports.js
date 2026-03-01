const reportEngine = require('./engine/report_engine');
const path = require('path');
const fs = require('fs');

async function testReportGeneration() {
    console.log("🧪 Starting Report Generation Test...");

    const mockData = {
        field_name: "Guntur East Field",
        risk_score: 82,
        risk_level: "HIGH",
        dominant_disease: "Paddy Blast",
        infected_tiles: [[2, 1], [2, 2], [3, 1], [4, 5], [5, 5]],
        recommendation: {
            action: "Apply Fungicide Immediately",
            treatment: {
                product_name: "Azoxystrobin (Amistar)",
                dosage_per_acre: "200ml in 200L water"
            },
            best_spray_window: [
                { time: "Tomorrow 06:00 - 09:00 AM", condition: "Low wind" }
            ],
            constraints_analysis: "High heat predicted after 11 AM; avoid midday spray."
        },
        explainability: [
            "Humidity > 90% in last 48 hours",
            "Zone A-12 shows rapid spore expansion",
            "Leaf pigment analysis confirms blast lesions"
        ],
        annotated_image: path.join(__dirname, 'uploads/reports/test_image.jpg'), // Mock path
        cost_data: {
            medicine_name: "Azoxystrobin (Amistar)",
            medicine_cost: 1550,
            equipment_cost: 350,
            application_cost: 450,
            total_min: 2350,
            total_max: 2800
        }
    };

    try {
        console.log("- Generating PDF (English)...");
        const pdfResult = await reportEngine.generatePDF(mockData, 'en');
        console.log(`✅ PDF Created: ${pdfResult.filePath}`);

        console.log("- Generating PDF (Telugu)...");
        const pdfTeResult = await reportEngine.generatePDF(mockData, 'te');
        console.log(`✅ Telugu PDF Created: ${pdfTeResult.filePath}`);

        console.log("- Generating WhatsApp Card (English)...");
        const cardResult = await reportEngine.generateWhatsAppCards(mockData, 'en');
        console.log(`✅ Card Created: ${cardResult.filePath}`);

        console.log("\n🎊 ALL RENDERING TESTS PASSED.");
    } catch (err) {
        console.error("❌ Test Failed:", err);
    }
}

testReportGeneration();
