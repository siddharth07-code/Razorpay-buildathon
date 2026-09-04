"""
VIREON — Synthetic Recovery Training Data Generator
====================================================
IMPORTANT NOTICE:
This is a synthetic demonstration dataset generated strictly for demonstrating
the machine learning recovery scoring pipeline in the VIREON infrastructure.
It does NOT contain real customer, transaction, or financial data.
"""

import os
import numpy as np
import pandas as pd

def generate_recovery_dataset(output_path: str = "ml/data/recovery_training.csv", n_samples: int = 450, seed: int = 42):
    np.random.seed(seed)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    failure_types = [
        "AUTHENTICATION_FAILURE",
        "CARD_DECLINED",
        "INSUFFICIENT_FUNDS",
        "CHECKOUT_ABANDONMENT",
        "RECURRING_PAYMENT_FAILURE",
        "INVOICE_OVERDUE",
        "BROKEN_COMMITMENT",
        "GATEWAY_ERROR",
    ]

    payment_methods = ["CARD", "UPI", "NETBANKING", "NACH"]

    records = []
    for _ in range(n_samples):
        # 1. Generate core features
        # Amount at risk in INR: mixture of low (e.g. ₹500 - ₹15,000), medium (₹15,000 - ₹95,000), and high (₹1,00,000 - ₹9,00,000)
        tier_choice = np.random.choice(["low", "medium", "high"], p=[0.45, 0.40, 0.15])
        if tier_choice == "low":
            amount_at_risk = int(np.random.uniform(500, 15000))
        elif tier_choice == "medium":
            amount_at_risk = int(np.random.uniform(15000, 95000))
        else:
            amount_at_risk = int(np.random.uniform(100000, 850000))

        # Customer tenure in days (10 days to ~3 years)
        customer_tenure_days = int(np.random.uniform(15, 1100))

        # Customer LTV in INR (correlated loosely with tenure and amount)
        base_ltv = amount_at_risk * np.random.uniform(1.5, 12.0) + (customer_tenure_days * np.random.uniform(50, 400))
        customer_ltv = int(max(1000, min(base_ltv, 2500000)))

        failure_type = np.random.choice(failure_types, p=[0.24, 0.16, 0.18, 0.14, 0.12, 0.08, 0.05, 0.03])
        payment_method = np.random.choice(payment_methods, p=[0.45, 0.35, 0.12, 0.08])

        # Overdue days (0 for fresh failures, higher for invoice/broken commitment)
        if failure_type in ["INVOICE_OVERDUE", "BROKEN_COMMITMENT"]:
            days_overdue = int(np.random.exponential(12)) + 1
        elif failure_type in ["CHECKOUT_ABANDONMENT", "AUTHENTICATION_FAILURE"]:
            days_overdue = int(np.random.choice([0, 1, 2], p=[0.75, 0.20, 0.05]))
        else:
            days_overdue = int(np.random.exponential(3))

        days_overdue = min(days_overdue, 60)

        # Retry count so far (0 to 4)
        retry_count = int(np.random.choice([0, 1, 2, 3, 4], p=[0.45, 0.28, 0.15, 0.08, 0.04]))

        # Previous successful payments
        tenure_factor = customer_tenure_days / 30.0
        previous_successful_payments = int(np.random.poisson(max(1.0, tenure_factor * 0.8)))
        previous_successful_payments = min(previous_successful_payments, 60)

        # Previous recovery attempts failed
        previous_recovery_attempts = int(np.random.choice([0, 1, 2, 3], p=[0.60, 0.25, 0.10, 0.05]))

        # 2. Compute latent recovery propensity (log-odds)
        z = -0.40

        # Positive recovery drivers
        ltv_ratio = customer_ltv / max(1.0, amount_at_risk)
        if ltv_ratio > 5.0:
            z += 0.85
        elif ltv_ratio > 2.0:
            z += 0.40

        if previous_successful_payments >= 10:
            z += 0.90
        elif previous_successful_payments >= 3:
            z += 0.45

        if customer_tenure_days > 365:
            z += 0.40

        if days_overdue == 0:
            z += 0.65
        elif days_overdue <= 3:
            z += 0.25
        elif days_overdue > 14:
            z -= 1.10
        elif days_overdue > 30:
            z -= 1.80

        if failure_type in ["AUTHENTICATION_FAILURE", "GATEWAY_ERROR", "CHECKOUT_ABANDONMENT"]:
            z += 0.70
        elif failure_type in ["INSUFFICIENT_FUNDS"]:
            z += 0.20
        elif failure_type in ["BROKEN_COMMITMENT"]:
            z -= 1.40
        elif failure_type in ["CARD_DECLINED"]:
            z -= 0.35

        if retry_count == 0:
            z += 0.35
        elif retry_count >= 3:
            z -= 1.20
        elif retry_count == 2:
            z -= 0.50

        if previous_recovery_attempts >= 2:
            z -= 0.90
        elif previous_recovery_attempts == 1:
            z -= 0.30

        if amount_at_risk >= 200000:
            z -= 1.30
        elif amount_at_risk >= 100000:
            z -= 0.70
        elif amount_at_risk <= 25000:
            z += 0.30

        noise = np.random.normal(0, 0.45)
        z += noise

        prob = 1.0 / (1.0 + np.exp(-z))
        recovered = 1 if np.random.rand() < prob else 0

        records.append({
            "amount_at_risk": amount_at_risk,
            "customer_ltv": customer_ltv,
            "failure_type": failure_type,
            "retry_count": retry_count,
            "days_overdue": days_overdue,
            "previous_successful_payments": previous_successful_payments,
            "previous_recovery_attempts": previous_recovery_attempts,
            "payment_method": payment_method,
            "customer_tenure_days": customer_tenure_days,
            "recovered": recovered,
        })

    df = pd.DataFrame(records)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} synthetic recovery records saved to {output_path}")
    print(f"Recovery rate in dataset: {df['recovered'].mean():.2%}")
    return df

if __name__ == "__main__":
    generate_recovery_dataset()
