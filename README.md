# MOIL AI: Edge-Computing Mining Intelligence Platform

A completely offline, local-first machine learning command center built for Manganese Prospectivity and Production Forecasting in disconnected environments.*

## The Problem

Real-world mining pits often lack reliable cellular or internet connectivity, rendering cloud-based AI solutions entirely useless to on-ground geologists and pit managers. Companies like MOIL (Manganese Ore India Limited)—the largest producer of manganese ore in India, operating 11 underground and opencast mines—require robust operational intelligence that survives offline.

## The Architecture: Hybrid Edge Intelligence

This platform bridges complex Machine Learning with deterministic business logic, specifically designed to run natively on a standard laptop CPU in the middle of a disconnected mine site.

XGBoost Prospectivity Classifier:** Solves the "needle in a haystack" problem of mineral exploration. It uses sequential learning and dynamic class weighting (`scale_pos_weight`) to identify rare, non-linear geological deposit patterns from highly imbalanced spatial data.

Random Forest Production Regressor:** Filters out chaotic, daily operational noise (e.g., sudden weather, isolated equipment breakdowns). By averaging independent decision trees, it generates highly stable and reliable monthly production forecasts.

100-Point Deterministic Risk Engine:** Wraps the ML models in a diagnostic rule engine to instantly translate raw tonnage shortfalls into actionable, prioritized operational commands (e.g., "Schedule preventative maintenance").

Core Tech Stack

Frontend:** Next.js (React), TailwindCSS, Leaflet (Dynamic Spatial Mapping)
Backend:** FastAPI (Python), Uvicorn (Lightning-fast local API)
Machine Learning:** Scikit-Learn, XGBoost, GeoPandas, Joblib
Database:** MongoDB (Local instance for offline ground-truth data persistence)

---

## 🚀 Quickstart Installation

This project utilizes a decoupled edge architecture and requires two separate terminals to run.

### 1. Frontend Environment

Open your first terminal and start the Next.js interactive dashboard:


npm install
npm run dev



*The command center will instantly go live at `http://localhost:3000`.*

### 2. Backend Environment

Open a **new, completely separate terminal**, initialize the Python environment, and start the FastAPI inference server:


python -m venv .venv
.\.venv\Scripts\activate
pip install fastapi uvicorn pandas numpy scikit-learn xgboost joblib pydantic pymongo geopandas
python -m uvicorn backend.main:app --reload --port 8000



*The machine learning API will actively listen on `http://localhost:8000`.*

Database Note:** Ensure your local MongoDB Windows service is actively running on port `27017` to enable the offline Field Verification Checklist module.
