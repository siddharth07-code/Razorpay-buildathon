/**
 * VIREON — Real LangGraph Recovery StateGraph Workflow
 * ====================================================
 * Deterministic revenue recovery workflow orchestrated via official LangGraph.
 * Connects the supervised ML recoverability model, root cause diagnosis,
 * strategy formulation, strict deterministic policy engine, Human-in-the-Loop
 * approval interrupts, Razorpay test execution, and PostgreSQL outcome settlement.
 */

// Enable safe BigInt JSON serialization for LangGraph state persistence
if (!(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

import { StateGraph, START, END, Annotation, interrupt, Command } from "@langchain/langgraph";
import { prisma } from "../../../backend/src/config/prisma";
import { recoverabilityClient } from "../ml/recoverability-client";
import { diagnosisService } from "../../../backend/src/services/diagnosis.service";
import { strategyService } from "../../../backend/src/services/strategy.service";
import { policyService, PolicyService } from "../../../backend/src/services/policy.service";
import { executionService } from "../../../backend/src/services/execution.service";
import { outcomeService } from "../../../backend/src/services/outcome.service";
import { eventService } from "../../../backend/src/services/event.service";
import { stateMachineService } from "../../../backend/src/services/state-machine.service";
import { fromPaise, toPaise, formatINR } from "../../../backend/src/utils/money";
import { RecoveryCaseStatus, RootCauseType, RecoveryAction, AttemptStatus, PaymentStatus } from "@prisma/client";
import { postgresPrismaSaver } from "./checkpointer";

function toBigIntPaise(val: any): bigint {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(Math.round(val));
  if (typeof val === "string") {
    try {
      return BigInt(val);
    } catch {
      return 0n;
    }
  }
  return 0n;
}

function mapToPrismaAction(action: string): RecoveryAction {
  switch (action) {
    case "PAYMENT_RETRY":
    case "RETRY_PAYMENT":
      return RecoveryAction.RETRY_PAYMENT;
    case "CREATE_PAYMENT_LINK":
    case "CHECKOUT_RECOVERY_LINK":
    case "INVOICE_PAYMENT_LINK":
      return RecoveryAction.CREATE_PAYMENT_LINK;
    case "SEND_PAYMENT_LINK":
      return RecoveryAction.SEND_PAYMENT_LINK;
    case "REQUEST_PAYMENT_METHOD_UPDATE":
      return RecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE;
    case "SUBSCRIPTION_RECOVERY":
    case "SUBSCRIPTION_PAYMENT_RECOVERY":
    case "RETRY_SUBSCRIPTION":
      return RecoveryAction.RETRY_SUBSCRIPTION;
    case "SEND_REMINDER":
    case "SEND_NOTIFICATION":
    case "RECORD_PROMISE_TO_PAY":
      return RecoveryAction.SEND_NOTIFICATION;
    case "HUMAN_ESCALATION":
    case "ESCALATE_TO_HUMAN":
      return RecoveryAction.ESCALATE_TO_HUMAN;
    case "STOP_RECOVERY":
      return RecoveryAction.STOP_RECOVERY;
    default:
      return RecoveryAction.CREATE_PAYMENT_LINK;
  }
}

function mapToPrismaRootCause(cause: string): RootCauseType {
  const normalized = (cause || "").toLowerCase();
  switch (normalized) {
    case "authentication_failure":
      return RootCauseType.authentication_failure;
    case "insufficient_funds":
      return RootCauseType.insufficient_funds;
    case "card_declined":
    case "payment_method_issue":
      return RootCauseType.payment_method_issue;
    case "checkout_abandonment":
      return RootCauseType.checkout_abandonment;
    case "subscription_payment_failure":
    case "subscription_failure":
      return RootCauseType.subscription_payment_failure;
    case "overdue_invoice":
      return RootCauseType.overdue_invoice;
    case "missed_promise_to_pay":
    case "broken_commitment":
      return RootCauseType.missed_promise_to_pay;
    case "temporary_payment_failure":
    case "gateway_error":
      return RootCauseType.temporary_payment_failure;
    default:
      return RootCauseType.unknown_other;
  }
}

/**
 * 1. Strongly Typed LangGraph State Schema
 */
export const RecoveryStateAnnotation = Annotation.Root({
  caseId: Annotation<string>(),
  caseNumber: Annotation<string>({
    reducer: (x, y) => (y !== undefined ? y : x ?? ""),
    default: () => "",
  }),
  customerId: Annotation<string | undefined>(),
  paymentId: Annotation<string | undefined>(),
  orderId: Annotation<string | undefined>(),
  subscriptionId: Annotation<string | undefined>(),
  invoiceId: Annotation<string | undefined>(),

  amountAtRiskPaise: Annotation<bigint | string>({
    reducer: (_, y) => y,
    default: () => 0n,
  }),
  recoverableAmountPaise: Annotation<bigint | string | undefined>({
    reducer: (_, y) => y,
    default: () => 0n,
  }),
  customerLTVPaise: Annotation<bigint | string | undefined>({
    reducer: (_, y) => y,
    default: () => 0n,
  }),
  failureType: Annotation<string>({
    reducer: (x, y) => (y !== undefined ? y : x ?? "AUTHENTICATION_FAILURE"),
    default: () => "AUTHENTICATION_FAILURE",
  }),

  retryCount: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x ?? 0),
    default: () => 0,
  }),
  outreachCount: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x ?? 0),
    default: () => 0,
  }),
  daysOverdue: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x ?? 0),
    default: () => 0,
  }),
  previousSuccessfulPayments: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x ?? 0),
    default: () => 0,
  }),
  previousRecoveryAttempts: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x ?? 0),
    default: () => 0,
  }),
  paymentMethod: Annotation<string>({
    reducer: (x, y) => (y !== undefined ? y : x ?? "CARD"),
    default: () => "CARD",
  }),
  customerTenureDays: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x ?? 30),
    default: () => 30,
  }),

  riskProbability: Annotation<number | null | undefined>(),
  recoverabilityScore: Annotation<number | null | undefined>(),
  priority: Annotation<string | undefined>({
    reducer: (x, y) => (y !== undefined ? y : x ?? "P2"),
    default: () => "P2",
  }),

  rootCause: Annotation<string | undefined>(),
  diagnosisConfidence: Annotation<number | undefined>(),

  selectedStrategy: Annotation<string | undefined>(),
  selectedAction: Annotation<string | undefined>(),
  strategyReason: Annotation<string | undefined>(),

  requiresApproval: Annotation<boolean>({
    reducer: (x, y) => (y !== undefined ? y : x ?? false),
    default: () => false,
  }),
  requiresHumanApproval: Annotation<boolean | undefined>({
    reducer: (x, y) => (y !== undefined ? y : x),
  }),
  approvalStatus: Annotation<"PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED">({
    reducer: (x, y) => (y !== undefined ? y : x ?? "NOT_REQUIRED"),
    default: () => "NOT_REQUIRED",
  }),
  policyDecision: Annotation<"APPROVED" | "BLOCKED" | "HUMAN_APPROVAL_REQUIRED" | undefined>(),
  policyReason: Annotation<string | undefined>(),

  executionStatus: Annotation<"PENDING" | "INITIATED" | "SUCCESS" | "FAILED" | "SKIPPED">({
    reducer: (x, y) => (y !== undefined ? y : x ?? "PENDING"),
    default: () => "PENDING",
  }),
  paymentStatus: Annotation<"PENDING" | "AWAITING_PAYMENT" | "CAPTURED" | "FAILED">({
    reducer: (x, y) => (y !== undefined ? y : x ?? "PENDING"),
    default: () => "PENDING",
  }),
  paymentLinkUrl: Annotation<string | undefined>(),
  razorpayReference: Annotation<string | undefined>(),
  recoveredAmountPaise: Annotation<bigint | string>({
    reducer: (_, y) => y,
    default: () => 0n,
  }),

  currentStage: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "detect",
    default: () => "detect",
  }),
  currentNode: Annotation<string | undefined>({
    reducer: (x, y) => y ?? x ?? "detect",
  }),
  lastError: Annotation<string | null | undefined>(),
  events: Annotation<Array<{ step: string; timestamp: string; message: string }>>({
    reducer: (curr, update) => (update ? [...(curr || []), ...update] : curr || []),
    default: () => [],
  }),
});

export type RecoveryWorkflowState = typeof RecoveryStateAnnotation.State;

/**
 * 2. LangGraph Node Definitions
 */

/**
 * Node 1: DETECT
 * Ingests recovery case telemetry, checks existence and terminal status.
 */
export async function detectNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId } = state;

  const recCase = await prisma.recoveryCase.findUnique({
    where: { id: caseId },
    include: {
      customer: true,
      payment: true,
      subscription: true,
      invoice: { include: { promiseToPays: true } },
      order: true,
    },
  });

  if (!recCase) {
    throw new Error(`Recovery case ${caseId} not found in PostgreSQL`);
  }

  // Record ingestion event
  await eventService.publishEvent({
    caseId: recCase.id,
    caseNumber: recCase.caseNumber,
    type: "RECOVERY_STARTED",
    actor: "LANGGRAPH_ORCHESTRATOR",
    status: "running",
    description: `LangGraph StateGraph initialized for case ${recCase.caseNumber}`,
  });

  if (recCase.status === RecoveryCaseStatus.NEW || recCase.status === RecoveryCaseStatus.OPEN) {
    await stateMachineService.transition(recCase.id, RecoveryCaseStatus.ANALYZING);
  }

  const customerTenureDays = recCase.customer?.createdAt
    ? Math.max(1, Math.floor((Date.now() - recCase.customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)))
    : 30;

  const daysOverdue = recCase.invoice?.dueDate
    ? Math.max(0, Math.floor((Date.now() - recCase.invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const failureType = recCase.payment?.errorCode ||
    (recCase.rootCause !== "unknown_other" ? recCase.rootCause.toUpperCase() : "AUTHENTICATION_FAILURE");

  const paymentMethod = (recCase.payment?.method || "card").toUpperCase();

  return {
    caseId: recCase.id,
    caseNumber: recCase.caseNumber,
    customerId: recCase.customerId,
    paymentId: recCase.paymentId || undefined,
    orderId: recCase.orderId || undefined,
    subscriptionId: recCase.subscriptionId || undefined,
    invoiceId: recCase.invoiceId || undefined,
    amountAtRiskPaise: recCase.amountAtRisk,
    customerLTVPaise: recCase.customer?.lifetimeValue || 0n,
    failureType,
    paymentMethod,
    daysOverdue,
    previousSuccessfulPayments: recCase.customer?.successfulPayments || 0,
    previousRecoveryAttempts: recCase.retryCount || 0,
    customerTenureDays,
    retryCount: recCase.retryCount || 0,
    currentStage: "detect",
    events: [
      {
        step: "detect",
        timestamp: new Date().toISOString(),
        message: `Recovery case ${recCase.caseNumber} ingested into LangGraph pipeline (Amount: ₹${fromPaise(recCase.amountAtRisk).toLocaleString("en-IN")})`,
      },
    ],
  };
}

/**
 * Node 2: RISK SCORE
 * Calls the real Python Supervised ML service (Logistic Regression).
 */
export async function riskScoreNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const {
    caseId,
    caseNumber,
    amountAtRiskPaise,
    customerLTVPaise,
    failureType,
    retryCount,
    daysOverdue,
    previousSuccessfulPayments,
    previousRecoveryAttempts,
    paymentMethod,
    customerTenureDays,
  } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RISK_ANALYSIS_STARTED",
    actor: "ML_RISK_AGENT",
    status: "running",
    description: `Calling supervised ML recoverability model (LogisticRegression) for ${caseNumber}...`,
  });

  const mlPrediction = await recoverabilityClient.predict({
    amountAtRiskPaise: toBigIntPaise(amountAtRiskPaise),
    customerLTVPaise: toBigIntPaise(customerLTVPaise),
    failureType: failureType || "AUTHENTICATION_FAILURE",
    retryCount: retryCount || 0,
    daysOverdue: daysOverdue || 0,
    previousSuccessfulPayments: previousSuccessfulPayments || 0,
    previousRecoveryAttempts: previousRecoveryAttempts || 0,
    paymentMethod: paymentMethod || "CARD",
    customerTenureDays: customerTenureDays || 30,
  });

  const probability = mlPrediction.probability !== null ? mlPrediction.probability : 0.75;
  const recoverabilityScore = mlPrediction.recoverabilityScore !== null
    ? mlPrediction.recoverabilityScore
    : Math.round(probability * 100);

  // Centralized priority thresholds
  // >= 80 -> HIGH, >= 60 -> MEDIUM, < 60 -> LOW
  const priority = mlPrediction.priority;

  // Persist prediction in PostgreSQL recoveryCase
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      recoverabilityScore: Math.round(recoverabilityScore),
      riskScore: Math.max(1, Math.min(99, Math.round(100 - recoverabilityScore))),
      priority: priority === "HIGH" ? "P1" : priority === "MEDIUM" ? "P2" : "P3",
    },
  });

  // Record in agentDecision table
  try {
    await prisma.agentDecision.create({
      data: {
        recoveryCaseId: caseId,
        agent: "MLRiskAgent (LogisticRegression v1)",
        decision: `Predicted Recovery Probability: ${(probability * 100).toFixed(1)}% (Priority: ${priority})`,
        confidence: probability,
        explanation: `Supervised ML inference (v1) evaluated 9 features: amount at risk ₹${fromPaise(toBigIntPaise(amountAtRiskPaise)).toLocaleString("en-IN")}, tenure ${customerTenureDays}d, ${previousSuccessfulPayments} past payments, method ${paymentMethod}.`,
        inputSnapshot: {
          amountAtRiskPaise: amountAtRiskPaise.toString(),
          probability,
          recoverabilityScore,
          priority,
          modelVersion: mlPrediction.modelVersion,
          isFallback: mlPrediction.isFallback,
        },
      },
    });
  } catch (err) {
    console.warn("[riskScoreNode] agentDecision write warning:", err);
  }

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RISK_ANALYSIS_COMPLETED",
    actor: "ML_RISK_AGENT",
    status: "success",
    description: `ML Recovery Probability: ${(probability * 100).toFixed(1)}% | Priority: ${priority} [Model: ${mlPrediction.modelVersion}]`,
    metadata: {
      recoveryProbability: probability,
      recoverabilityScore,
      priority,
      modelVersion: mlPrediction.modelVersion,
    },
  });

  return {
    riskProbability: probability,
    recoverabilityScore,
    priority,
    currentStage: "riskScore",
    events: [
      {
        step: "riskScore",
        timestamp: new Date().toISOString(),
        message: `ML Recovery Probability evaluated at ${(probability * 100).toFixed(1)}% (${priority} Priority) via LogisticRegression model.`,
      },
    ],
  };
}

/**
 * Node 3: DIAGNOSE
 * Performs root cause telemetry classification.
 */
export async function diagnoseNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, paymentId, subscriptionId, invoiceId, failureType, paymentMethod, retryCount } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "DIAGNOSIS_STARTED",
    actor: "DIAGNOSIS_AGENT",
    status: "running",
    description: `Diagnosing payment telemetry and failure logs for ${caseNumber}...`,
  });

  const payment = paymentId ? await prisma.payment.findUnique({ where: { id: paymentId } }) : null;
  const isSubscription = Boolean(subscriptionId);
  const isInvoice = Boolean(invoiceId);

  const diagResult = await diagnosisService.diagnose({
    errorCode: payment?.errorCode || failureType,
    errorDescription: payment?.errorDescription || (isSubscription ? "Recurring subscription debit failed" : "Card 3DS authentication challenge timeout"),
    paymentMethod: payment?.method || paymentMethod || "card",
    isSubscription,
    isInvoice,
    attempts: retryCount || 0,
  });

  const curCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
  if (curCase?.status === RecoveryCaseStatus.ANALYZING) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.DIAGNOSED);
  }

  const prismaRootCause = mapToPrismaRootCause(diagResult.rootCause);

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      rootCause: prismaRootCause,
      rootCauseDetails: diagResult.explanation,
    },
  });

  try {
    await prisma.agentDecision.create({
      data: {
        recoveryCaseId: caseId,
        agent: "DiagnosisAgent",
        decision: `Diagnosed ${diagResult.rootCause}`,
        confidence: diagResult.confidence,
        explanation: diagResult.explanation,
        inputSnapshot: {
          rootCause: diagResult.rootCause,
          confidence: diagResult.confidence,
          isTransient: diagResult.isTransient,
        },
      },
    });
  } catch (err) {
    console.warn("[diagnoseNode] agentDecision write warning:", err);
  }

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "DIAGNOSIS_COMPLETED",
    actor: "DIAGNOSIS_AGENT",
    status: "success",
    description: `Root Cause: ${diagResult.rootCause} (Confidence: ${Math.round(diagResult.confidence * 100)}%)`,
    metadata: { rootCause: diagResult.rootCause, confidence: diagResult.confidence },
  });

  return {
    rootCause: diagResult.rootCause,
    diagnosisConfidence: diagResult.confidence,
    currentStage: "diagnose",
    events: [
      {
        step: "diagnose",
        timestamp: new Date().toISOString(),
        message: `Diagnosed root cause: ${diagResult.rootCause} (${Math.round(diagResult.confidence * 100)}% confidence).`,
      },
    ],
  };
}

/**
 * Node 4: STRATEGY
 * Selects recovery intervention influenced by diagnosis and ML score.
 */
export async function strategyNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, rootCause, amountAtRiskPaise, recoverabilityScore, retryCount } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "STRATEGY_STARTED",
    actor: "STRATEGY_AGENT",
    status: "running",
    description: `Formulating optimal recovery strategy for ${caseNumber}...`,
  });

  const stratResult = strategyService.selectStrategy({
    rootCause: (rootCause || "AUTHENTICATION_FAILURE") as any,
    amountAtRisk: toBigIntPaise(amountAtRiskPaise),
    risk: {
      riskScore: Math.round(100 - (recoverabilityScore || 80)),
      recoverabilityScore: Math.round(recoverabilityScore || 80),
      expectedRecoveryValue: toBigIntPaise(amountAtRiskPaise),
      priority: (state.priority || "P1") as any,
      riskLevel: (state.priority === "HIGH" ? "HIGH" : state.priority === "LOW" ? "LOW" : "MEDIUM") as any,
      explanation: `Supervised ML recoverability score ${recoverabilityScore}%`,
    },
    recoveryAttemptsCount: retryCount || 0,
    customerContactCount: state.outreachCount || 0,
  });

  const curCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
  if (curCase?.status === RecoveryCaseStatus.DIAGNOSED) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ACTION_SELECTED);
  }

  const prismaAction = mapToPrismaAction(stratResult.action);
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      recommendedAction: prismaAction,
      selectedAction: prismaAction,
    },
  });

  try {
    await prisma.agentDecision.create({
      data: {
        recoveryCaseId: caseId,
        agent: "StrategyAgent",
        decision: `Selected Action: ${stratResult.action}`,
        confidence: stratResult.confidence,
        explanation: stratResult.explanation,
        inputSnapshot: {
          action: stratResult.action,
          confidence: stratResult.confidence,
        },
      },
    });
  } catch (err) {
    console.warn("[strategyNode] agentDecision write warning:", err);
  }

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "STRATEGY_SELECTED",
    actor: "STRATEGY_AGENT",
    status: "success",
    description: `Selected Strategy: ${stratResult.action}`,
    metadata: { action: stratResult.action, confidence: stratResult.confidence },
  });

  return {
    selectedStrategy: stratResult.action,
    strategyReason: stratResult.explanation,
    currentStage: "strategy",
    events: [
      {
        step: "strategy",
        timestamp: new Date().toISOString(),
        message: `Recovery strategy formulated: ${stratResult.action}`,
      },
    ],
  };
}

/**
 * Node 5: POLICY GATE
 * Deterministic guardrails. Strictly enforces >= ₹1,00,000 human approval threshold.
 * ML cannot override policy.
 */
export async function policyNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, selectedStrategy, amountAtRiskPaise, retryCount } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "POLICY_CHECK_STARTED",
    actor: "POLICY_ENGINE",
    status: "running",
    description: `Evaluating deterministic financial guardrails and authorization policies...`,
  });

  const amountPaise = toBigIntPaise(amountAtRiskPaise);

  const policyResult = policyService.evaluatePolicy({
    caseId,
    action: (selectedStrategy || "CREATE_PAYMENT_LINK") as any,
    amountAtRisk: amountPaise,
    recoveryAttemptsCount: retryCount || 0,
    customerContactCount: state.outreachCount || 0,
  });

  let requiresApproval = false;
  let approvalStatus: "PENDING" | "APPROVED" | "REJECTED" | "NOT_REQUIRED" = "NOT_REQUIRED";

  // Critical rule: amountAtRisk >= 10000000 paise (₹1,00,000) requires human approval
  if (amountPaise >= PolicyService.HUMAN_APPROVAL_AMOUNT || policyResult.requiresHumanApproval) {
    requiresApproval = true;
    approvalStatus = "PENDING";
  } else if (!policyResult.allowed) {
    approvalStatus = "REJECTED";
  } else {
    approvalStatus = "APPROVED";
  }

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      requiresHumanApproval: requiresApproval,
      status: requiresApproval ? RecoveryCaseStatus.AWAITING_APPROVAL : undefined,
    },
  });

  if (requiresApproval) {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "HUMAN_APPROVAL_REQUIRED",
      actor: "POLICY_ENGINE",
      status: "waiting",
      description: `Case amount ₹${fromPaise(amountPaise).toLocaleString("en-IN")} exceeds ₹1,00,000 policy threshold. Pausing for human sign-off.`,
      metadata: { requiresHumanApproval: true, policyCode: policyResult.policyCode },
    });
  } else if (approvalStatus === "APPROVED") {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "POLICY_APPROVED",
      actor: "POLICY_ENGINE",
      status: "success",
      description: `Policy approved: ₹${fromPaise(amountPaise).toLocaleString("en-IN")} is within automated recovery ceiling (< ₹1,00,000).`,
      metadata: { allowed: true, policyCode: policyResult.policyCode },
    });
  } else {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "POLICY_BLOCKED",
      actor: "POLICY_ENGINE",
      status: "blocked",
      description: `Policy blocked: ${policyResult.reason}`,
      metadata: { allowed: false, policyCode: policyResult.policyCode },
    });
  }

  return {
    requiresApproval,
    approvalStatus,
    policyReason: policyResult.reason,
    currentStage: "policy",
    events: [
      {
        step: "policy",
        timestamp: new Date().toISOString(),
        message: requiresApproval
          ? `Policy Gate: Human sign-off required (Amount ₹${fromPaise(amountPaise).toLocaleString("en-IN")} >= ₹1,00,000).`
          : `Policy Gate: Auto-approved (₹${fromPaise(amountPaise).toLocaleString("en-IN")} < ₹1,00,000 threshold).`,
      },
    ],
  };
}

/**
 * Node 6: HUMAN APPROVAL
 * Native LangGraph Human-in-the-Loop Interrupt.
 * Pauses execution when approval is needed; resumes via Command({ resume: ... }).
 */
export async function humanApprovalNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, amountAtRiskPaise, recoverabilityScore, priority, rootCause, selectedStrategy, policyReason } = state;

  // Trigger LangGraph native interrupt when approval is pending
  const resumeValue: any = interrupt({
    caseId,
    caseNumber,
    amountAtRiskPaise: amountAtRiskPaise.toString(),
    amountAtRiskRupees: fromPaise(toBigIntPaise(amountAtRiskPaise)),
    recoverabilityScore,
    priority,
    rootCause,
    selectedStrategy,
    policyReason,
    prompt: `Operator sign-off required for high-value case ${caseNumber} (Amount: ₹${fromPaise(toBigIntPaise(amountAtRiskPaise)).toLocaleString("en-IN")})`,
  });

  const isApproved = Boolean(resumeValue?.approved);
  const operator = resumeValue?.operator || "Operations Manager";
  const reason = resumeValue?.reason || (isApproved ? "Approved by operations supervisor" : "Rejected by operations supervisor");

  if (isApproved) {
    try {
      await prisma.humanApproval.create({
        data: {
          recoveryCaseId: caseId,
          requestedAction: mapToPrismaAction(selectedStrategy || "CREATE_PAYMENT_LINK"),
          status: "APPROVED",
          approvedBy: operator,
          reason,
        },
      });
    } catch (err) {
      console.warn("[humanApprovalNode] Record error:", err);
    }

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        requiresHumanApproval: false,
        status: RecoveryCaseStatus.ACTION_SELECTED,
      },
    });

    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "HUMAN_APPROVAL_RECEIVED",
      actor: operator,
      status: "success",
      description: `Human sign-off granted by ${operator}: ${reason}`,
    });

    return {
      approvalStatus: "APPROVED",
      requiresApproval: false,
      currentStage: "humanApproval",
      events: [
        {
          step: "humanApproval",
          timestamp: new Date().toISOString(),
          message: `Human approval granted by ${operator}. Proceeding to Razorpay execution.`,
        },
      ],
    };
  }

  // Operator Rejected
  try {
    await prisma.humanApproval.create({
      data: {
        recoveryCaseId: caseId,
        requestedAction: mapToPrismaAction(selectedStrategy || "CREATE_PAYMENT_LINK"),
        status: "REJECTED",
        approvedBy: operator,
        reason,
      },
    });
  } catch (err) {
    console.warn("[humanApprovalNode] Record error:", err);
  }

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      status: RecoveryCaseStatus.STOPPED,
    },
  });

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RECOVERY_STOPPED",
    actor: operator,
    status: "blocked",
    description: `Recovery halted: ${reason}`,
  });

  return {
    approvalStatus: "REJECTED",
    requiresApproval: false,
    currentStage: "humanApproval",
    events: [
      {
        step: "humanApproval",
        timestamp: new Date().toISOString(),
        message: `Recovery rejected by operator: ${reason}. Workflow terminated.`,
      },
    ],
  };
}

/**
 * Node 7: EXECUTE
 * Dispatches to Razorpay via existing executionService.
 */
export async function executeNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, selectedStrategy, amountAtRiskPaise, customerId, paymentId, subscriptionId, invoiceId, retryCount } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RAZORPAY_ACTION_STARTED",
    actor: "EXECUTION_SERVICE",
    status: "running",
    description: `Calling Razorpay TEST API for ${selectedStrategy || "CREATE_PAYMENT_LINK"}...`,
  });

  const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;

  // Move state machine through EXECUTING
  const curCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
  if (curCase?.status === RecoveryCaseStatus.NEW || curCase?.status === RecoveryCaseStatus.OPEN) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ANALYZING);
    await stateMachineService.transition(caseId, RecoveryCaseStatus.DIAGNOSED);
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ACTION_SELECTED);
  } else if (curCase?.status === RecoveryCaseStatus.ANALYZING) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.DIAGNOSED);
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ACTION_SELECTED);
  } else if (curCase?.status === RecoveryCaseStatus.DIAGNOSED) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ACTION_SELECTED);
  }

  if (curCase?.status !== RecoveryCaseStatus.EXECUTING) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.EXECUTING);
  }

  const execution = await executionService.executeAction({
    caseId,
    action: (selectedStrategy || "CREATE_PAYMENT_LINK") as any,
    amountAtRisk: toBigIntPaise(amountAtRiskPaise),
    customer: {
      name: customer?.name || "Customer",
      email: customer?.email || "customer@vireon.demo",
      phone: customer?.phone || "+919876543210",
    },
    paymentId,
    subscriptionId,
    invoiceId,
    attemptNumber: (retryCount || 0) + 1,
  });

  if (execution.success && execution.paymentLinkUrl) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.AWAITING_PAYMENT);

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        paymentLinkUrl: execution.paymentLinkUrl,
        razorpayPaymentLinkId: execution.razorpayReference,
      },
    });

    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "PAYMENT_LINK_CREATED",
      actor: "RAZORPAY_API",
      status: "success",
      description: `Razorpay 1-Click Payment Link: ${execution.paymentLinkUrl}`,
      metadata: { paymentLinkUrl: execution.paymentLinkUrl },
    });

    return {
      executionStatus: "SUCCESS",
      paymentStatus: "AWAITING_PAYMENT",
      paymentLinkUrl: execution.paymentLinkUrl,
      razorpayReference: execution.razorpayReference,
      currentStage: "execute",
      events: [
        {
          step: "execute",
          timestamp: new Date().toISOString(),
          message: `Dynamic Razorpay payment link generated: ${execution.paymentLinkUrl}`,
        },
      ],
    };
  }

  if (execution.success) {
    return {
      executionStatus: "SUCCESS",
      paymentStatus: "CAPTURED",
      razorpayReference: execution.razorpayReference,
      currentStage: "execute",
      events: [
        {
          step: "execute",
          timestamp: new Date().toISOString(),
          message: `Razorpay payment execution dispatched successfully (${execution.razorpayReference}).`,
        },
      ],
    };
  }

  return {
    executionStatus: "FAILED",
    paymentStatus: "FAILED",
    lastError: execution.message,
    currentStage: "execute",
    events: [
      {
        step: "execute",
        timestamp: new Date().toISOString(),
        message: `Razorpay execution attempt failed: ${execution.message}`,
      },
    ],
  };
}

/**
 * Node 8: OUTCOME
 * Evaluates payment capture verification and confirms settlement in PostgreSQL.
 */
export async function outcomeNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, paymentStatus, amountAtRiskPaise, razorpayReference } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "OUTCOME_NODE_STARTED",
    actor: "OUTCOME_SERVICE",
    status: "running",
    description: `Evaluating recovery outcome state: ${paymentStatus}...`,
  });

  const amountPaise = toBigIntPaise(amountAtRiskPaise);

  if (paymentStatus === "CAPTURED") {
    await outcomeService.confirmRecovery({
      caseId,
      amountCapturedPaise: amountPaise,
      razorpayPaymentId: razorpayReference,
    });

    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "REVENUE_RECOVERED",
      actor: "OUTCOME_SERVICE",
      status: "success",
      description: `Confirmed ₹${fromPaise(amountPaise).toLocaleString("en-IN")} recovery settled in PostgreSQL.`,
    });

    return {
      recoveredAmountPaise: amountPaise,
      currentStage: "outcome",
      events: [
        {
          step: "outcome",
          timestamp: new Date().toISOString(),
          message: `Payment verified and settled in PostgreSQL: ₹${fromPaise(amountPaise).toLocaleString("en-IN")}.`,
        },
      ],
    };
  }

  return {
    currentStage: "outcome",
    events: [
      {
        step: "outcome",
        timestamp: new Date().toISOString(),
        message: `Recovery outcome: ${paymentStatus}.`,
      },
    ],
  };
}

/**
 * Node 9: RETRY
 * Bounded retry scheduler (MAX_RETRIES = 3).
 */
export async function retryNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, retryCount } = state;
  const nextRetry = (retryCount || 0) + 1;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "GRAPH_RETRY",
    actor: "LANGGRAPH_ORCHESTRATOR",
    status: "running",
    description: `Scheduling retry attempt ${nextRetry} of 3...`,
  });

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: { retryCount: nextRetry },
  });

  return {
    retryCount: nextRetry,
    currentStage: "retry",
    events: [
      {
        step: "retry",
        timestamp: new Date().toISOString(),
        message: `Retry scheduled: Attempt ${nextRetry} of 3.`,
      },
    ],
  };
}

/**
 * Node 10: COMPLETE
 * Marks workflow finalization.
 */
export async function completeNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, recoveredAmountPaise, paymentStatus } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "GRAPH_COMPLETED",
    actor: "LANGGRAPH_ORCHESTRATOR",
    status: "success",
    description: `LangGraph workflow completed for ${caseNumber} [Status: ${paymentStatus}]`,
  });

  return {
    currentStage: "complete",
    events: [
      {
        step: "complete",
        timestamp: new Date().toISOString(),
        message: `LangGraph recovery workflow successfully completed for ${caseNumber}.`,
      },
    ],
  };
}

/**
 * Node 11: ESCALATE
 * Escalates case when retry bounds are exceeded or policy rejects execution.
 */
export async function escalateNode(state: RecoveryWorkflowState): Promise<Partial<RecoveryWorkflowState>> {
  const { caseId, caseNumber, lastError, approvalStatus } = state;

  const terminalStatus = approvalStatus === "REJECTED" ? RecoveryCaseStatus.STOPPED : RecoveryCaseStatus.ESCALATED;

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: { status: terminalStatus },
  });

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RECOVERY_ESCALATED",
    actor: "LANGGRAPH_ORCHESTRATOR",
    status: "failed",
    description: `Case escalated: ${lastError || (approvalStatus === "REJECTED" ? "Rejected by operator" : "Maximum retry attempts exceeded")}`,
  });

  return {
    currentStage: "escalate",
    events: [
      {
        step: "escalate",
        timestamp: new Date().toISOString(),
        message: `Recovery escalated to operations team (${terminalStatus}).`,
      },
    ],
  };
}

/**
 * 3. Conditional Routing Functions
 */

export function routeAfterPolicy(state: RecoveryWorkflowState): string {
  if (state.approvalStatus === "PENDING" || state.requiresApproval) {
    return "humanApproval";
  }
  if (state.approvalStatus === "REJECTED") {
    return "escalate";
  }
  return "execute";
}

export function routeAfterHumanApproval(state: RecoveryWorkflowState): string {
  if (state.approvalStatus === "APPROVED") {
    return "execute";
  }
  return "escalate";
}

export function routeAfterOutcome(state: RecoveryWorkflowState): string {
  if (state.paymentStatus === "CAPTURED" || state.paymentStatus === "AWAITING_PAYMENT") {
    return "complete";
  }
  if ((state.retryCount || 0) < 3) {
    return "retry";
  }
  return "escalate";
}

export function routeAfterRetry(state: RecoveryWorkflowState): string {
  if ((state.retryCount || 0) < 3) {
    return "execute";
  }
  return "escalate";
}

/**
 * 4. Build and Compile the Recovery StateGraph
 */
export function buildRecoveryStateGraph(checkpointer = postgresPrismaSaver) {
  const workflow = new StateGraph(RecoveryStateAnnotation)
    // 11 explicit nodes
    .addNode("detect", detectNode)
    .addNode("riskScore", riskScoreNode)
    .addNode("diagnose", diagnoseNode)
    .addNode("strategy", strategyNode)
    .addNode("policy", policyNode)
    .addNode("humanApproval", humanApprovalNode)
    .addNode("execute", executeNode)
    .addNode("outcome", outcomeNode)
    .addNode("retry", retryNode)
    .addNode("complete", completeNode)
    .addNode("escalate", escalateNode)

    // Topology edges
    .addEdge(START, "detect")
    .addEdge("detect", "riskScore")
    .addEdge("riskScore", "diagnose")
    .addEdge("diagnose", "strategy")
    .addEdge("strategy", "policy")

    // Policy conditional branch
    .addConditionalEdges("policy", routeAfterPolicy, {
      execute: "execute",
      humanApproval: "humanApproval",
      escalate: "escalate",
    })

    // Human Approval conditional branch
    .addConditionalEdges("humanApproval", routeAfterHumanApproval, {
      execute: "execute",
      escalate: "escalate",
    })

    .addEdge("execute", "outcome")

    // Outcome conditional branch
    .addConditionalEdges("outcome", routeAfterOutcome, {
      complete: "complete",
      retry: "retry",
      escalate: "escalate",
    })

    // Retry conditional branch
    .addConditionalEdges("retry", routeAfterRetry, {
      execute: "execute",
      escalate: "escalate",
    })

    .addEdge("complete", END)
    .addEdge("escalate", END);

  return workflow.compile({ checkpointer });
}

export const recoveryWorkflowGraph = buildRecoveryStateGraph();
