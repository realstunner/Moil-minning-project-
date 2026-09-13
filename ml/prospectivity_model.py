import os
import joblib
import pandas as pd
import numpy as np

from sklearn.compose import ColumnTransformer
from xgboost import XGBClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    roc_auc_score,
    average_precision_score
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


# ---------------------------------------------------------
# PATHS
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "multi_country_training_data_clean.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "backend",
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "prospectivity_model.joblib"
)


# ---------------------------------------------------------
# LOAD DATA
# ---------------------------------------------------------

print("\nLoading dataset...")

df = pd.read_csv(DATA_PATH)

print(f"Dataset loaded: {len(df)} rows")
print(f"Columns: {list(df.columns)}")


# ---------------------------------------------------------
# FEATURES
# ---------------------------------------------------------

features = [
    "elevation_m",
    "slope_deg",
    "ndvi",
    "lst_celsius",
    "rainfall_annual_mm",
    "soil_moisture",
    "clay_iron_ratio",
    "ferrous_iron_index",
    "dist_to_fault_km",
    "standardized_lithology",
]

target = "mn_present"

X = df[features]
y = df[target]


# ---------------------------------------------------------
# TRAIN / TEST SPLIT
# ---------------------------------------------------------

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)


# ---------------------------------------------------------
# COLUMN TYPES
# ---------------------------------------------------------

numeric_features = [
    "elevation_m",
    "slope_deg",
    "ndvi",
    "lst_celsius",
    "rainfall_annual_mm",
    "soil_moisture",
    "clay_iron_ratio",
    "ferrous_iron_index",
    "dist_to_fault_km",
]

categorical_features = [
    "standardized_lithology"
]


# ---------------------------------------------------------
# PREPROCESSING
# ---------------------------------------------------------

numeric_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="median")
        )
    ]
)

categorical_pipeline = Pipeline(
    steps=[
        (
            "imputer",
            SimpleImputer(strategy="most_frequent")
        ),
        (
            "onehot",
            OneHotEncoder(
                handle_unknown="ignore"
            )
        )
    ]
)

preprocessor = ColumnTransformer(
    transformers=[
        (
            "numeric",
            numeric_pipeline,
            numeric_features
        ),
        (
            "categorical",
            categorical_pipeline,
            categorical_features
        )
    ]
)


# ---------------------------------------------------------
# DYNAMIC CLASS IMBALANCE CALCULATION
# ---------------------------------------------------------

n_pos = int(y_train.sum())
n_neg = int(len(y_train) - n_pos)
calculated_weight = float(n_neg / max(1, n_pos))


# ---------------------------------------------------------
# XGBOOST CLASSIFIER MODEL
# ---------------------------------------------------------

model = XGBClassifier(
    n_estimators=400,
    max_depth=6,
    learning_rate=0.03,
    subsample=0.8,
    colsample_bytree=0.8,
    scale_pos_weight=calculated_weight,
    eval_metric=["logloss", "aucpr"],
    random_state=42,
    tree_method="hist"
)

pipeline = Pipeline(
    steps=[
        (
            "preprocessor",
            preprocessor
        ),
        (
            "model",
            model
        )
    ]
)


# ---------------------------------------------------------
# TRAIN
# ---------------------------------------------------------

print(f"\nTraining XGBoost model (scale_pos_weight: {calculated_weight:.2f})...")

pipeline.fit(
    X_train,
    y_train
)


# ---------------------------------------------------------
# EVALUATION (ACCURACY, ROC-AUC, PR-AUC)
# ---------------------------------------------------------

predictions = pipeline.predict(X_test)
probabilities = pipeline.predict_proba(X_test)[:, 1]

accuracy = accuracy_score(y_test, predictions)
roc_auc = roc_auc_score(y_test, probabilities)
pr_auc = average_precision_score(y_test, probabilities)

print("\n====================================")
print("MODEL EVALUATION METRICS")
print("====================================")
print(f"Accuracy    : {accuracy:.4f}")
print(f"ROC-AUC     : {roc_auc:.4f}")
print(f"PR-AUC      : {pr_auc:.4f}")

print("\nClassification Report:")
print(
    classification_report(
        y_test,
        predictions
    )
)


# ---------------------------------------------------------
# SAVE MODEL
# ---------------------------------------------------------

os.makedirs(
    MODEL_DIR,
    exist_ok=True
)

joblib.dump(
    pipeline,
    MODEL_PATH
)

print("\n====================================")
print("MODEL SAVED")
print("====================================")
print(MODEL_PATH)


# ---------------------------------------------------------
# GENERATE PROSPECTIVITY
# ---------------------------------------------------------

print("\nGenerating prospectivity predictions for all data points...")

all_probabilities = pipeline.predict_proba(X)[:, 1]
df["mn_probability"] = all_probabilities


# ---------------------------------------------------------
# CLASSIFY PROSPECTIVITY
# ---------------------------------------------------------

def classify_probability(probability):
    if probability >= 0.70:
        return "HIGH"
    elif probability >= 0.40:
        return "MEDIUM"
    else:
        return "LOW"


df["prospectivity"] = df["mn_probability"].apply(classify_probability)


# ---------------------------------------------------------
# SAVE PREDICTIONS
# ---------------------------------------------------------

prediction_path = os.path.join(
    BASE_DIR,
    "data",
    "prospectivity_predictions.csv"
)

df.to_csv(
    prediction_path,
    index=False
)

print("\n====================================")
print("PROSPECTIVITY GENERATED")
print("====================================")
print(f"Prediction file: {prediction_path}")

print("\nProspectivity distribution:")
print(df["prospectivity"].value_counts())

print("\nSample predictions:")
print(
    df[
        [
            "latitude",
            "longitude",
            "mn_probability",
            "prospectivity"
        ]
    ].head(10)
)

print("\nModule 1 XGBoost model completed successfully.")