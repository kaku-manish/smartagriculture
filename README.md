# Paddy Pulse 🌾
**Advanced AI-Driven Rice Cultivation Platform**

Paddy Pulse is a comprehensive, state-of-the-art agricultural monitoring platform designed exclusively for rice (paddy) cultivation. By integrating **Drone Technology**, **AI Object Detection**, and **IoT Sensors**, it provides farmers and administrators with actionable insights to detect diseases early, monitor field health in real-time, and optimize crop yields.

---

## 🚀 Key Features

*   **🤖 AI-Powered Disease Detection:** High accuracy (97.4%) YOLOv8 model trained specifically on paddy leaves. Capable of multi-disease detection (e.g., Blast, Brown Spot) with instant reporting.
*   **📡 IoT Sensor Integration:** Real-time monitoring of Soil Moisture, NPK levels, Humidity, and Temperature directly from the farmer's dashboard.
*   **🚁 Drone & Mobile Analysis:** Seamless integration for both uploaded mobile photos and simulated drone surveys.
*   **🌍 Bilingual Accessibility:** Full support for English and Telugu to assist regional farmers.
*   **📊 Comprehensive Dashboard:** Interactive GSAP-animated UI, historical disease tracking, and actionable treatment plans.

---

## 🛠️ Technology Stack

**Frontend:**
*   React.js (Vite)
*   Tailwind CSS
*   GSAP & Framer Motion (Animations)
*   i18next (Internationalization)

**Backend:**
*   Python (FastAPI) & Node.js
*   Ultralytics YOLOv8 (Machine Learning)
*   PostgreSQL (Supabase Cloud) & SQLite (Local)

---

## 📂 Project Structure

```text
Paddy-Pulse/
├── client/                 # Frontend React Application
│   ├── src/components/     # UI Components (Dashboard, IoT, AI Upload)
│   ├── src/locales/        # Translation files (En/Te)
├── server/                 # Fast & Robust Python Backend (FastAPI)
│   ├── ml_engine/          # Python AI scripts and YOLOv8 Weights
│   ├── routes/             # API Endpoints (Auth, Drone, Farm, Geo)
```

---

## ⚙️ Local Development Setup

### 1. Frontend (React/Vite)
```bash
cd client
npm install
npm run dev
```

### 2. Backend (Python/FastAPI)
Ensure you have Python 3.10+ installed.
```bash
cd server
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python main.py
```

---

## ☁️ Deployment
*   **Frontend:** Deployed and optimized for **Vercel**.
*   **Backend:** Configured for cloud deployments (Railway, Render, etc.) using `uvicorn`. Connects to Supabase PostgreSQL database.

---
*Innovating Rice Cultivation through Intelligence.*
