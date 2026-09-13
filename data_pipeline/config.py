"""
config.py
Configuration file for Multi-Country Manganese Prospectivity AI.
"""

import os
import ee

# ==========================================
# 1. DIRECTORY PATHS
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")

# Ensure required directories exist
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_SAVE_PATH = os.path.join(MODELS_DIR, "global_manganese_pipeline.pkl")
TRAINING_DATA_PATH = os.path.join(DATA_DIR, "multi_country_training_data.csv")

# ==========================================
# 2. GLOBAL STUDY REGIONS (Bounding Boxes)
# ==========================================
# [min_lon, min_lat, max_lon, max_lat]
REGIONS = {
    "INDIA_CENTRAL": {
        "bbox": [78.5, 21.0, 80.5, 22.2],
        "country": "India",
        "description": "Nagpur-Bhandara-Balaghat Manganese Belt"
    },
    "SOUTH_AFRICA_KALAHARI": {
        "bbox": [22.5, -27.8, 23.5, -26.8],
        "country": "South Africa",
        "description": "Kalahari Manganese Field (Hotazel/Kuruman)"
    },
    "AUSTRALIA_PILBARA": {
        "bbox": [118.0, -23.5, 122.0, -21.0],
        "country": "Australia",
        "description": "East Pilbara Manganese Province"
    },
    "GABON_MOANDA": {
        "bbox": [13.0, -1.8, 13.8, -1.2],
        "country": "Gabon",
        "description": "Moanda Manganese Plateau"
    },
    "BRAZIL_CARAJAS": {
        "bbox": [-50.8, -6.5, -49.8, -5.5],
        "country": "Brazil",
        "description": "Carajás / Azul Manganese Deposit"
    },
    "CHINA_GUIZHOU": {
    "bbox": [104.0, 25.0, 108.5, 29.5],
    "country": "China",
    "description": "Guizhou manganese region"
    },
    "CHINA_HUNAN": {
    "bbox": [109.0, 25.0, 113.0, 29.5],
    "country": "China",
    "description": "Hunan manganese region"
    }
}

# ==========================================
# 3. GLOBAL GOOGLE EARTH ENGINE DATASETS
# ==========================================
GEE_DATASETS = {
    # Elevation & Topography (Global 30m resolution)
    "DEM": "NASA/NASADEM_HGT/001",
    
    # Multispectral Imagery for NDVI & Mineral Indices
    "SENTINEL2": "COPERNICUS/S2_SR_HARMONIZED",
    
    # Global Land Surface Temperature (MODIS Daily / 1km)
    "LST": "MODIS/061/MOD11A1",
    
    # Global Precipitation (ERA5-Land / CHIRPS)
    "RAINFALL": "UCSB-CHG/CHIRPS/DAILY",
    
    # Global Soil Moisture
    "SOIL_MOISTURE": "NASA/FLDAS/NOAH01/C/GL/M/V001"
}

# Date window for satellite composites (filters cloud-free baseline)
DEFAULT_DATE_RANGE = ("2015-01-01", "2025-12-31")

# ==========================================
# 4. STANDARDIZED FEATURE SPECIFICATION
# ==========================================
# Numerical features extracted universally across all countries
NUMERICAL_FEATURES = [
    "elevation_m",
    "slope_deg",
    "ndvi",
    "lst_celsius",
    "rainfall_annual_mm",
    "soil_moisture",
    "clay_iron_ratio",      # Sentinel-2 B11 / B12 ratio (mineral indicator)
    "ferrous_iron_index",   # Sentinel-2 B12 / B8 ratio
    "dist_to_fault_km"
]

# Standardized lithology classes so different countries share the same vocabulary
STANDARDIZED_LITHOLOGY = [
    "Sedimentary_Mn_Carbonate",
    "Sedimentary_Mn_Oxide",
    "Banded_Iron_Formation",
    "Metamorphic_Schist",
    "Carbonate_Dolomite",
    "Volcanogenic_Sedimentary",
    "Laterite_Supergene_Cover",
    "Alluvium_Unconsolidated"
]

CATEGORICAL_FEATURES = ["standardized_lithology"]

# ==========================================
# 5. MODEL HYPERPARAMETERS
# ==========================================
MODEL_PARAMS = {
    "n_estimators": 400,
    "max_depth": 6,
    "learning_rate": 0.03,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "scale_pos_weight": 8.0,  # Balances rare positive occurrences against background
    "random_state": 42
}

# ==========================================
# 6. GEE AUTHENTICATION HELPER
# ==========================================
# Optional: Put your Google Cloud Project ID here if you have one, else leave None
GEE_PROJECT_ID = None 

def initialize_earth_engine():
    """Initializes Google Earth Engine with graceful fallback."""
    global GEE_AVAILABLE
    try:
        if GEE_PROJECT_ID:
            ee.Initialize(project=GEE_PROJECT_ID)
        else:
            ee.Initialize()
        print("✓ Google Earth Engine initialized successfully.")
        return True
    except Exception as e:
        print("! GEE Cloud Project not detected. Running in Offline / Fallback Extraction Mode.")
        return False
    