import os
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

DATA_PATH = os.path.join(
    BASE_DIR,
    "data",
    "moil_synthetic_production_dataset_large.csv"
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "backend",
    "models"
)

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "production_prediction_model.joblib"
)


# ============================================================
# LOAD DATASET
# ============================================================

print("\nLoading historical production dataset...")

df = pd.read_csv(DATA_PATH)

print(f"Dataset loaded: {len(df)} rows")

print("\nColumns:")
print(df.columns.tolist())


# ============================================================
# CHECK MISSING VALUES
# ============================================================

print("\nChecking missing values...")

missing_values = df.isnull().sum()

print(
    missing_values[
        missing_values > 0
    ]
)


# ============================================================
# DATE FEATURES
# ============================================================

df["month"] = pd.to_datetime(
    df["month"]
)

df["month_number"] = (
    df["month"].dt.month
)

df["year"] = (
    df["month"].dt.year
)


# ============================================================
# SORT CHRONOLOGICALLY
# ============================================================

df = df.sort_values(
    "month"
).reset_index(drop=True)


# ============================================================
# TARGET
# ============================================================

target = "actual_production"


# ============================================================
# FEATURES
# ============================================================

numerical_features = [

    "target_production",

    "equipment_available",

    "equipment_utilization",

    "downtime_hours",

    "rainfall",

    "temperature",

    "soil_moisture",

    "blast_count",

    "blast_delay",

    "mn_grade",

    "ore_thickness",

    "ore_depth",

    "month_number",

    "year"
]


categorical_features = [

    "mine_location",

    "lithology"
]


features = (
    numerical_features
    + categorical_features
)


X = df[features]

y = df[target]


# ============================================================
# CHRONOLOGICAL TRAIN / TEST SPLIT
# ============================================================

split_index = int(
    len(df) * 0.80
)


X_train = X.iloc[
    :split_index
]

X_test = X.iloc[
    split_index:
]


y_train = y.iloc[
    :split_index
]

y_test = y.iloc[
    split_index:
]


print("\nTraining period:")

print(
    df["month"].iloc[0],
    "to",
    df["month"].iloc[
        split_index - 1
    ].strftime("%Y-%m")
)


print("\nTesting period:")

print(
    df["month"].iloc[
        split_index
    ].strftime("%Y-%m"),
    "to",
    df["month"].iloc[
        -1
    ].strftime("%Y-%m")
)


print(
    "\nTraining samples:",
    len(X_train)
)

print(
    "Testing samples:",
    len(X_test)
)


# ============================================================
# PREPROCESSING
# ============================================================

preprocessor = ColumnTransformer(

    transformers=[

        (
            "categorical",

            OneHotEncoder(
                handle_unknown="ignore"
            ),

            categorical_features
        )

    ],

    remainder="passthrough"
)


# ============================================================
# RANDOM FOREST MODEL
# ============================================================

print(
    "\nTraining Expected Production ML model..."
)


random_forest = RandomForestRegressor(

    n_estimators=400,

    max_depth=14,

    min_samples_split=4,

    min_samples_leaf=2,

    random_state=42,

    n_jobs=-1
)


# ============================================================
# COMPLETE ML PIPELINE
# ============================================================

model = Pipeline(

    steps=[

        (
            "preprocessor",
            preprocessor
        ),

        (
            "regressor",
            random_forest
        )

    ]
)


# ============================================================
# TRAIN
# ============================================================

model.fit(

    X_train,

    y_train
)


# ============================================================
# PREDICTION
# ============================================================

predictions = model.predict(
    X_test
)


# ============================================================
# MODEL EVALUATION
# ============================================================

mae = mean_absolute_error(
    y_test,
    predictions
)


rmse = mean_squared_error(
    y_test,
    predictions
) ** 0.5


r2 = r2_score(
    y_test,
    predictions
)


print(
    "\n===================================="
)

print(
    "EXPECTED PRODUCTION MODEL RESULTS"
)

print(
    "===================================="
)


print(
    f"MAE: {mae:,.2f} tonnes"
)


print(
    f"RMSE: {rmse:,.2f} tonnes"
)


print(
    f"R² Score: {r2:.4f}"
)


# ============================================================
# ACTUAL VS PREDICTED
# ============================================================

results = pd.DataFrame({

    "Actual Production":
        y_test.values,

    "Predicted Production":
        predictions

})


results["Difference"] = (

    results["Actual Production"]

    -

    results["Predicted Production"]

)


print(
    "\n===================================="
)

print(
    "ACTUAL VS PREDICTED PRODUCTION"
)

print(
    "===================================="
)


print(
    results
    .head(10)
    .round(2)
    .to_string(index=False)
)


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

print(
    "\n===================================="
)

print(
    "FEATURE IMPORTANCE"
)

print(
    "===================================="
)


# Get transformed feature names
feature_names = (
    model
    .named_steps[
        "preprocessor"
    ]
    .get_feature_names_out()
)


# Get Random Forest importance
feature_importances = (
    model
    .named_steps[
        "regressor"
    ]
    .feature_importances_
)


importance = pd.DataFrame({

    "Feature":
        feature_names,

    "Importance":
        feature_importances

})


importance = importance.sort_values(

    by="Importance",

    ascending=False

)


print(
    importance
    .head(25)
    .to_string(index=False)
)


# ============================================================
# SAVE MODEL
# ============================================================

os.makedirs(

    MODEL_DIR,

    exist_ok=True

)


joblib.dump(

    model,

    MODEL_PATH

)


print(
    "\n===================================="
)

print(
    "MODEL SAVED"
)

print(
    "===================================="
)


print(
    MODEL_PATH
)


# ============================================================
# EXAMPLE FUTURE PRODUCTION PREDICTION
# ============================================================

print(
    "\n===================================="
)

print(
    "EXAMPLE FUTURE PRODUCTION PREDICTION"
)

print(
    "===================================="
)


example_data = pd.DataFrame([{

    "target_production":
        100000,

    "equipment_available":
        12,

    "equipment_utilization":
        75,

    "downtime_hours":
        40,

    "rainfall":
        30,

    "temperature":
        27,

    "soil_moisture":
        0.55,

    "blast_count":
        25,

    "blast_delay":
        4,

    "mn_grade":
        32,

    "ore_thickness":
        4.5,

    "ore_depth":
        28,

    "month_number":
        8,

    "year":
        2025,

    "mine_location":
        "MOIL-Mine-01",

    "lithology":
        "Manganese-bearing"

}])


expected_production = model.predict(

    example_data

)[0]


print(

    f"Expected Production: "
    f"{expected_production:,.2f} tonnes"

)


# ============================================================
# SHORTFALL
# ============================================================

monthly_target = 100000


shortfall = max(

    monthly_target
    -
    expected_production,

    0

)


if monthly_target > 0:

    shortfall_percent = (

        shortfall
        /
        monthly_target

    ) * 100

else:

    shortfall_percent = 0


print(

    f"Monthly Target: "
    f"{monthly_target:,.0f} tonnes"

)


print(

    f"Expected Production: "
    f"{expected_production:,.2f} tonnes"

)


print(

    f"Expected Shortfall: "
    f"{shortfall:,.2f} tonnes"

)


print(

    f"Shortfall Percentage: "
    f"{shortfall_percent:.2f}%"

)


print(
    "\nProduction prediction model completed successfully."
)