import { recoveryRepository } from "../repositories/recovery.repository";
import { auditRepository } from "../repositories/audit.repository";
import { revenueRiskAgent } from "../../../src/lib/agents/risk-agent";
import { rootCauseAgent } from "../../../src/lib/agents/root-cause-agent";
import { recoveryStrategyAgent } from "../../../src/lib/agents/strategy-agent";
import { policyAgent } from "../../../src/lib/agents/policy-agent";
import { executionAgent } from "../../../src/lib/agents/execution-agent";
import { fromPaise, serializeBigInt } from "../utils/money";
import { RecoveryAction, RecoveryCaseStatus } from "@prisma/client";

export class RecoveryService {
  public async getCaseById(id: string) {
    const recCase = await recoveryRepository.findById(id);
    if (!recCase) return null;
    return serializeBigInt(recCase);
  }

  public async listCases(params: any) {
    const result = await recoveryRepository.listCases(params);
    return serializeBigInt(result);
  }

  public async analyzeCase(id: string) {
    const recCase = await recoveryRepository.findById(id);
    if (!recCase) throw new Error(`Recovery case ${id} not found`);

    const amountInRupees = fromPaise(recCase.amountAtRisk);

    const paymentAdapted: any = {
      id: recCase.paymentId || id,
      razorpayPaymentId: recCase.razorpayPaymentId || `pay_${id}`,
      amount: amountInRupees,
      currency: recCase.currency,
      status: "failed",
      method: recCase.payment?.method || "card",
      errorCode: recCase.payment?.errorCode || "INSUFFICIENT_FUNDS",
    };

    const customerAdapted: any = recCase.customer ? {
      ...recCase.customer,
      lifetimeValue: fromPaise(recCase.customer.lifetimeValue),
      recoveredAmount: fromPaise(recCase.customer.recoveredAmount),
    } : undefined;

    const risk = revenueRiskAgent.evaluateRisk({
      caseId: recCase.id,
      payment: paymentAdapted,
      customer: customerAdapted,
    });

    const diagnosis = await rootCauseAgent.diagnose({
      payment: paymentAdapted,
      customer: customerAdapted,
      riskOutput: risk,
    });

    const strategy = recoveryStrategyAgent.selectStrategy({
      payment: paymentAdapted,
      customer: customerAdapted,
      risk,
      diagnosis,
      recoveryAttemptsCount: recCase.retryCount,
    });

    const policy = policyAgent.evaluatePolicy({
      caseId: recCase.id,
      amount: amountInRupees,
      action: strategy.action as any,
      recoveryAttempts: recCase.retryCount,
      customerContactCount: recCase.contactCount,
    });

    // Record decision in PostgreSQL
    await recoveryRepository.recordDecision({
      recoveryCaseId: recCase.id,
      agent: "MultiAgentOrchestrator",
      decision: strategy.action,
      confidence: strategy.confidence,
      explanation: `${diagnosis.explanation} ${strategy.reason}`,
      inputSnapshot: { risk, diagnosis, strategy, policy },
    });

    return serializeBigInt({
      caseId: recCase.id,
      risk,
      diagnosis,
      strategy,
      policy,
    });
  }

  public async approveCase(id: string, approvedBy: string = "operations_admin") {
    const recCase = await recoveryRepository.findById(id);
    if (!recCase) throw new Error(`Recovery case ${id} not found`);

    const updated = await recoveryRepository.updateCaseStatus(
      id,
      RecoveryCaseStatus.IN_PROGRESS,
      {
        currentStep: "SMART_RETRY_SCHEDULED",
        selectedAction: recCase.recommendedAction,
      }
    );

    await auditRepository.logEvent({
      caseId: id,
      actor: approvedBy,
      eventType: "HUMAN_APPROVED",
      description: `High-value action ${recCase.recommendedAction} approved by ${approvedBy}. Amount: ₹${fromPaise(recCase.amountAtRisk).toLocaleString("en-IN")}.`,
    });

    return serializeBigInt(updated);
  }

  public async rejectCase(id: string, reason: string = "Rejected by operations manager") {
    const updated = await recoveryRepository.updateCaseStatus(
      id,
      RecoveryCaseStatus.STOPPED,
      {
        currentStep: "RECOVERY_STOPPED",
      }
    );

    await auditRepository.logEvent({
      caseId: id,
      actor: "operations_admin",
      eventType: "HUMAN_REJECTED",
      description: `Recovery halted: ${reason}`,
    });

    return serializeBigInt(updated);
  }
}

export const recoveryService = new RecoveryService();
