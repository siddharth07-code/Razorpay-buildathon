"""
VIREON — Supervised ML Inference Service
========================================
FastAPI service exposing real-time prediction for recovery probability
and recoverability score using the trained Logistic Regression model.

Endpoints:
- POST /predict: Predict recovery probability and score
- GET /health: Health check and model metadata
- GET /metadata: Detailed model parameters and metrics
"""

import json
import os
import sys
from typing import Optional
from contextlib import asynccontextmanager

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_PATH = os.path.join(os.path.dirname(__file__), "artifacts", "recoverability_model.joblib")
METADATA_PATH = os.path.join(os.path.dirname(__file__), "artifacts", "model_metadata.json")

# Global model state
model = None
metadata = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, metadata
    if not os.path.exists(MODEL_PATH):
        print(f"[ML Server] Warning: Model artifact not found at {MODEL_PATH}. Training model...")
        from train import train_model
        model, metadata = train_model()
    else:
        print(f"[ML Server] Loading trained model pipeline from {MODEL_PATH}...")
        model = joblib.load(MODEL_PATH)
        if os.path.exists(METADATA_PATH):
            with open(METADATA_PATH, "r") as f:
                metadata = json.load(f)
        print(f"[ML Server] Model '{metadata.get('modelName', 'v1')}' loaded successfully.")
    yield


app = FastAPI(
    title="VIREON Recovery Intelligence ML Service",
    version="1.0.0",
    description="Supervised ML prediction service for recovery probability and score",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecoveryPredictionRequest(BaseModel):
    amount_at_risk: float = Field(..., description="Amount at risk in INR", ge=0)
    customer_ltv: float = Field(..., description="Customer lifetime value in INR", ge=0)
    failure_type: str = Field(..., description="Failure category / root cause string")
    retry_count: int = Field(0, description="Previous retry attempts count", ge=0)
    days_overdue: int = Field(0, description="Days overdue since scheduled due date", ge=0)
    previous_successful_payments: int = Field(0, description="Historical successful payments", ge=0)
    previous_recovery_attempts: int = Field(0, description="Previous recovery attempts for this case", ge=0)
    payment_method: str = Field("CARD", description="Payment method: CARD, UPI, NETBANKING, NACH")
    customer_tenure_days: int = Field(30, description="Customer relationship tenure in days", ge=0)


class RecoveryPredictionResponse(BaseModel):
    probability: float = Field(..., description="Recovery Probability P(recovery) between 0.0 and 1.0")
    recoverabilityScore: float = Field(..., description="Recoverability Score between 0.0 and 100.0")
    modelVersion: str = Field(..., description="Trained model version tag")
    priority: str = Field(..., description="Derived priority: HIGH, MEDIUM, LOW")


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "modelLoaded": model is not None,
        "modelVersion": metadata.get("modelVersion", "v1"),
        "algorithm": metadata.get("algorithm", "LogisticRegression"),
    }


@app.get("/metadata")
def get_metadata():
    if not metadata:
        raise HTTPException(status_code=404, detail="Model metadata not loaded")
    return metadata


@app.post("/predict", response_model=RecoveryPredictionResponse)
def predict(request: RecoveryPredictionRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded or unavailable")

    try:
        input_data = pd.DataFrame([
            {
                "amount_at_risk": float(request.amount_at_risk),
                "customer_ltv": float(request.customer_ltv),
                "failure_type": str(request.failure_type).upper(),
                "retry_count": int(request.retry_count),
                "days_overdue": int(request.days_overdue),
                "previous_successful_payments": int(request.previous_successful_payments),
                "previous_recovery_attempts": int(request.previous_recovery_attempts),
                "payment_method": str(request.payment_method).upper(),
                "customer_tenure_days": int(request.customer_tenure_days),
            }
        ])

        # Predict probability of recovery (class 1)
        proba = float(model.predict_proba(input_data)[0, 1])
        # Bounded between 0.0 and 1.0
        proba = max(0.01, min(0.99, proba))

        score = round(proba * 100.0, 1)

        # Centralized priority determination
        # >= 80 -> HIGH, >= 60 -> MEDIUM, < 60 -> LOW
        if score >= 80.0:
            priority = "HIGH"
        elif score >= 60.0:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        return RecoveryPredictionResponse(
            probability=round(proba, 4),
            recoverabilityScore=score,
            modelVersion=metadata.get("modelVersion", "v1"),
            priority=priority,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("ML_PORT", 9000))
    host = os.environ.get("ML_HOST", "0.0.0.0")
    print(f"[ML Server] Starting VIREON ML inference service on http://{host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=False, app_dir=os.path.dirname(__file__))
