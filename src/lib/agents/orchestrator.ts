import { revenueRiskAgent } from "./risk-agent";
import { rootCauseAgent } from "./root-cause-agent";
import { recoveryStrategyAgent } from "./strategy-agent";
import { policyAgent } from "./policy-agent";
import { executionAgent } from "./execution-agent";
import { outcomeAgent } from "./outcome-agent";
import { repository } from "../db/repository";
import { Payment } from "@/types/payment";
import { Customer } from "@/types/customer";
import { Subscription } from "@/types/subscription";
import { RecoveryCase } from "@/types/recovery-case";

export interface PipelineExecutionResult {
  caseId: string;
  caseNumber: string;
  risk: any;
  diagnosis: any;
  strategy: any;
  policy: any;
  execution: any;
  outcome: any;
  recoveryCase: RecoveryCase;
}

export class RecoveryAgentOrchestrator {
  /**
   * Run full autonomous recovery pipeline on a Razorpay payment failure event.
   */
  public async processPaymentFailure(params: {
    payment: Payment;
    customer?: Customer;
    subscription?: Subscription;
    caseId?: string;
  }): Promise<PipelineExecutionResult> {
    const { payment, customer, subscription } = params;
    const now = new Date().toISOString();

    // 1. REVENUE RISK DETECTION
    const risk = revenueRiskAgent.evaluateRisk({
      caseId: params.caseId,
      payment,
      customer,
      subscription,
      previousFailuresCount: customer?.failureCount || 0,
      previousRecoveriesCount: customer?.recoveryCount || 0,
    });

    // 2. ROOT CAUSE ANALYSIS
    const diagnosis = await rootCauseAgent.diagnose({
      payment,
      customer,
      subscription,
      riskOutput: risk,
    });

    // 3. RECOVERY STRATEGY FORMULATION
    const strategy = recoveryStrategyAgent.selectStrategy({
      payment,
      customer,
      subscription,
      risk,
      diagnosis,
      recoveryAttemptsCount: 0,
    });

    // 4. POLICY ENGINE VALIDATION
    const policy = policyAgent.evaluatePolicy({
      caseId: risk.caseId,
      amount: payment.amount,
      action: strategy.action,
      recoveryAttempts: 0,
      customerContactCount: 0,
    });

    // 5. RAZORPAY ACTION EXECUTION
    const execution = await executionAgent.execute({
      caseId: risk.caseId,
      strategy,
      policy,
      payment,
      customer,
      subscription,
    });

    // 6. OUTCOME DETERMINATION
    const outcome = outcomeAgent.evaluateOutcome({
      caseId: risk.caseId,
      amount: payment.amount,
      executionResult: execution,
    });

    const caseNumber = `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const caseStatus = outcome.isRecovered
      ? "RECOVERED"
      : policy.requiresHumanApproval
      ? "PENDING_APPROVAL"
      : !policy.allowed
      ? "STOPPED"
      : "IN_PROGRESS";

    // 7. PERSIST RECOVERY CASE
    const recoveryCase: RecoveryCase = {
      id: risk.caseId,
      caseNumber,
      customerId: payment.customerId,
      paymentId: payment.id,
      razorpayPaymentId: payment.razorpayPaymentId,
      razorpayPaymentLinkId: execution.razorpayPaymentLinkId,
      razorpaySubscriptionId: subscription?.razorpaySubscriptionId,
      amount: payment.amount,
      currency: "INR",
      status: caseStatus as any,
      riskLevel: risk.priority === "P0" ? "CRITICAL" : risk.priority === "P1" ? "HIGH" : "MEDIUM",
      riskScore: risk.riskScore,
      recoverabilityScore: risk.recoverabilityScore,
      expectedRecoveryValue: risk.expectedRecoveryValue,
      priority: risk.priority,
      rootCause: diagnosis.rootCause as any,
      rootCauseDetails: diagnosis.explanation,
      selectedAction: strategy.action,
      currentStep: outcome.isRecovered
        ? "RECOVERY_RESOLVED"
        : policy.requiresHumanApproval
        ? "PENDING_HUMAN_APPROVAL"
        : "SMART_RETRY_SCHEDULED",
      actionsTakenCount: execution.success ? 1 : 0,
      recoveryAttempts: 1,
      recoveredAmount: outcome.recoveredAmount,
      totalRecoveredAmount: outcome.recoveredAmount,
      requiresHumanApproval: policy.requiresHumanApproval,
      paymentLinkUrl: execution.paymentLinkUrl,
      scheduledRetries: [],
      aiRecommendation: {
        action: strategy.reason,
        actionType: strategy.action as any,
        confidence: strategy.confidence,
        reasoning: strategy.reason,
        recommendedChannel: strategy.channel,
        expectedRecoveryProbability: risk.recoverabilityScore / 100,
        optimalRetryTime: strategy.suggestedSchedule,
      },
      customer,
      payment,
      subscription,
      timeline: [
        {
          id: `tl_1_${Date.now()}`,
          timestamp: now,
          title: "Razorpay Payment Failed",
          description: `Transaction ${payment.razorpayPaymentId} failed with ${payment.errorCode || "authorization error"} for ₹${payment.amount.toLocaleString("en-IN")}.`,
          type: "PAYMENT_FAILED",
          actor: "RAZORPAY_WEBHOOK",
        },
        {
          id: `tl_2_${Date.now()}`,
          timestamp: now,
          title: "VIREON Diagnosis & Strategy",
          description: `Diagnosed as ${diagnosis.rootCause} (${Math.round(diagnosis.confidence * 100)}% conf). Selected action: ${strategy.action}.`,
          type: "AGENT_ANALYSIS",
          actor: "RECOVER_AI_AGENT",
        },
        {
          id: `tl_3_${Date.now()}`,
          timestamp: now,
          title: policy.allowed ? (policy.requiresHumanApproval ? "Policy Flagged for Human Approval" : "Policy Approved & Action Executed") : "Policy Action Blocked",
          description: execution.message,
          type: "POLICY_CHECK",
          actor: "SYSTEM",
        },
      ],
      createdAt: now,
      updatedAt: now,
      recoveredAt: outcome.isRecovered ? now : undefined,
    };

    repository.createRecoveryCase(recoveryCase);

    // 8. RECORD AGENT DECISION & AUDIT TRAIL
    repository.addAgentDecision({
      caseId: risk.caseId,
      caseNumber,
      customerId: payment.customerId,
      customerName: customer?.name || "Customer",
      amount: payment.amount,
      decisionType: strategy.action as any,
      confidence: strategy.confidence,
      rationale: `${diagnosis.explanation} ${strategy.reason}`,
      signalsDetected: diagnosis.signalsDetected,
      proposedAction: strategy.action,
      executedAction: execution.message,
      channel: strategy.channel as any,
      executionStatus: execution.executionStatus as any,
      humanReviewRequired: policy.requiresHumanApproval,
    });

    return {
      caseId: risk.caseId,
      caseNumber,
      risk,
      diagnosis,
      strategy,
      policy,
      execution,
      outcome,
      recoveryCase,
    };
  }

  /**
   * Process a payment recovery event (e.g. payment.captured, payment_link.paid, subscription.charged).
   */
  public processPaymentCaptured(params: {
    paymentId: string;
    razorpayPaymentId: string;
    amount: number;
    paymentLinkId?: string;
  }): { success: boolean; case?: RecoveryCase; message: string } {
    const allCases = repository.getRecoveryCases();
    const matchedCase = allCases.find(
      (c) =>
        c.paymentId === params.paymentId ||
        c.razorpayPaymentId === params.razorpayPaymentId ||
        (params.paymentLinkId && c.razorpayPaymentLinkId === params.paymentLinkId)
    );

    if (!matchedCase) {
      return {
        success: false,
        message: `No active recovery case found for Razorpay Payment ID ${params.razorpayPaymentId}`,
      };
    }

    const updated = repository.markCaseRecovered(matchedCase.id, params.amount);

    return {
      success: true,
      case: updated,
      message: `Recovery case ${matchedCase.caseNumber} successfully closed. Captured ₹${params.amount.toLocaleString("en-IN")}.`,
    };
  }
}

export const recoveryOrchestrator = new RecoveryAgentOrchestrator();
