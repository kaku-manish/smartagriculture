# 📄 Automated Reporting Engine

This module provides automated, farmer-friendly health reports for the Paddy Disease Management platform. It supports professional PDF layouts and compact WhatsApp-friendly image cards in both **English** and **Telugu**.

## 🚀 Key Features
- **Bilingual Support**: Full translation for English and simple, farmer-friendly Telugu.
- **Multimodal Output**:
  - **A4 PDF**: Detailed report including risk breakdown, map grids, and treatment plans.
  - **WhatsApp Cards**: High-impact 1080x1080 images for quick sharing.
- **Explainable AI**: Includes a "Why this suggestion?" section with 3 core reasons.
- **Safe Spraying Intelligence**: Analyzes wind/heat/rain constraints to recommend optimal spray windows.
- **Automated Scheduling**:
  - **Daily Reports**: Every day at 6:00 PM.
  - **Weekly Summaries**: Every Sunday at 8:00 AM.

## 🛠️ Technical Stack
- **PDF Generation**: `pdfkit`
- **Image/Snapshot Rendering**: `sharp` (SVG-to-PNG transformation)
- **Scheduling**: `node-cron`
- **Storage**: Local filesystem (`/server/uploads/reports`) with API endpoints.

## 📡 API Reference

### 1. Generate Report
`POST /reports/generate`
```json
{
  "farm_id": 1,
  "language": "te"
}
```

### 2. Download Report
`GET /reports/download/:reportId` - Streams the PDF file.

### 3. Fetch Image Card
`GET /reports/cards/:cardId` - Serve the WhatsApp-friendly image.

## 🕒 Automation (Cron)
The `CronService` (found in `server/services/cron_service.js`) is initialized in `index.js`. It automatically scans all active farms and generates reports if data is available.

---
*Created by PaddyPulse Engine*
