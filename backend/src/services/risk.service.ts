import { CasePriority, RecoveryRiskLevel } from "@prisma/client";
import { fromPaise } from "../utils/money";

export interface RiskInput {
  caseId?: string;
  amountAtRisk: bigint;
  paymentMethod?: string;
  failureReason?: string;
  customerHistory?: {
    lifetimeValue?: bigint;
    successfulPayments: number;
    failedPayments: number;
    tier?: string;
  };
  previousRecoveryAttempts?: number;
  daysOverdue?: number;
}

export type RiskOutput = {
  riskScore: number;
  recoverabilityScore: number;
  expectedRecoveryValue: bigint;
  priority: CasePriority;
  riskLevel: RecoveryRiskLevel;
  explanation: string;
};
export type RiskEvaluation = RiskOutput;

export class RiskService {
  /**
   * Deterministic financial risk scoring
   * LLM classifies/reasons, but financial calculations are strictly TypeScript code.
   */
  public evaluateRisk(input: RiskInput): RiskOutput {
    const amountRupees = fromPaise(input.amountAtRisk);
    const history = input.customerHistory || { successfulPayments: 0, failedPayments: 1 };
    const previousAttempts = input.previousRecoveryAttempts || 0;
    const reason = (input.failureReason || "").toLowerCase();
    const method = (input.paymentMethod || "").toLowerCase();

    // 1. Calculate Base Recoverability Score (0-100)
    let recoverability = 80;

    // Positive customer relationship modifiers
    if (history.successfulPayments > 5) recoverability += 15;
    else if (history.successfulPayments >= 2) recoverability += 10;

    if (history.tier === "ENTERPRISE") recoverability += 10;
    else if (history.tier === "GROWTH") recoverability += 5;

    // Technical / Transient error modifiers (Higher recoverability)
    if (reason.includes("network") || reason.includes("gateway") || reason.includes("timeout") || reason.includes("glitch")) {
      recoverability += 10;
    } else if (reason.includes("insufficient") || reason.includes("funds") || reason.includes("limit")) {
      recoverability += 5; // Easily recoverable with smart timing / salary cycle
    } else if (reason.includes("auth") || reason.includes("drop") || reason.includes("3ds")) {
      recoverability += 8; // 1-click link solves authentication drop
    } else if (reason.includes("expired") || reason.includes("blocked") || reason.includes("invalid")) {
      recoverability -= 15; // Requires instrument change
    }

    // Attempt fatigue penalty
    recoverability -= previousAttempts * 12;

    // Age / Overdue penalty
    if (input.daysOverdue && input.daysOverdue > 14) {
      recoverability -= Math.min(30, input.daysOverdue * 2);
    }

    // Bound recoverability score to 5–99%
    const recoverabilityScore = Math.max(5, Math.min(99, recoverability));

    // 2. Calculate Base Risk Score (0-100)
    let risk = 40;

    // High financial exposure increases risk urgency
    if (amountRupees >= 100000) risk += 35;
    else if (amountRupees >= 50000) risk += 25;
    else if (amountRupees >= 15000) risk += 15;

    // Repeated failure history increases churn risk
    if (history.failedPayments > 2) risk += 15;
    if (previousAttempts >= 2) risk += 20;

    const riskScore = Math.max(10, Math.min(99, risk));

    // 3. Deterministic Expected Recovery Value (Integer Paise)
    // Formula: expectedRecoveryValue = (amountAtRisk * recoverabilityScore) / 100
    const expectedRecoveryValue = (input.amountAtRisk * BigInt(recoverabilityScore)) / 100n;

    // 4. Assign Priority
    let priority: CasePriority = CasePriority.P2;
    let riskLevel: RecoveryRiskLevel = RecoveryRiskLevel.MEDIUM;

    if (amountRupees >= 100000 || (amountRupees >= 50000 && riskScore >= 70)) {
      priority = CasePriority.P0;
      riskLevel = RecoveryRiskLevel.CRITICAL;
    } else if (amountRupees >= 25000 || riskScore >= 65) {
      priority = CasePriority.P1;
      riskLevel = RecoveryRiskLevel.HIGH;
    } else if (amountRupees >= 5000) {
      priority = CasePriority.P2;
      riskLevel = RecoveryRiskLevel.MEDIUM;
    } else {
      priority = CasePriority.P3;
      riskLevel = RecoveryRiskLevel.LOW;
    }

    const explanation = `Risk assessed at ${riskScore}/100 with ${recoverabilityScore}% recoverability for ₹${amountRupees.toLocaleString(
      "en-IN"
    )} (${method.toUpperCase()} presentation, ${input.failureReason || "failed debit"}). Expected recovery value: ₹${fromPaise(
      expectedRecoveryValue
    ).toLocaleString("en-IN")}.`;

    return {
      riskScore,
      recoverabilityScore,
      expectedRecoveryValue,
      priority,
      riskLevel,
      explanation,
    };
  }
}

export const riskService = new RiskService();
