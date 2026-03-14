import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from database import db_all
from engine.report_engine import report_engine

logger = logging.getLogger("agro-backend")

class CronService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    def start(self):
        logger.info("🕒 Automated Reporting Service Initialized (APScheduler)...")
        
        # 1. DAILY REPORT: Every day at 6:00 PM (18:00)
        self.scheduler.add_job(
            self.generate_bulk_reports,
            CronTrigger(hour=18, minute=0),
            args=["daily"],
            id="daily_reports"
        )
        
        # 2. WEEKLY SUMMARY: Every Sunday at 8:00 AM
        self.scheduler.add_job(
            self.generate_bulk_reports,
            CronTrigger(day_of_week='sun', hour=8, minute=0),
            args=["weekly"],
            id="weekly_reports"
        )
        
        # 3. CLEANUP: Every day at midnight
        self.scheduler.add_job(
            self.cleanup_reports,
            CronTrigger(hour=0, minute=0),
            id="cleanup_reports"
        )
        
        self.scheduler.start()

    def stop(self):
        self.scheduler.shutdown()

    async def generate_bulk_reports(self, report_type):
        try:
            logger.info(f"📅 [CRON] Triggering {report_type.capitalize()} Health Reports for all farmers...")
            farmers = db_all("SELECT farm_id FROM farms")
            
            for f in farmers:
                try:
                    farm_id = f.get("farm_id")
                    logger.info(f"- Generating {report_type} report for Farm #{farm_id}")
                    await report_engine.generate_full_report_stack(farm_id, "te")
                except Exception as e:
                    logger.warning(f"Failed bulk report for {f}: {e}")
                    
            logger.info(f"✅ Bulk {report_type} reports completed.")
        except Exception as e:
            logger.error(f"Critical error in bulk reporting: {e}")

    async def cleanup_reports(self):
        logger.info("🧹 [CRON] Cleaning up old reports (placeholder)...")

cron_service = CronService()
