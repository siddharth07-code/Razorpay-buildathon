import { prisma } from "../config/prisma";
import { fromPaise, serializeBigInt } from "../utils/money";

export interface TimelineStep {
  stepNumber: number;
  id: string;
  name: string;
  category: "INGESTION" | "AI_ANALYSIS" | "POLICY" | "RAZORPAY_EXECUTION" | "PAYMENT_OUTCOME";
  status: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "FAILED" | "BLOCKED";
  actor: string;
  timestamp: string;
  description: string;
  metadata?: any;
}

export class AuditService {
  /**
   * Log an immutable audit trail entry
   */
  public async logEvent(params: {
    caseId?: string;
    actor: string;
    eventType: string;
    description?: string;
    metadata?: any;
  }) {
    return prisma.auditEvent.create({
      data: {
        caseId: params.caseId,
        actor: params.actor,
        eventType: params.eventType,
        description: params.description,
        metadata: params.metadata || {},
      },
    });
  }

  /**
   * Get 12-step structured chronological recovery timeline for a case
   */
  public async getCaseTimeline(caseId: string) {
    const [recCase, events, attempts, decisions] = await Promise.all([
      prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: { customer: true, payment: true },
      }),
      prisma.auditEvent.findMany({
        where: { caseId },
        orderBy: { timestamp: "asc" },
      }),
      prisma.recoveryAttempt.findMany({
        where: { recoveryCaseId: caseId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.agentDecision.findMany({
        where: { recoveryCaseId: caseId },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!recCase) throw new Error(`Recovery case ${caseId} not found`);

    const hasEvent = (typePrefix: string) => events.find((e) => e.eventType.includes(typePrefix));
    const isRecovered = recCase.status === "RECOVERED";
    const isExecutingOrBeyond = ["EXECUTING", "AWAITING_PAYMENT", "IN_PROGRESS", "RECOVERED"].includes(recCase.status);
    const isDiagnosedOrBeyond = ["DIAGNOSED", "ACTION_SELECTED", "AWAITING_APPROVAL", "EXECUTING", "AWAITING_PAYMENT", "IN_PROGRESS", "RECOVERED"].includes(recCase.status);

    const timeline: TimelineStep[] = [
      {
        stepNumber: 1,
        id: "step_payment_failed",
        name: "Razorpay Payment Failure Detected",
        category: "INGESTION",
        status: "COMPLETED",
        actor: "RAZORPAY_GATEWAY",
        timestamp: recCase.createdAt.toISOString(),
        description: `Failed payment of ₹${fromPaise(recCase.amountAtRisk).toLocaleString("en-IN")} ingested from Razorpay API. Error: ${recCase.payment?.errorCode || "DEBIT_FAILED"}.`,
        metadata: {
          razorpayPaymentId: recCase.razorpayPaymentId,
          errorCode: recCase.payment?.errorCode,
        },
      },
      {
        stepNumber: 2,
        id: "step_case_created",
        name: "Recovery Case Initialized",
        category: "INGESTION",
        status: "COMPLETED",
        actor: "RECOVERY_ORCHESTRATOR",
        timestamp: recCase.createdAt.toISOString(),
        description: `Case ${recCase.caseNumber} opened for ${recCase.customer?.name || "Customer"}. Status: NEW.`,
        metadata: { caseNumber: recCase.caseNumber },
      },
      {
        stepNumber: 3,
        id: "step_risk_calculated",
        name: "Revenue Risk Score & Recoverability Calculated",
        category: "AI_ANALYSIS",
        status: isDiagnosedOrBeyond ? "COMPLETED" : "IN_PROGRESS",
        actor: "RISK_AGENT",
        timestamp: recCase.updatedAt.toISOString(),
        description: `Risk score: ${recCase.riskScore}/100, Recoverability: ${recCase.recoverabilityScore}%, Expected Recovery Value: ₹${fromPaise(recCase.expectedRecoveryValue).toLocaleString("en-IN")}.`,
        metadata: { riskScore: recCase.riskScore, recoverabilityScore: recCase.recoverabilityScore },
      },
      {
        stepNumber: 4,
        id: "step_root_cause_diagnosed",
        name: "AI Root Cause Diagnosed",
        category: "AI_ANALYSIS",
        status: isDiagnosedOrBeyond ? "COMPLETED" : "PENDING",
        actor: "ROOT_CAUSE_AGENT",
        timestamp: recCase.updatedAt.toISOString(),
        description: `Root cause classified as ${recCase.rootCause}. ${recCase.rootCauseDetails}`,
        metadata: { rootCause: recCase.rootCause },
      },
      {
        stepNumber: 5,
        id: "step_strategy_selected",
        name: "Recovery Strategy Formulated",
        category: "AI_ANALYSIS",
        status: recCase.selectedAction ? "COMPLETED" : "PENDING",
        actor: "STRATEGY_AGENT",
        timestamp: recCase.updatedAt.toISOString(),
        description: `Selected optimal action: ${recCase.selectedAction || recCase.recommendedAction}.`,
        metadata: { action: recCase.selectedAction || recCase.recommendedAction },
      },
      {
        stepNumber: 6,
        id: "step_policy_evaluated",
        name: "Deterministic Policy Engine Verification",
        category: "POLICY",
        status: recCase.requiresHumanApproval && recCase.status === "AWAITING_APPROVAL" ? "BLOCKED" : "COMPLETED",
        actor: "POLICY_ENGINE",
        timestamp: recCase.updatedAt.toISOString(),
        description: recCase.requiresHumanApproval
          ? "Flagged for mandatory operations manager approval (> ₹1,00,000 threshold)."
          : "Policy rules APPROVED: within retry caps (max 3) and frequency limits.",
        metadata: { requiresHumanApproval: recCase.requiresHumanApproval },
      },
      {
        stepNumber: 7,
        id: "step_razorpay_action_executed",
        name: "Razorpay Action Executed",
        category: "RAZORPAY_EXECUTION",
        status: isExecutingOrBeyond ? "COMPLETED" : "PENDING",
        actor: "EXECUTION_SERVICE",
        timestamp: recCase.updatedAt.toISOString(),
        description: `Dispatched ${recCase.selectedAction || recCase.recommendedAction} through official Razorpay Sandbox API.`,
        metadata: { action: recCase.selectedAction || recCase.recommendedAction },
      },
      {
        stepNumber: 8,
        id: "step_payment_link_created",
        name: "1-Click Dynamic Payment Link Generated",
        category: "RAZORPAY_EXECUTION",
        status: recCase.paymentLinkUrl ? "COMPLETED" : "PENDING",
        actor: "RAZORPAY_API",
        timestamp: recCase.updatedAt.toISOString(),
        description: recCase.paymentLinkUrl
          ? `Created Razorpay link ${recCase.paymentLinkUrl} with auto WhatsApp/SMS notification.`
          : "Payment link not generated for this recovery step.",
        metadata: {
          paymentLinkUrl: recCase.paymentLinkUrl,
          razorpayPaymentLinkId: recCase.razorpayPaymentLinkId,
        },
      },
      {
        stepNumber: 9,
        id: "step_awaiting_payment",
        name: "Awaiting Customer Settlement",
        category: "PAYMENT_OUTCOME",
        status: isRecovered ? "COMPLETED" : recCase.status === "AWAITING_PAYMENT" ? "IN_PROGRESS" : "PENDING",
        actor: "RECOVER_AI_ORCHESTRATOR",
        timestamp: recCase.updatedAt.toISOString(),
        description: "Customer checkout session open. Listening for Razorpay payment capture webhook.",
      },
      {
        stepNumber: 10,
        id: "step_webhook_received",
        name: "Razorpay Webhook Received & Signature Verified",
        category: "PAYMENT_OUTCOME",
        status: isRecovered ? "COMPLETED" : "PENDING",
        actor: "RAZORPAY_WEBHOOK",
        timestamp: (recCase.recoveredAt || recCase.updatedAt).toISOString(),
        description: isRecovered
          ? "HMAC-SHA256 authenticated webhook received and verified from Razorpay."
          : "Awaiting inbound capture webhook.",
      },
      {
        stepNumber: 11,
        id: "step_payment_confirmed",
        name: "Payment Confirmed by Razorpay",
        category: "PAYMENT_OUTCOME",
        status: isRecovered ? "COMPLETED" : "PENDING",
        actor: "RAZORPAY_GATEWAY",
        timestamp: (recCase.recoveredAt || recCase.updatedAt).toISOString(),
        description: isRecovered
          ? `Razorpay confirmed payment capture for ₹${fromPaise(recCase.recoveredAmount).toLocaleString("en-IN")}.`
          : "Awaiting bank capture confirmation.",
      },
      {
        stepNumber: 12,
        id: "step_revenue_recovered",
        name: "Revenue Recovered & Committed in PostgreSQL",
        category: "PAYMENT_OUTCOME",
        status: isRecovered ? "COMPLETED" : "PENDING",
        actor: "RECOVERY_ORCHESTRATOR",
        timestamp: (recCase.recoveredAt || recCase.updatedAt).toISOString(),
        description: isRecovered
          ? `₹${fromPaise(recCase.recoveredAmount).toLocaleString("en-IN")} successfully recovered via atomic PostgreSQL transaction. Case marked RECOVERED.`
          : "Case pending recovery settlement.",
      },
    ];

    return serializeBigInt({
      caseId,
      caseNumber: recCase.caseNumber,
      status: recCase.status,
      amountAtRisk: fromPaise(recCase.amountAtRisk),
      recoveredAmount: fromPaise(recCase.recoveredAmount),
      paymentLinkUrl: recCase.paymentLinkUrl,
      razorpayPaymentLinkId: recCase.razorpayPaymentLinkId,
      timeline,
      rawAuditEvents: events,
      rawAttempts: attempts,
      rawDecisions: decisions,
    });
  }
}

export const auditService = new AuditService();
