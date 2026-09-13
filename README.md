MOIL AI Mining Intelligence Platform 🚀
An Edge-Computing, Offline-First Command Center for Manganese Prospectivity & Production Forecasting

💎 Executive Overview
In the remote, disconnected depths of modern mining pits, cloud-dependent AI is entirely useless. When communication lines drop, operations need local intelligence that survives offline.

The MOIL AI Mining Intelligence Platform is a full-stack, enterprise-grade edge computing solution engineered specifically for raw field deployment. It fuses high-performance Machine Learning with a deterministic 100-Point Operational Risk Engine, transforming raw geological and telemetry inputs into instant, actionable field directives—all running locally on a standard machine without an active internet handshake.

#🛠️ System Architecture & Technology Stack
Built with a high-performance, decoupled local-first architecture designed for zero latency and absolute data sovereignty:

Frontend (Command Center): Next.js (React), Tailwind CSS, and interactive dynamic Leaflet mapping for real-time field visualization.

Backend & API Engine: FastAPI (Python asynchronous web framework) serving lightning-fast local API endpoints (127.0.0.1:8000).

Machine Learning Core: Scikit-Learn, XGBoost, and Random Forest compiled into ultra-lightweight .joblib artifacts for millisecond-level local inference.

Database Infrastructure: Local MongoDB instance (port 27017) for persistent, offline storage of field verification checklists and operational audit logs.

#🔥 Core Modules & Features
1. Module 01: Location Prospectivity Predictor (XGBoost)
The Needle in a Haystack Challenge: Mineral exploration is heavily imbalanced—barren land drastically outnumbers productive deposits.

The Solution: Powered by an XGBoost Classifier utilizing dynamic class weighting (scale_pos_weight) to sequentially learn complex, non-linear geological patterns.

Execution: Takes 10 spatial parameters (Elevation, Slope, NDVI, LST, Rainfall, Soil Moisture, Lithology) via precise map clicks or manual entry, outputting a precise Manganese probability percentage paired with a HIGH, MEDIUM, or LOW risk tier.

2. Module 02: Expected Production & Risk Analysis (Random Forest)
The Operational Chaos Challenge: Real-world mining production fluctuates wildly due to weather anomalies, sudden equipment failures, and blasting delays.

The Solution: Powered by a Random Forest Regressor using bagging (parallel tree averaging) to filter out daily noise and deliver rock-solid monthly tonnage forecasts.

Execution: Evaluates operational metrics against target output to calculate forecasted shortfalls and triggers a 100-Point Deterministic Risk Engine across 6 distinct categories, generating automated, prioritized corrective actions (e.g., “Schedule immediate preventative maintenance” or “Activate sump dewatering pumps”).

3. Module 03: Field Verification & Audit Checklist
Persistent local tracking system allowing field geologists to log, review, and synchronize daily safety and resource verification audits directly to the offline MongoDB database.

⚙️ Local Installation & Quick Start
To run this complete intelligence platform locally on your machine, follow these steps:

1. Clone the Repository
Bash


git clone https://github.com/realstunner/Moil-minning-project-.git
cd moil-ai-mining
2. Start the Local Database
Ensure MongoDB is running locally on your system:

Bash


mongod --dbpath="C:\data\db"
3. Setup and Run the Backend
Open a terminal in the project root, then configure and launch the FastAPI server:

Bash


python -m venv .venv
# On Windows PowerShell:
.\.venv\Scripts\activate
# Install requirements:
pip install fastapi uvicorn pandas numpy scikit-learn xgboost joblib pydantic pymongo geopandas
# Start backend server:
python -m uvicorn backend.main:app --reload --port 8000
4. Setup and Run the Frontend
Open a second terminal, navigate to the project root, and launch the Next.js command center:

Bash


npm install
npm run dev
Open http://localhost:3000 in your browser to access the live platform command center.
