from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import os
import joblib
import sys
from pymongo import MongoClient

# ============================================================
# APP
# ============================================================

app = FastAPI(
    title="MOIL AI Mining Intelligence API",
    description=(
        "AI/ML based manganese prospectivity, "
        "production prediction, risk analysis and "
        "recommendation engine"
    ),
    version="3.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# OFFLINE MONGODB DATABASE SETUP
# ============================================================

try:
    mongo_client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    db = mongo_client["moil_mining"]
    checklist_collection = db["field_verification"]
    print("Connected to local offline MongoDB.")
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    checklist_collection = None

class ChecklistRecord(BaseModel):
    id: str
    mode: str
    location_display: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    ml_prob: float
    ml_tier: str
    has_minerals: bool
    manual_tier: str

@app.get("/api/checklist")
def get_checklist():
    if checklist_collection is None: return []
    records = list(checklist_collection.find({}, {"_id": 0}))
    return records[::-1]  # Return newest first

@app.post("/api/checklist")
def save_record(record: ChecklistRecord):
    if checklist_collection is not None:
        checklist_collection.insert_one(record.dict())
    return {"status": "success"}

@app.put("/api/checklist/{record_id}")
def update_record(record_id: str, field_data: dict):
    if checklist_collection is not None:
        checklist_collection.update_one({"id": record_id}, {"$set": field_data})
    return {"status": "success"}

@app.delete("/api/checklist/{record_id}")
def delete_record(record_id: str):
    if checklist_collection is not None:
        checklist_collection.delete_one({"id": record_id})
    return {"status": "success"}
# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

# Add backend to Python path so we can import data_pipeline easily
sys.path.append(os.path.join(BASE_DIR, "backend"))

PREDICTION_FILE = os.path.join(
    BASE_DIR,
    "data",
    "prospectivity_predictions.csv"
)

PRODUCTION_MODEL_PATH = os.path.join(
    BASE_DIR,
    "backend",
    "models",
    "production_prediction_model.joblib"
)

PROSPECTIVITY_MODEL_PATH = os.path.join(
    BASE_DIR,
    "backend",
    "models",
    "prospectivity_model.joblib"
)


# ============================================================
# LOAD PROSPECTIVITY DATA (STATIC CSV)
# ============================================================

try:
    prospectivity_df = pd.read_csv(
        PREDICTION_FILE
    )

    print(
        f"Loaded {len(prospectivity_df)} "
        "prospectivity records."
    )

except Exception as error:

    prospectivity_df = None

    print(
        f"Warning: Could not load prospectivity "
        f"data: {error}"
    )


# ============================================================
# LOAD ML MODELS
# ============================================================

try:
    production_model = joblib.load(
        PRODUCTION_MODEL_PATH
    )
    print(
        "Production prediction model "
        "loaded successfully."
    )
except Exception as error:
    production_model = None
    print(
        f"Warning: Could not load production "
        f"model: {error}"
    )

try:
    prospectivity_model = joblib.load(
        PROSPECTIVITY_MODEL_PATH
    )
    print(
        "Prospectivity prediction model "
        "loaded successfully."
    )
except Exception as error:
    prospectivity_model = None
    print(
        f"Warning: Could not load prospectivity "
        f"model: {error}"
    )


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "MOIL AI Mining API is running",
        "status": "online",
        "modules": [
            "Manganese Prospectivity",
            "Expected Production Prediction",
            "Production Risk Analysis",
            "Cause Detection",
            "Recommendation Engine",
            "Interactive Discovery Mode"
        ]
    }


# ============================================================
# PROSPECTIVITY SUMMARY
# ============================================================

@app.get("/api/prospectivity/summary")
def prospectivity_summary():

    if prospectivity_df is None:

        raise HTTPException(
            status_code=500,
            detail="Prospectivity dataset is not available."
        )

    total = len(prospectivity_df)

    high = int(
        (
            prospectivity_df["prospectivity"]
            == "HIGH"
        ).sum()
    )

    medium = int(
        (
            prospectivity_df["prospectivity"]
            == "MEDIUM"
        ).sum()
    )

    low = int(
        (
            prospectivity_df["prospectivity"]
            == "LOW"
        ).sum()
    )

    return {
        "total_locations": total,
        "high": high,
        "medium": medium,
        "low": low
    }


# ============================================================
# PROSPECTIVITY MAP
# ============================================================

@app.get("/api/prospectivity")
def get_prospectivity():

    if prospectivity_df is None:

        raise HTTPException(
            status_code=500,
            detail="Prospectivity dataset is not available."
        )

    columns = [
        "latitude",
        "longitude",
        "mn_probability",
        "prospectivity"
    ]

    result = prospectivity_df[
        columns
    ].copy()

    result = result.dropna(
        subset=[
            "latitude",
            "longitude"
        ]
    )

    records = result.to_dict(
        orient="records"
    )

    return {
        "count": len(records),
        "locations": records
    }


# ============================================================
# HIGH POTENTIAL LOCATIONS
# ============================================================

@app.get("/api/prospectivity/high")
def get_high_potential():

    if prospectivity_df is None:

        raise HTTPException(
            status_code=500,
            detail="Prospectivity dataset is not available."
        )

    high_df = prospectivity_df[
        prospectivity_df["prospectivity"] == "HIGH"
    ].copy()

    high_df = high_df.sort_values(
        "mn_probability",
        ascending=False
    )

    columns = [
        "latitude",
        "longitude",
        "mn_probability",
        "prospectivity"
    ]

    return {
        "count": len(high_df),
        "locations": high_df[
            columns
        ].to_dict(
            orient="records"
        )
    }


# ============================================================
# LIVE PROSPECTIVITY INPUT SCHEMA
# ============================================================

class ProspectivityInput(BaseModel):
    mode: str  # "ONLINE" or "OFFLINE"
    
    # Online Mode Inputs
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_km: Optional[float] = None
    
    # Offline Mode Inputs (Geological Parameters)
    elevation_m: Optional[float] = None
    slope_deg: Optional[float] = None
    ndvi: Optional[float] = None
    lst_celsius: Optional[float] = None
    rainfall_annual_mm: Optional[float] = None
    soil_moisture: Optional[float] = None
    clay_iron_ratio: Optional[float] = None
    ferrous_iron_index: Optional[float] = None
    dist_to_fault_km: Optional[float] = None
    standardized_lithology: Optional[str] = None


# ============================================================
# LIVE LOCATION PREDICTION (ONLINE / OFFLINE MODE)
# ============================================================

@app.post("/api/predict-location")
def predict_location(data: ProspectivityInput):

    if prospectivity_model is None:
        raise HTTPException(
            status_code=500, 
            detail="Live prospectivity model is not available on the server."
        )

    # 1. Gather Features based on Mode
    if data.mode == "ONLINE":
        if data.latitude is None or data.longitude is None:
            raise HTTPException(
                status_code=400, 
                detail="Latitude and longitude are required for ONLINE mode."
            )
        try:
          # FIX: Temporarily add the data_pipeline folder to the system path 
            # so Python can successfully find and import config.py
            import sys
            pipeline_path = os.path.join(BASE_DIR, "backend", "data_pipeline")
            if pipeline_path not in sys.path:
                sys.path.append(pipeline_path)
                
            from data_pipeline.data_acquisition import get_all_features
            features = get_all_features(data.latitude, data.longitude)
        except Exception as e:
            print(f"Extraction Error: {e}") # Prints to your backend terminal
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to extract features for coordinate: {e}"
            )
    else:
        # Offline Mode: Use exact user inputs
        # FIX: We MUST include dummy lat/long here so the ML model doesn't crash 
        # when trying to map the input to the training dataset columns.
        features = {
            "latitude": data.latitude if data.latitude is not None else 0.0,
            "longitude": data.longitude if data.longitude is not None else 0.0,
            "elevation_m": data.elevation_m,
            "slope_deg": data.slope_deg,
            "ndvi": data.ndvi,
            "lst_celsius": data.lst_celsius,
            "rainfall_annual_mm": data.rainfall_annual_mm,
            "soil_moisture": data.soil_moisture,
            "clay_iron_ratio": data.clay_iron_ratio,
            "ferrous_iron_index": data.ferrous_iron_index,
            "dist_to_fault_km": data.dist_to_fault_km,
            "standardized_lithology": data.standardized_lithology
        }

    # 2. Run Prediction
    try:
        df_input = pd.DataFrame([features])
        
        # Check if the model is a classifier that supports predict_proba
        if hasattr(prospectivity_model, "predict_proba"):
            probability =float(prospectivity_model.predict_proba(df_input)[0][1])
        else:
            # Fallback if saved as standard regressor
            prediction = prospectivity_model.predict(df_input)[0]
            probability = float(prediction)

        if probability >= 0.70:
            tier = "HIGH"
        elif probability >= 0.40:
            tier = "MEDIUM"
        else:
            tier = "LOW"

        return {
            "mode_used": data.mode,
            "mn_probability_percent": round(probability * 100, 2),
            "tier": tier,
            "features_extracted": features
        }

    except Exception as e:
        print(f"CRITICAL ML ERROR: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"ML Prediction failed: {e}"
        )


# ============================================================
# MINING INTELLIGENCE INPUT SCHEMA (MODULE 2)
# ============================================================

class MiningIntelligenceInput(BaseModel):
    mine_location: str    # <--- ADD THIS LINE
    target_production: float

    equipment_available: float
    equipment_utilization: float
    downtime_hours: float

    rainfall: float
    temperature: float
    soil_moisture: float

    blast_count: float
    blast_delay: float

    mn_grade: float
    ore_thickness: float
    ore_depth: float
    lithology: str

    working_hours: float


# ============================================================
# LITHOLOGY ENCODING
# ============================================================

def encode_lithology(lithology: str):

    lithology_mapping = {

        "manganese-bearing": 3,
        "metamorphic": 2,
        "laterite": 1,
        "banded formation": 2,
        "sedimentary": 0,
        "igneous": 0,
        "schist": 2,
        "quartzite": 2
    }

    return lithology_mapping.get(
        lithology.strip().lower(),
        2
    )


# ============================================================
# ML PRODUCTION PREDICTION
# ============================================================

def predict_expected_production(
    data: MiningIntelligenceInput
):

    if production_model is None:

        raise HTTPException(
            status_code=500,
            detail=(
                "Production prediction model "
                "is not available."
            )
        )

    current_date = pd.Timestamp.now()


    # FIX: Ensure absolutely NO raw strings are sent to the XGBoost model.
    # We must use encode_lithology() for the rock type, and drop the text-based mine_location.
    model_input = pd.DataFrame([{
        "target_production": data.target_production,
        "equipment_available": data.equipment_available,
        "equipment_utilization": data.equipment_utilization,
        "downtime_hours": data.downtime_hours,
        "rainfall": data.rainfall,
        "temperature": data.temperature,
        "soil_moisture": data.soil_moisture,
        "blast_count": data.blast_count,
        "blast_delay": data.blast_delay,
        "mn_grade": data.mn_grade,
        "ore_thickness": data.ore_thickness,
        "ore_depth": data.ore_depth,
        "mine_location": "MOIL-Mine-01",  # RESTORED
        "mine_location": data.mine_location,  # <--- USE DYNAMIC INPUT HERE  
        "lithology": data.lithology,      # RESTORED (Pass raw string!)
        "month_number": current_date.month,
        "year": current_date.year
    }])

    try:

        prediction = production_model.predict(
            model_input
        )[0]

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                "Production prediction failed: "
                f"{error}"
            )
        )

    return max(
        float(prediction),
        0
    )


# ============================================================
# COMPLETE MINING INTELLIGENCE ENGINE (MODULE 2 + 3)
# ============================================================

@app.post("/api/mining-intelligence")
def mining_intelligence(
    data: MiningIntelligenceInput
):

    # ========================================================
    # MODULE 1 — PROSPECTIVITY
    # ========================================================

    if prospectivity_df is None:

        raise HTTPException(
            status_code=500,
            detail="Prospectivity dataset is not available."
        )

    total_locations = len(
        prospectivity_df
    )

    high_locations = int(
        (
            prospectivity_df["prospectivity"]
            == "HIGH"
        ).sum()
    )

    medium_locations = int(
        (
            prospectivity_df["prospectivity"]
            == "MEDIUM"
        ).sum()
    )

    low_locations = int(
        (
            prospectivity_df["prospectivity"]
            == "LOW"
        ).sum()
    )

    high_percentage = (
        high_locations / total_locations * 100
        if total_locations > 0
        else 0
    )


    # ========================================================
    # MODULE 2 — EXPECTED PRODUCTION
    # ========================================================

    expected_production = (
        predict_expected_production(data)
    )

    target = float(
        data.target_production
    )


    # ========================================================
    # SHORTFALL
    # ========================================================

    shortfall = max(
        target - expected_production,
        0
    )

    if target > 0:

        shortfall_percent = (
            shortfall / target
        ) * 100

    else:

        shortfall_percent = 0


    # ========================================================
    # MODULE 3 — RISK & CAUSE ENGINE
    # ========================================================

    risk_score = 0

    risk_categories = []

    equipment_risk = 0
    weather_risk = 0
    blasting_risk = 0
    geology_risk = 0
    production_risk = 0
    operations_risk = 0


    # ========================================================
    # A. PRODUCTION SHORTFALL RISK
    # ========================================================

    if shortfall_percent >= 30:

        production_risk = 35

    elif shortfall_percent >= 25:

        production_risk = 30

    elif shortfall_percent >= 15:

        production_risk = 20

    elif shortfall_percent >= 10:

        production_risk = 10


    if production_risk > 0:

        risk_categories.append({
            "category": "Production",
            "risk_score": production_risk
        })

        risk_score += production_risk


    # ========================================================
    # B. EQUIPMENT RISK
    # ========================================================

    if data.downtime_hours >= 30:

        equipment_risk += 15

    elif data.downtime_hours >= 20:

        equipment_risk += 10

    elif data.downtime_hours >= 10:

        equipment_risk += 5


    if data.equipment_utilization < 60:

        equipment_risk += 10

    elif data.equipment_utilization < 75:

        equipment_risk += 5


    equipment_risk = min(
        equipment_risk,
        20
    )


    if equipment_risk > 0:

        risk_categories.append({
            "category": "Equipment",
            "risk_score": equipment_risk
        })

        risk_score += equipment_risk


    # ========================================================
    # C. WEATHER / ENVIRONMENTAL RISK
    # ========================================================

    if data.rainfall >= 150:

        weather_risk += 10

    elif data.rainfall >= 75:

        weather_risk += 7

    elif data.rainfall >= 25:

        weather_risk += 3


    if data.soil_moisture >= 0.70:

        weather_risk += 5

    elif data.soil_moisture >= 0.50:

        weather_risk += 3


    weather_risk = min(
        weather_risk,
        15
    )


    if weather_risk > 0:

        risk_categories.append({
            "category": "Weather / Environmental",
            "risk_score": weather_risk
        })

        risk_score += weather_risk


    # ========================================================
    # D. BLASTING RISK
    # ========================================================

    if data.blast_delay >= 8:

        blasting_risk = 15

    elif data.blast_delay >= 4:

        blasting_risk = 8

    elif data.blast_delay >= 2:

        blasting_risk = 4


    blasting_risk = min(
        blasting_risk,
        15
    )


    if blasting_risk > 0:

        risk_categories.append({
            "category": "Blasting",
            "risk_score": blasting_risk
        })

        risk_score += blasting_risk


    # ========================================================
    # E. ORE / GEOLOGICAL RISK
    # ========================================================

    if data.mn_grade < 25:

        geology_risk += 10

    elif data.mn_grade < 30:

        geology_risk += 5


    if data.ore_thickness < 2:

        geology_risk += 8

    elif data.ore_thickness < 3:

        geology_risk += 4


    geology_risk = min(
        geology_risk,
        18
    )


    if geology_risk > 0:

        risk_categories.append({
            "category": "Ore / Geological",
            "risk_score": geology_risk
        })

        risk_score += geology_risk


    # ========================================================
    # F. OPERATIONS / WORKING HOURS RISK
    # ========================================================

    if data.working_hours < 8:

        operations_risk = 8

    elif data.working_hours < 12:

        operations_risk = 5

    elif data.working_hours < 16:

        operations_risk = 2


    if operations_risk > 0:

        risk_categories.append({
            "category": "Operations",
            "risk_score": operations_risk
        })

        risk_score += operations_risk


    # ========================================================
    # LIMIT TOTAL SCORE
    # ========================================================

    risk_score = min(
        risk_score,
        100
    )


    # ========================================================
    # RISK LEVEL
    # ========================================================

    if risk_score >= 70:

        risk_level = "HIGH"

    elif risk_score >= 40:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"


    # ========================================================
    # RECOMMENDATION ENGINE
    # ========================================================

    recommendation_items = []


    # ========================================================
    # PRODUCTION RECOMMENDATION
    # ========================================================

    if shortfall_percent >= 25:

        recommendation_items.append({
            "category": "Production",
            "priority": "HIGH",
            "cause": (
                "Expected production is significantly below "
                "the monthly target."
            ),
            "action": (
                "Prioritize high-output mining areas, "
                "increase productive equipment utilization "
                "and optimize the monthly mining schedule."
            )
        })

    elif shortfall_percent >= 10:

        recommendation_items.append({
            "category": "Production",
            "priority": "MEDIUM",
            "cause": (
                "Expected production is below the "
                "monthly target."
            ),
            "action": (
                "Review the mining schedule and improve "
                "production from high-potential areas."
            )
        })


    # ========================================================
    # EQUIPMENT RECOMMENDATION
    # ========================================================

    if equipment_risk >= 15:

        recommendation_items.append({
            "category": "Equipment",
            "priority": "HIGH",
            "cause": (
                "Equipment downtime or utilization is "
                "creating a significant production risk."
            ),
            "action": (
                "Prioritize maintenance, restore unavailable "
                "equipment and redeploy idle equipment "
                "to critical mining operations."
            )
        })

    elif equipment_risk > 0:

        recommendation_items.append({
            "category": "Equipment",
            "priority": "MEDIUM",
            "cause": (
                "Equipment performance is affecting "
                "production efficiency."
            ),
            "action": (
                "Schedule preventive maintenance and "
                "improve utilization of available equipment."
            )
        })


    # ========================================================
    # WEATHER RECOMMENDATION
    # ========================================================

    if weather_risk >= 10:

        recommendation_items.append({
            "category": "Weather / Environmental",
            "priority": "HIGH",
            "cause": (
                "Heavy rainfall or adverse ground conditions "
                "may disrupt mining operations."
            ),
            "action": (
                "Adjust the mining schedule, prepare "
                "alternative work areas and monitor haul "
                "roads and drainage conditions."
            )
        })

    elif weather_risk > 0:

        recommendation_items.append({
            "category": "Weather / Environmental",
            "priority": "MEDIUM",
            "cause": (
                "Weather conditions may moderately affect "
                "mining operations."
            ),
            "action": (
                "Monitor rainfall and ground conditions "
                "and prepare alternative work areas."
            )
        })


    # ========================================================
    # BLASTING RECOMMENDATION
    # ========================================================

    if blasting_risk >= 15:

        recommendation_items.append({
            "category": "Blasting",
            "priority": "HIGH",
            "cause": (
                "Significant blasting delays may reduce "
                "available production time."
            ),
            "action": (
                "Optimize blasting schedules and coordinate "
                "blasting activities closely with the "
                "production plan."
            )
        })

    elif blasting_risk > 0:

        recommendation_items.append({
            "category": "Blasting",
            "priority": "MEDIUM",
            "cause": (
                "Blasting operations are experiencing "
                "delays."
            ),
            "action": (
                "Coordinate blasting activities with the "
                "production schedule to reduce idle time."
            )
        })


    # ========================================================
    # GEOLOGY RECOMMENDATION
    # ========================================================

    if geology_risk >= 10:

        recommendation_items.append({
            "category": "Ore / Geological",
            "priority": "HIGH",
            "cause": (
                "Low manganese grade or limited ore "
                "thickness may reduce production potential."
            ),
            "action": (
                "Prioritize higher-grade and better-thickness "
                "ore zones and evaluate alternative mining areas."
            )
        })

    elif geology_risk > 0:

        recommendation_items.append({
            "category": "Ore / Geological",
            "priority": "MEDIUM",
            "cause": (
                "Ore characteristics may moderately affect "
                "production efficiency."
            ),
            "action": (
                "Evaluate ore zones for grade, thickness "
                "and continuity before scheduling extraction."
            )
        })


    # ========================================================
    # OPERATIONS RECOMMENDATION
    # ========================================================

    if operations_risk > 0:

        recommendation_items.append({
            "category": "Operations",
            "priority": "MEDIUM",
            "cause": (
                "Available working hours are limited."
            ),
            "action": (
                "Optimize shift planning and reduce "
                "avoidable operational delays."
            )
        })


    # ========================================================
    # SORT RECOMMENDATIONS
    # ========================================================

    priority_order = {
        "HIGH": 1,
        "MEDIUM": 2,
        "LOW": 3
    }

    recommendation_items.sort(
        key=lambda item:
        priority_order.get(
            item["priority"],
            99
        )
    )


    # ========================================================
    # CAUSES
    # ========================================================

    causes = [
        item["cause"]
        for item in recommendation_items
    ]


    # ========================================================
    # SIMPLE RECOMMENDATIONS
    # ========================================================

    recommendations = [
        item["action"]
        for item in recommendation_items
    ]


    # ========================================================
    # DEFAULT RESULT
    # ========================================================

    if not causes:

        causes = [
            "No major production risk detected from "
            "the supplied conditions."
        ]

    if not recommendations:

        recommendations = [
            "Continue monitoring production, equipment, "
            "weather and ore conditions."
        ]


    # ========================================================
    # OVERALL PRIORITY
    # ========================================================

    if risk_level == "HIGH":

        combined_status = "HIGH PRIORITY"

    elif risk_level == "MEDIUM":

        combined_status = "MODERATE PRIORITY"

    else:

        combined_status = "NORMAL"


    # ========================================================
    # RESPONSE
    # ========================================================

    return {

        "prospectivity": {

            "total_locations":
                total_locations,

            "high":
                high_locations,

            "medium":
                medium_locations,

            "low":
                low_locations,

            "high_percentage":
                round(
                    high_percentage,
                    2
                )
        },

        "production_prediction": {

            "target_production":
                round(
                    target,
                    2
                ),

            "expected_production":
                round(
                    expected_production,
                    2
                ),

            "shortfall":
                round(
                    shortfall,
                    2
                ),

            "shortfall_percent":
                round(
                    shortfall_percent,
                    2
                )
        },

        "production_risk": {

            "risk_score":
                risk_score,

            "risk_level":
                risk_level,

            "categories":
                risk_categories
        },

        "causes":
            causes,

        "recommendations":
            recommendations,

        "recommendation_details":
            recommendation_items,

        "combined_status":
            combined_status
    }