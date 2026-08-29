import { RiskAgentInput, RiskAgentOutput, CasePriority } from "./types";

export class RevenueRiskAgent {
  /**
   * Deterministically evaluate revenue risk, recoverability, and priority.
   * All money math is strictly deterministic TypeScript code.
   */
  public evaluateRisk(input: RiskAgentInput): RiskAgentOutput {
    const { payment, customer, subscription, previousFailuresCount = 0, previousRecoveriesCount = 0 } = input;
    const amount = payment.amount;

    // 1. Base Risk Scoring (0 to 100)
    let riskScore = 40; // Default baseline risk

    // Error code risk weighting
    const errorCode = payment.errorCode;
    if (errorCode === "INSUFFICIENT_FUNDS") {
      riskScore += 20;
    } else if (errorCode === "PAYMENT_AUTHENTICATION_FAILED") {
      riskScore += 15;
    } else if (errorCode === "CARD_EXPIRED") {
      riskScore += 30;
    } else if (errorCode === "MANDATE_EXECUTION_FAILED") {
      riskScore += 25;
    } else if (errorCode === "GATEWAY_ERROR" || errorCode === "BANK_SERVER_DOWN") {
      riskScore += 5; // Transient bank failure has lower intrinsic customer churn risk
    } else if (errorCode === "UPI_COLLECT_TIMEOUT") {
      riskScore += 10;
    }

    // Historical failure penalties
    const totalFailures = (customer?.failureCount || 0) + previousFailuresCount;
    if (totalFailures >= 3) {
      riskScore += 25;
    } else if (totalFailures >= 1) {
      riskScore += 10;
    }

    // Customer tier mitigations
    if (customer?.tier === "ENTERPRISE") {
      riskScore = Math.max(riskScore - 10, 20);
    } else if (customer?.tier === "GROWTH") {
      riskScore = Math.max(riskScore - 5, 20);
    }

    // Amount severity
    if (amount >= 100000) {
      riskScore = Math.min(riskScore + 15, 100);
    }

    riskScore = Math.max(10, Math.min(99, riskScore));

    // 2. Deterministic Recoverability Score (0 to 100)
    let recoverabilityScore = 80; // Baseline recoverability

    if (errorCode === "GATEWAY_ERROR" || errorCode === "BANK_SERVER_DOWN") {
      recoverabilityScore = 95; // Very high recoverability on retry
    } else if (errorCode === "INSUFFICIENT_FUNDS") {
      recoverabilityScore = 88; // High recoverability if retried during liquidity window
    } else if (errorCode === "PAYMENT_AUTHENTICATION_FAILED") {
      recoverabilityScore = 84; // High recoverability via 1-click WhatsApp/UPI link
    } else if (errorCode === "UPI_COLLECT_TIMEOUT") {
      recoverabilityScore = 85; // High with interactive deep-link
    } else if (errorCode === "CARD_EXPIRED") {
      recoverabilityScore = 65; // Moderate, requires customer to tokenize new card
    } else if (errorCode === "BAD_REQUEST_ERROR") {
      recoverabilityScore = 40; // Low without manual intervention
    }

    // Customer history loyalty boost
    const ltv = customer?.ltv || 0;
    if (ltv > 200000) {
      recoverabilityScore = Math.min(recoverabilityScore + 8, 98);
    }
    if ((customer?.recoveryCount || 0) + previousRecoveriesCount > 0) {
      recoverabilityScore = Math.min(recoverabilityScore + 5, 99);
    }

    // Penalty if repeated attempts already failed
    if (totalFailures > 2) {
      recoverabilityScore = Math.max(recoverabilityScore - 20, 20);
    }

    // 3. Deterministic Expected Recovery Value (INR)
    const expectedRecoveryValue = Math.round(amount * (recoverabilityScore / 100));

    // 4. Priority Tier Determination
    let priority: CasePriority = "P2";
    if (amount >= 100000 || customer?.tier === "ENTERPRISE" || riskScore >= 80) {
      priority = "P0";
    } else if (amount >= 25000 || customer?.tier === "GROWTH" || riskScore >= 60) {
      priority = "P1";
    } else if (amount >= 5000) {
      priority = "P2";
    } else {
      priority = "P3";
    }

    // 5. Deterministic Diagnostic Summary
    const caseId = input.caseId || `case_${Date.now()}`;
    const reason = `Risk assessed at ${riskScore}/100 based on ${payment.method.toUpperCase()} failure (${errorCode || "Unknown"}) for ${customer?.name || "Customer"} with ${recoverabilityScore}% recoverability probability (Expected Value: ₹${expectedRecoveryValue.toLocaleString("en-IN")}).`;

    return {
      caseId,
      riskScore,
      recoverabilityScore,
      expectedRecoveryValue,
      priority,
      reason,
    };
  }
}

export const revenueRiskAgent = new RevenueRiskAgent();
