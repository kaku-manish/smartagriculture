const cron = require('node-cron');
const db = require('../database');
const reportEngine = require('../engine/report_engine');

/**
 * Automated Cron Service
 * Handles scheduled reporting (Daily & Weekly)
 */
class CronService {
    init() {
        console.log("🕒 Automated Reporting Service Initialized...");

        // 1. DAILY REPORT: Every day at 6:00 PM (18:00)
        // Format: 'minute hour day-of-month month day-of-week'
        cron.schedule('0 18 * * *', async () => {
            console.log("📅 [CRON] Triggering Daily Health Reports for all farmers...");
            this.generateBulkReports('daily');
        });

        // 2. WEEKLY SUMMARY: Every Sunday at 8:00 AM
        cron.schedule('0 8 * * 0', async () => {
            console.log("📅 [CRON] Triggering Weekly Summary Reports...");
            this.generateBulkReports('weekly');
        });

        // 3. CLEANUP: Every day at midnight (Clean files older than 30 days)
        cron.schedule('0 0 * * *', async () => {
            console.log("🧹 [CRON] Cleaning up old reports...");
            // Logic to delete files from filesystem could go here
        });
    }

    async generateBulkReports(type) {
        try {
            // Get all active farmers
            db.all("SELECT farm_id FROM farms", [], async (err, farmers) => {
                if (err) return console.error("Bulk report error:", err);

                for (const farmer of farmers) {
                    try {
                        console.log(`- Generating ${type} report for Farm #${farmer.farm_id}`);
                        // Default to Telugu for demo or use farmer preference if stored
                        await reportEngine.generateFullReportStack(farmer.farm_id, 'te');
                    } catch (e) {
                        // Skip if no data for today
                    }
                }
                console.log(`✅ Bulk ${type} reports completed.`);
            });
        } catch (err) {
            console.error("Critical error in bulk reporting:", err);
        }
    }
}

module.exports = new CronService();
