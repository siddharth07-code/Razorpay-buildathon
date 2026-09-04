"""
VIREON — Supervised Recovery Model Training Pipeline
===================================================
Trains a Logistic Regression model to predict P(successful recovery)
based on financial telemetry, customer history, and failure characteristics.

Output:
- Model artifact: ml/artifacts/recoverability_model.joblib
- Schema & metadata: ml/artifacts/model_metadata.json
"""

import json
import os
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

DATASET_PATH = "ml/data/recovery_training.csv"
MODEL_OUTPUT_PATH = "ml/artifacts/recoverability_model.joblib"
METADATA_OUTPUT_PATH = "ml/artifacts/model_metadata.json"

NUMERICAL_FEATURES = [
    "amount_at_risk",
    "customer_ltv",
    "retry_count",
    "days_overdue",
    "previous_successful_payments",
    "previous_recovery_attempts",
    "customer_tenure_days",
]

CATEGORICAL_FEATURES = [
    "failure_type",
    "payment_method",
]

TARGET = "recovered"


def train_model():
    print("=" * 60)
    print("VIREON REVENUE RECOVERY — SUPERVISED ML TRAINING PIPELINE")
    print("=" * 60)

    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(f"Training dataset not found at {DATASET_PATH}. Run ml/generate_data.py first.")

    df = pd.read_csv(DATASET_PATH)
    print(f"Loaded dataset: {DATASET_PATH}")
    print(f"Total samples: {len(df)}")
    print(f"Recovered class balance: {df[TARGET].value_counts().to_dict()} (Recovery Rate: {df[TARGET].mean():.2%})")

    # Features and Target
    X = df[NUMERICAL_FEATURES + CATEGORICAL_FEATURES]
    y = df[TARGET]

    # Train / Test split with fixed random seed
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    print(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}")

    # Preprocessing Pipeline
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )

    # Full Pipeline with LogisticRegression
    model = Pipeline(
        steps=[
            ("preprocessor", preprocessor),
            ("classifier", LogisticRegression(max_iter=1000, random_state=42, C=1.0)),
        ]
    )

    print("\nTraining LogisticRegression pipeline...")
    model.fit(X_train, y_train)

    # Evaluation on Test Set
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, zero_division=0)
    rec = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_proba)

    print("\n" + "-" * 40)
    print("ACTUAL EVALUATION METRICS (Test Set)")
    print("-" * 40)
    print(f"Accuracy:   {acc:.4f} ({acc * 100:.2f}%)")
    print(f"Precision:  {prec:.4f}")
    print(f"Recall:     {rec:.4f}")
    print(f"F1 Score:   {f1:.4f}")
    print(f"ROC-AUC:    {roc_auc:.4f}")
    print("-" * 40)
    print("Note: Metrics derived from synthetic demonstration dataset.")

    # Save artifacts
    os.makedirs(os.path.dirname(MODEL_OUTPUT_PATH), exist_ok=True)
    joblib.dump(model, MODEL_OUTPUT_PATH)
    print(f"\nModel pipeline saved to: {MODEL_OUTPUT_PATH}")

    metadata = {
        "modelName": "VIREON Recovery Model",
        "modelVersion": "v1",
        "algorithm": "LogisticRegression",
        "features": {
            "numerical": NUMERICAL_FEATURES,
            "categorical": CATEGORICAL_FEATURES,
            "totalFeatureCount": len(NUMERICAL_FEATURES) + len(CATEGORICAL_FEATURES),
        },
        "dataset": {
            "path": DATASET_PATH,
            "totalSamples": len(df),
            "trainSamples": len(X_train),
            "testSamples": len(X_test),
            "isSyntheticDemonstration": True,
        },
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1": round(float(f1), 4),
            "rocAuc": round(float(roc_auc), 4),
        },
    }

    with open(METADATA_OUTPUT_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Model metadata saved to: {METADATA_OUTPUT_PATH}")

    # Test sample inference
    sample = pd.DataFrame([
        {
            "amount_at_risk": 67500,
            "customer_ltv": 420000,
            "failure_type": "AUTHENTICATION_FAILURE",
            "retry_count": 1,
            "days_overdue": 0,
            "previous_successful_payments": 14,
            "previous_recovery_attempts": 1,
            "payment_method": "CARD",
            "customer_tenure_days": 480,
        }
    ])
    sample_proba = float(model.predict_proba(sample)[0, 1])
    sample_score = round(sample_proba * 100, 1)
    print(f"\nVerification Sample Inference (REC-DEMO-005 profile):")
    print(f"Recovery Probability: {sample_proba:.3f}")
    print(f"Recoverability Score: {sample_score}/100")
    print("=" * 60)

    return model, metadata


if __name__ == "__main__":
    train_model()
