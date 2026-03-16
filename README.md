# 🌾 Paddy Pulse
### **Advanced AI-Driven Rice Cultivation Platform**

> Paddy Pulse is a comprehensive, state-of-the-art agricultural monitoring platform designed exclusively for rice (paddy) cultivation. By integrating **Drone Technology**, **AI Object Detection (YOLOv8)**, and **IoT Sensors**, it provides farmers and administrators with actionable insights to detect diseases early, monitor field health in real-time, and optimize crop yields.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React%2FVite-61dafb?style=flat-square&logo=react)](https://react.dev/)
[![Python](https://img.shields.io/badge/Language-Python%203.10+-3776AB?style=flat-square&logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2FSQLite-336791?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![YOLOv8](https://img.shields.io/badge/AI-YOLOv8-FF6F00?style=flat-square)](https://ultralytics.com/)

---

## 🚀 Key Features

| Feature | Description |
|---|---|
| 🤖 **AI Disease Detection** | 97.4% accuracy YOLOv8 model — detects Blast, Brown Spot, etc. |
| 📡 **IoT Sensor Integration** | Real-time Soil Moisture, NPK, Humidity & Temperature monitoring |
| 🚁 **Drone & Mobile Analysis** | Upload mobile photos or run simulated drone surveys |
| 🌍 **Bilingual Support** | Full English & Telugu language support via i18next |
| 📊 **Precision Dashboard** | GSAP-animated UI with historical disease tracking |
| 🏥 **Treatment Action Plans** | Medicine marketplace & cost estimation tools |
| 🔒 **JWT Authentication** | Secure role-based access (Farmer / Admin) |
| 📈 **Geospatial Heatmaps** | Visual disease spread mapping across farm regions |

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph CLIENT["🖥️ Client Layer"]
        PWA["📱 Mobile PWA<br/>(React/Vite)"]
        ADMIN["🖥️ Admin Dashboard<br/>(React)"]
        API_TOOL["🔧 API Testing Tools"]
    end

    subgraph API["⚡ API Layer — FastAPI :3000"]
        CORS["🛡️ CORS Middleware<br/>(allow_origins)"]
        JWT_MW["🔑 JWT Auth Middleware<br/>(HTTPBearer)"]
        ROUTES["🗺️ Routes & Controllers<br/>(14 API modules)"]
        SERVICES["⚙️ Services Layer<br/>(billing, cron, operator)"]
        MODELS["🗄️ Models / DB Helpers<br/>(db_get · db_all · db_run)"]
    end

    subgraph DB["💾 Data Layer"]
        PG["🐘 PostgreSQL 15<br/>(Supabase Cloud)"]
        SQLITE["📁 SQLite<br/>(Local Dev)"]
    end

    subgraph ML["🤖 ML Engine"]
        YOLO["🧠 YOLOv8<br/>Disease Detector"]
        TRAIN["📚 train_yolo.py"]
        PREDICT["🔍 predict_yolo.py"]
    end

    PWA --> CORS
    ADMIN --> CORS
    API_TOOL --> CORS
    CORS --> JWT_MW
    JWT_MW --> ROUTES
    ROUTES --> SERVICES
    ROUTES --> MODELS
    SERVICES --> MODELS
    MODELS --> PG
    MODELS --> SQLITE
    ROUTES --> YOLO
    TRAIN --> YOLO
    YOLO --> PREDICT
```

---

## 🔐 Authentication Workflow

```mermaid
sequenceDiagram
    actor User as 👤 User (Browser)
    participant FE as ⚛️ Frontend (React)
    participant API as ⚡ FastAPI Backend
    participant MW as 🔑 JWT Middleware
    participant DB as 🗄️ Database

    rect rgb(220, 240, 255)
        Note over User,DB: ── REGISTRATION FLOW ──
        User->>FE: Fill Signup form<br/>(username, password, role, farm info)
        FE->>API: POST /auth/register
        API->>DB: Check if username exists
        DB-->>API: Result
        API->>DB: INSERT user (bcrypt hashed password)
        API->>DB: INSERT default farm record
        DB-->>API: userId, orgId
        API-->>FE: 201 { message, userId, orgId }
        FE-->>User: ✅ Redirect to Login
    end

    rect rgb(220, 255, 220)
        Note over User,DB: ── LOGIN FLOW ──
        User->>FE: Enter username + password + role
        FE->>API: POST /auth/login
        API->>DB: SELECT user WHERE username = ?
        DB-->>API: User record (with password_hash)
        API->>API: bcrypt.verify(password, hash)
        alt ✅ Credentials Valid
            API->>API: jwt.encode({ id, username,<br/>role, org_id, exp: +24h })
            API-->>FE: 200 { token, user }
            FE->>FE: localStorage.setItem("token", ...)
            FE-->>User: ✅ Redirect to Dashboard
        else ❌ Invalid Credentials
            API-->>FE: 400 { error: "Invalid credentials" }
            FE-->>User: ❌ Show error message
        else ❌ Wrong Role
            API-->>FE: 401 { error: "User is not an admin" }
            FE-->>User: ❌ Access denied
        end
    end

    rect rgb(255, 245, 220)
        Note over User,DB: ── PROTECTED REQUEST FLOW ──
        User->>FE: Access protected feature
        FE->>API: Any request + Authorization: Bearer {token}
        API->>MW: Intercept request
        MW->>MW: jwt.decode(token, SECRET_KEY)
        alt ✅ Token Valid
            MW->>API: Attach user to request.state
            API->>DB: Execute query with user context
            DB-->>API: Data
            API-->>FE: 200 Response data
            FE-->>User: ✅ Render content
        else ❌ Token Invalid / Expired
            MW-->>FE: 401 Unauthorized
            FE-->>User: 🔒 Redirect to Login
        end
    end

    rect rgb(255, 235, 235)
        Note over User,DB: ── PROFILE UPDATE FLOW ──
        User->>FE: Edit profile (name, phone, farm size)
        FE->>API: PUT /auth/update-profile { userId, ... }
        API->>DB: UPDATE users SET full_name, phone
        API->>DB: UPDATE farms SET farmer_name, location, field_size
        DB-->>API: { changes: 1 }
        API-->>FE: 200 { message: "Profile updated successfully" }
        FE-->>User: ✅ Profile saved
    end
```

---

## 📂 Project Structure

```
Paddy-Pulse/
├── 📄 README.md
├── 📄 .env                        # Root environment variables
├── 📄 .env.example                # Template for env setup
├── 📄 requirements.txt            # Python top-level requirements
├── 🖥️ start_backend.bat           # Windows: start FastAPI server
├── 🖥️ start_frontend.bat          # Windows: start Vite dev server
│
├── 📁 client/                     # ── FRONTEND ──
│   ├── 📄 vite.config.js
│   └── src/
│       ├── 📄 main.jsx            # App entry point
│       ├── 📄 App.jsx             # Router & route definitions
│       ├── 📄 i18n.js             # i18next config (EN / TE)
│       ├── 📁 api/
│       │   └── config.js          # Axios base URL config
│       ├── 📁 pages/
│       │   ├── Login.jsx          # Login page (Farmer & Admin)
│       │   └── Signup.jsx         # Registration page
│       └── 📁 components/
│           ├── Home.jsx                     # Landing / hero page
│           ├── Dashboard.jsx                # Main farmer dashboard
│           ├── FarmersDashboard.jsx         # Farmer overview cards
│           ├── AdminDashboard.jsx           # Admin overview panel
│           ├── AdminDroneAnalysis.jsx       # Drone image analysis
│           ├── AdminDroneReportControl.jsx  # Drone report mgmt (CRUD)
│           ├── AdminOrders.jsx              # Order management
│           ├── AdminReportGenerator.jsx     # PDF report generator
│           ├── AdminSettings.jsx            # Platform settings
│           ├── ImageUpload.jsx              # AI disease scan upload
│           ├── ActionPlan.jsx               # Treatment recommendations
│           ├── AgriChatbot.jsx              # In-app AI chatbot
│           ├── CostEstimation.jsx           # Farm cost calculator
│           ├── DiseaseHeatmap.jsx           # Geo disease heatmap
│           ├── DiseaseHistory.jsx           # Historical scan records
│           ├── EditProfileModal.jsx         # Profile edit modal
│           ├── IntegratedAgroModule.jsx     # Combined agro module
│           ├── IoTSensors.jsx               # Live IoT sensor readings
│           ├── KnowledgeBase.jsx            # Agri knowledge articles
│           ├── LanguageSelector.jsx         # EN / TE switcher
│           ├── MedicineMarketplace.jsx      # Medicine shop
│           ├── PrecisionDashboard.jsx       # Precision farming view
│           ├── PredictiveAlerts.jsx         # Weather/risk alerts
│           ├── Reports.jsx                  # Reports listing
│           ├── SeverityForecast.jsx         # Disease severity chart
│           └── SplitText.jsx               # Animated text component
│
└── 📁 server/                     # ── BACKEND ──
    ├── 📄 main.py                 # FastAPI app entry point
    ├── 📄 database.py             # DB abstraction (SQLite + PostgreSQL)
    ├── 📄 database_migrations.py  # Schema migrations
    ├── 📄 setup_db.py             # Initial DB setup & seeding
    ├── 📄 .env                    # Server-side environment vars
    ├── 📄 requirements.txt        # Python dependencies
    │
    ├── 📁 routes/                 # API route handlers
    │   ├── auth.py                # /auth — Register, Login, Profile
    │   ├── admin.py               # /admin — User & farm management
    │   ├── drone.py               # /drone — Drone analysis & surveys
    │   ├── farm.py                # /farm — Farm CRUD operations
    │   ├── prediction.py          # /predict — AI disease prediction
    │   ├── reports.py             # /reports — PDF report generation
    │   ├── cost.py                # /cost — Cost estimation
    │   ├── heatmap.py             # /heatmap — Geo heatmap data
    │   ├── iot.py                 # /iot — IoT sensor readings
    │   ├── geospatial.py          # /geo — Geospatial queries
    │   ├── precision.py           # /precision — Precision farming
    │   ├── orders.py              # /orders — Marketplace orders
    │   ├── business.py            # /biz — Business analytics
    │   └── operators.py          # /ops — Operator management
    │
    ├── 📁 middleware/
    │   └── auth.py                # JWT Bearer token validator
    │
    ├── 📁 services/
    │   ├── billing_service.py     # Subscription billing logic
    │   ├── cron_service.py        # Scheduled background tasks
    │   └── operator_service.py   # Drone operator assignments
    │
    ├── 📁 ml_engine/              # AI / Machine Learning
    │   ├── predict.py             # Legacy prediction pipeline
    │   ├── predict_yolo.py        # YOLOv8 inference engine
    │   ├── train_model.py         # Model training script
    │   ├── train_yolo.py          # YOLOv8 fine-tuning script
    │   └── validate_image.py      # Image pre-validation
    │
    └── 📁 uploads/                # Stored scan images (gitignored)
```

---

## 🔑 API Endpoints Reference

### Auth Routes — `/auth`

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/auth/register` | Register a new farmer + create default farm | ❌ Public |
| `POST` | `/auth/login` | Login and receive JWT token (24h expiry) | ❌ Public |
| `PUT` | `/auth/update-profile` | Update user name, phone, farm details | ✅ Required |

### Core Feature Routes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/predict/analyze` | Run YOLOv8 disease detection on image |
| `GET` | `/farm/{user_id}` | Get farm details for a user |
| `GET` | `/iot/readings/{farm_id}` | Live IoT sensor data |
| `GET` | `/heatmap/data` | Disease heatmap coordinates |
| `GET` | `/reports/generate` | Generate PDF farm health report |
| `GET` | `/cost/estimate` | Farm cost breakdown |
| `GET` | `/precision/data` | Precision farming metrics |
| `GET` | `/geo/fields` | Geospatial field boundaries |
| `GET` | `/orders` | Marketplace orders list |
| `GET` | `/biz/analytics` | Business/revenue analytics |
| `GET` | `/ops/operators` | Drone operator assignments |

### Admin Routes — `/admin`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/farmers` | List all registered farmers |
| `PUT` | `/admin/farmers/{user_id}` | Edit farmer account details |
| `DELETE` | `/admin/farmers/{user_id}` | Delete a farmer account |
| `GET` | `/drone/surveys` | All drone survey reports |

---

## ⚙️ Local Development Setup

### Prerequisites
- **Node.js** v18+
- **Python** 3.10+
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/paddy-pulse.git
cd paddy-pulse
```

### 2. Backend Setup (FastAPI)
```bash
cd server

# Create & activate virtual environment
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Start the server (port 3000)
python main.py
```
> Backend runs at: **http://localhost:3000**

### 3. Frontend Setup (React / Vite)
```bash
cd client
npm install
npm run dev
```
> Frontend runs at: **http://localhost:5173**

### 4. Quick Start (Windows)
```bash
# In separate terminals:
start_backend.bat
start_frontend.bat
```

---

## 🔧 Environment Variables

### Root `.env`
```env
DATABASE_URL=postgresql://user:pass@host:5432/db   # Leave blank for SQLite
JWT_SECRET=your_super_secret_key
```

### `server/.env`
```env
DATABASE_URL=postgresql://...    # Supabase PostgreSQL connection string
JWT_SECRET=paddy_secret_key
PORT=3000
```

> **Note:** When `DATABASE_URL` is **not set**, the backend automatically falls back to the local **SQLite** database (`server/agriculture.db`).

---

## 🤖 ML Engine — YOLOv8

```mermaid
graph LR
    A["📷 Input Image"] --> B["validate_image.py<br/>Format & Size Check"]
    B --> C["predict_yolo.py<br/>YOLOv8 Inference"]
    C --> D["Bounding Boxes<br/>+ Confidence Scores"]
    D --> E["Disease Labels<br/>(Blast, Brown Spot...)"]
    E --> F["📊 JSON Response<br/>+ Annotated Image"]
```

| File | Purpose |
|------|---------|
| `validate_image.py` | Pre-validates image format, size, and quality |
| `predict_yolo.py` | Runs YOLOv8 ONNX inference, returns detections |
| `predict.py` | Legacy CNN prediction fallback |
| `train_yolo.py` | Fine-tunes YOLOv8 on paddy disease dataset |
| `train_model.py` | Full training pipeline with augmentation |

---

## 🗄️ Database Architecture

```mermaid
erDiagram
    organizations {
        int id PK
        string name
        string slug
        int plan_id
    }
    users {
        int id PK
        string username
        string password_hash
        string role
        string full_name
        string email
        string phone
        string gender
        int org_id FK
    }
    farms {
        int farm_id PK
        int user_id FK
        string farmer_name
        string location
        string soil_type
        float field_size
        string current_crop
        int org_id FK
    }
    analyses {
        int analysis_id PK
        int farm_id FK
        string disease_detected
        float confidence
        string image_path
        datetime created_at
    }
    iot_readings {
        int reading_id PK
        int farm_id FK
        float soil_moisture
        float temperature
        float humidity
        float npk_n
        float npk_p
        float npk_k
        datetime recorded_at
    }

    organizations ||--o{ users : "has"
    users ||--o{ farms : "owns"
    farms ||--o{ analyses : "has"
    farms ||--o{ iot_readings : "monitors"
```

---

## 🌍 Frontend Pages & Components

### Pages (Route-level)

| File | Route | Description |
|------|-------|-------------|
| `Login.jsx` | `/login` | Role-based login (Farmer / Admin) with animated UI |
| `Signup.jsx` | `/signup` | Multi-step farmer registration form |

### Core Components

| Component | Description |
|-----------|-------------|
| `Home.jsx` | Landing page with hero section and feature cards |
| `Dashboard.jsx` | Main farmer dashboard — scan history, alerts, quick actions |
| `FarmersDashboard.jsx` | Farmer profile overview with farm statistics |
| `AdminDashboard.jsx` | Admin overview — user counts, scan metrics, alerts |
| `AdminDroneAnalysis.jsx` | Review and annotate drone survey images |
| `AdminDroneReportControl.jsx` | Full CRUD for drone reports (edit/delete farmers too) |
| `AdminOrders.jsx` | Manage marketplace orders from farmers |
| `AdminReportGenerator.jsx` | Auto-generate PDF reports for any farm |
| `AdminSettings.jsx` | Platform-level settings (plans, orgs, operators) |
| `ImageUpload.jsx` | Drag-and-drop AI disease scan with live results |
| `ActionPlan.jsx` | Treatment plan cards with medicine recommendations |
| `AgriChatbot.jsx` | AI chatbot for farming Q&A (in-app assistant) |
| `CostEstimation.jsx` | Calculates spray, labor & medicine cost per acre |
| `DiseaseHeatmap.jsx` | Interactive geo-map showing disease spread |
| `DiseaseHistory.jsx` | Timeline of past disease detections |
| `EditProfileModal.jsx` | Modal to edit user profile and farm details |
| `IoTSensors.jsx` | Live cards showing sensor readings with status |
| `KnowledgeBase.jsx` | Articles and guides on paddy disease management |
| `LanguageSelector.jsx` | Toggle between English 🇬🇧 and Telugu 🇮🇳 |
| `MedicineMarketplace.jsx` | Browse & order farming medicines/pesticides |
| `PrecisionDashboard.jsx` | Precision Agriculture — zone-wise insights |
| `PredictiveAlerts.jsx` | Weather-based early warning alerts |
| `Reports.jsx` | List and download generated farm reports |
| `SeverityForecast.jsx` | Chart forecasting disease severity over time |
| `SplitText.jsx` | Animated text reveal component (GSAP) |
| `IntegratedAgroModule.jsx` | Combined module wrapper for agro features |

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React.js (Vite) | Component-based UI framework |
| Tailwind CSS | Utility-first styling |
| GSAP + Framer Motion | Smooth animations & transitions |
| i18next | English / Telugu internationalization |
| React Router v6 | Client-side routing |
| Axios | HTTP client for API calls |

### Backend
| Technology | Purpose |
|-----------|---------|
| Python FastAPI | High-performance async REST API |
| Uvicorn | ASGI server |
| Ultralytics YOLOv8 | Disease detection ML model |
| PyJWT | JWT token generation & validation |
| Passlib (bcrypt) | Secure password hashing |
| Psycopg3 | PostgreSQL async driver |
| SQLite3 | Local development database |
| APScheduler | Cron-based background tasks |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Supabase | Managed PostgreSQL cloud database |
| Vercel | Frontend deployment |
| Railway / Render | Backend cloud deployment |

---

## ☁️ Deployment

### Frontend → Vercel
```bash
cd client
npm run build
# Deploy dist/ folder to Vercel
```

### Backend → Railway / Render
```bash
# Set environment variables on the platform:
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3000

# Start command:
uvicorn main:app --host 0.0.0.0 --port $PORT
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License**.

---

<div align="center">

*🌾 Innovating Rice Cultivation through Intelligence 🌾*

**Paddy Pulse** — Empowering Farmers with AI

</div>
