 import { StateGraph, END, START, MemorySaver, Annotation } from "@langchain/langgraph";
import { prisma } from "../config/prisma";
import { riskService } from "../services/risk.service";
import { diagnosisService } from "../services/diagnosis.service";
import { strategyService } from "../services/strategy.service";
import { policyService } from "../services/policy.service";
import { executionService } from "../services/execution.service";
import { outcomeService } from "../services/outcome.service";
import { auditService } from "../services/audit.service";
import { eventService } from "../services/event.service";
import { stateMachineService } from "../services/state-machine.service";
import { fromPaise, toPaise, formatINR } from "../utils/money";
import { RecoveryCaseStatus, AttemptStatus, RootCauseType, RecoveryAction } from "@prisma/client";

function mapToPrismaAction(action: string): RecoveryAction {
  switch (action) {
    case "PAYMENT_RETRY":
    case "RETRY_PAYMENT":
      return RecoveryAction.RETRY_PAYMENT;
    case "CREATE_PAYMENT_LINK":
      return RecoveryAction.CREATE_PAYMENT_LINK;
    case "SEND_PAYMENT_LINK":
      return RecoveryAction.SEND_PAYMENT_LINK;
    case "REQUEST_PAYMENT_METHOD_UPDATE":
      return RecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE;
    case "SUBSCRIPTION_RECOVERY":
    case "RETRY_SUBSCRIPTION":
      return RecoveryAction.RETRY_SUBSCRIPTION;
    case "INVOICE_RECOVERY":
    case "SEND_REMINDER":
    case "SEND_NOTIFICATION":
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

/**
 * 1. Strongly Typed Graph State Schema using LangGraph Annotation
 */
export const RecoveryAnnotation = Annotation.Root({
  caseId: Annotation<string>(),
  caseNumber: Annotation<string>(),
  customerId: Annotation<string>(),
  paymentId: Annotation<string | undefined>(),
  orderId: Annotation<string | undefined>(),
  razorpayOrderId: Annotation<string | undefined>(),
  checkoutSessionId: Annotation<string | undefined>(),
  checkoutAgeMinutes: Annotation<number | undefined>(),
  subscriptionId: Annotation<string | undefined>(),
  razorpaySubscriptionId: Annotation<string | undefined>(),
  invoiceId: Annotation<string | undefined>(),
  razorpayInvoiceId: Annotation<string | undefined>(),
  daysOverdue: Annotation<number | undefined>(),
  isPromiseToPay: Annotation<boolean | undefined>(),
  revenueSource: Annotation<"PAYMENT" | "SUBSCRIPTION" | "INVOICE" | "CHECKOUT" | undefined>(),
  subscriptionStatus: Annotation<string | undefined>(),
  failureReason: Annotation<string | undefined>(),

  amountAtRiskPaise: Annotation<bigint>(),
  recoverableAmountPaise: Annotation<bigint>(),
  recoveredAmountPaise: Annotation<bigint>(),

  riskScore: Annotation<number | undefined>(),
  recoverabilityScore: Annotation<number | undefined>(),
  expectedRecoveryValuePaise: Annotation<bigint | undefined>(),
  priority: Annotation<string | undefined>(),
  riskReasoning: Annotation<string | undefined>(),

  rootCause: Annotation<string | undefined>(),
  diagnosisConfidence: Annotation<number | undefined>(),
  diagnosisSummary: Annotation<string | undefined>(),

  selectedAction: Annotation<string | undefined>(),
  strategyConfidence: Annotation<number | undefined>(),
  strategyRationale: Annotation<string | undefined>(),

  policyDecision: Annotation<"APPROVED" | "BLOCKED" | "HUMAN_APPROVAL_REQUIRED" | undefined>(),
  policyCode: Annotation<string | undefined>(),
  policyReason: Annotation<string | undefined>(),
  requiresHumanApproval: Annotation<boolean | undefined>(),

  isApprovedByHuman: Annotation<boolean | undefined>(),
  isRejectedByHuman: Annotation<boolean | undefined>(),
  humanOperator: Annotation<string | undefined>(),

  executionStatus: Annotation<"INITIATED" | "SUCCESS" | "FAILED" | "SKIPPED" | undefined>(),
  paymentLinkUrl: Annotation<string | undefined>(),
  razorpayReference: Annotation<string | undefined>(),
  executionMessage: Annotation<string | undefined>(),

  paymentStatus: Annotation<"AWAITING_PAYMENT" | "CAPTURED" | "FAILED" | undefined>(),

  retryCount: Annotation<number>({
    reducer: (x, y) => (y !== undefined ? y : x ?? 0),
    default: () => 0,
  }),
  currentNode: Annotation<string>({
    reducer: (x, y) => y ?? x ?? "START",
    default: () => "START",
  }),
  error: Annotation<string | undefined>(),
});

export type RecoveryGraphState = typeof RecoveryAnnotation.State;

// In-Memory Checkpointer for Workflow Resumability
export const recoveryCheckpointer = new MemorySaver();

/**
 * 2. LangGraph Node Definitions
 */

/**
 * Node 1: Risk Agent
 */
export async function riskNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, amountAtRiskPaise, customerId } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RISK_ANALYSIS_STARTED",
    actor: "RISK_AGENT",
    status: "running",
    description: `LangGraph [riskNode]: Evaluating recoverability for case ${caseNumber}...`,
  });

  const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;
  const payment = state.paymentId ? await prisma.payment.findUnique({ where: { id: state.paymentId } }) : null;

  const curCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
  if (curCase?.status === RecoveryCaseStatus.NEW || curCase?.status === RecoveryCaseStatus.OPEN) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ANALYZING);
  }

  const riskResult = riskService.evaluateRisk({
    amountAtRisk: amountAtRiskPaise,
    customerHistory: {
      lifetimeValue: customer?.lifetimeValue || 0n,
      successfulPayments: customer?.successfulPayments || 0,
      failedPayments: customer?.failedPayments || 1,
      tier: customer?.tier || "STANDARD",
    },
    failureReason: payment?.errorDescription || "Payment authentication timeout",
    paymentMethod: payment?.method || "card",
  });

  // Persist in DB
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      riskScore: riskResult.riskScore,
      recoverabilityScore: riskResult.recoverabilityScore,
      expectedRecoveryValue: riskResult.expectedRecoveryValue,
      priority: riskResult.priority,
    },
  });

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RISK_ANALYSIS_COMPLETED",
    actor: "RISK_AGENT",
    status: "success",
    description: `LangGraph [riskNode]: Recoverability ${riskResult.recoverabilityScore}%, Expected Value ₹${fromPaise(riskResult.expectedRecoveryValue)}. Priority ${riskResult.priority}.`,
    metadata: {
      riskScore: riskResult.riskScore,
      recoverabilityScore: riskResult.recoverabilityScore,
      expectedRecoveryValue: fromPaise(riskResult.expectedRecoveryValue),
      priority: riskResult.priority,
    },
  });

  return {
    riskScore: riskResult.riskScore,
    recoverabilityScore: riskResult.recoverabilityScore,
    expectedRecoveryValuePaise: riskResult.expectedRecoveryValue,
    priority: riskResult.priority,
    riskReasoning: riskResult.explanation,
    currentNode: "risk",
  };
}

/**
 * Node 2: Diagnosis Agent
 */
export async function diagnosisNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, paymentId } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "DIAGNOSIS_STARTED",
    actor: "DIAGNOSIS_AGENT",
    status: "running",
    description: `LangGraph [diagnosisNode]: Diagnosing root cause error telemetry...`,
  });

  const payment = paymentId ? await prisma.payment.findUnique({ where: { id: paymentId } }) : null;
  const isSub = Boolean(state.subscriptionId || state.razorpaySubscriptionId || state.revenueSource === "SUBSCRIPTION");

  const diagResult = await diagnosisService.diagnose({
    errorCode: payment?.errorCode || (isSub ? "SUBSCRIPTION_PAYMENT_FAILED" : "PAYMENT_FAILED"),
    errorDescription: payment?.errorDescription || state.failureReason || (isSub ? "Subscription recurring debit failed" : "Card auth challenge timeout"),
    paymentMethod: payment?.method || (isSub ? "nach" : "card"),
    isSubscription: isSub,
    subscriptionStatus: state.subscriptionStatus,
    failureReason: state.failureReason,
    attempts: state.retryCount,
  });

  const prismaRootCause = (diagResult.rootCause.toLowerCase() as RootCauseType) || RootCauseType.unknown_other;

  const curCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
  if (curCase?.status === RecoveryCaseStatus.ANALYZING) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.DIAGNOSED);
  }

  // Persist in DB
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      rootCause: prismaRootCause,
      rootCauseDetails: diagResult.explanation,
    },
  });

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "DIAGNOSIS_COMPLETED",
    actor: "DIAGNOSIS_AGENT",
    status: "success",
    description: `LangGraph [diagnosisNode]: Diagnosed ${diagResult.rootCause} (Confidence: ${Math.round(diagResult.confidence * 100)}%).`,
    metadata: { rootCause: diagResult.rootCause, confidence: diagResult.confidence },
  });

  return {
    rootCause: diagResult.rootCause,
    diagnosisConfidence: diagResult.confidence,
    diagnosisSummary: diagResult.explanation,
    currentNode: "diagnosis",
  };
}

/**
 * Node 3: Strategy Agent
 */
export async function strategyNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, rootCause, amountAtRiskPaise } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "STRATEGY_STARTED",
    actor: "STRATEGY_AGENT",
    status: "running",
    description: `LangGraph [strategyNode]: Selecting intervention from closed action set...`,
  });

  if (state.selectedAction && (state.selectedAction as string) === "UNAUTHORIZED_FORCED_DEBIT") {
    return {
      selectedAction: state.selectedAction,
      currentNode: "strategy",
    };
  }

  const stratResult = strategyService.selectStrategy({
    rootCause: (rootCause || "UNKNOWN") as any,
    amountAtRisk: amountAtRiskPaise,
    risk: {
      riskScore: state.riskScore || 50,
      recoverabilityScore: state.recoverabilityScore || 80,
      expectedRecoveryValue: state.expectedRecoveryValuePaise || amountAtRiskPaise,
      priority: (state.priority || "P1") as any,
      riskLevel: "MEDIUM" as any,
      explanation: state.riskReasoning || "Standard risk",
    },
    recoveryAttemptsCount: state.retryCount || 0,
    customerContactCount: 0,
  });

  const curCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
  if (curCase?.status === RecoveryCaseStatus.DIAGNOSED) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ACTION_SELECTED);
  }

  // Persist in DB
  const prismaAction = mapToPrismaAction(stratResult.action);
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      recommendedAction: prismaAction,
      selectedAction: prismaAction,
    },
  });

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "STRATEGY_SELECTED",
    actor: "STRATEGY_AGENT",
    status: "success",
    description: `LangGraph [strategyNode]: Formulated ${stratResult.action}.`,
    metadata: { action: stratResult.action, confidence: stratResult.confidence },
  });

  return {
    selectedAction: stratResult.action,
    strategyConfidence: stratResult.confidence,
    strategyRationale: stratResult.explanation,
    currentNode: "strategy",
  };
}

/**
 * Node 4: Policy Engine (Deterministic Guardrails)
 */
export async function policyNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, selectedAction, amountAtRiskPaise, retryCount } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "POLICY_CHECK_STARTED",
    actor: "POLICY_ENGINE",
    status: "running",
    description: `LangGraph [policyNode]: Evaluating deterministic guardrails and threshold limits...`,
  });

  const policyResult = policyService.evaluatePolicy({
    caseId,
    action: (selectedAction || "CREATE_PAYMENT_LINK") as any,
    amountAtRisk: amountAtRiskPaise,
    recoveryAttemptsCount: retryCount || 0,
    customerContactCount: 0,
  });

  let decision: "APPROVED" | "BLOCKED" | "HUMAN_APPROVAL_REQUIRED" = "APPROVED";
  if (!policyResult.allowed) {
    decision = "BLOCKED";
  } else if (policyResult.requiresHumanApproval) {
    decision = "HUMAN_APPROVAL_REQUIRED";
  }

  // Persist in DB
  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: {
      requiresHumanApproval: policyResult.requiresHumanApproval,
      status: decision === "HUMAN_APPROVAL_REQUIRED" ? RecoveryCaseStatus.AWAITING_APPROVAL : undefined,
    },
  });

  if (decision === "HUMAN_APPROVAL_REQUIRED") {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "HUMAN_APPROVAL_REQUIRED",
      actor: "POLICY_ENGINE",
      status: "waiting",
      description: `LangGraph [policyNode]: ${policyResult.reason}`,
      metadata: { policyCode: policyResult.policyCode, requiresHumanApproval: true },
    });
  } else if (decision === "APPROVED") {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "POLICY_APPROVED",
      actor: "POLICY_ENGINE",
      status: "success",
      description: `LangGraph [policyNode]: ${policyResult.reason}`,
      metadata: { policyCode: policyResult.policyCode, allowed: true },
    });
  } else {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "POLICY_BLOCKED",
      actor: "POLICY_ENGINE",
      status: "blocked",
      description: `LangGraph [policyNode]: ${policyResult.reason}`,
      metadata: { policyCode: policyResult.policyCode, allowed: false },
    });
  }

  return {
    policyDecision: decision,
    policyCode: policyResult.policyCode,
    policyReason: policyResult.reason,
    requiresHumanApproval: policyResult.requiresHumanApproval,
    currentNode: "policy",
  };
}

/**
 * Node 5: Human Approval Node
 */
export async function humanApprovalNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, isApprovedByHuman, isRejectedByHuman, humanOperator } = state;

  if (isApprovedByHuman) {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "HUMAN_APPROVAL_RECEIVED",
      actor: humanOperator || "OPERATIONS_MANAGER",
      status: "success",
      description: `LangGraph [humanApprovalNode]: Authorized execution by ${humanOperator || "OPERATIONS_MANAGER"}.`,
    });

    return {
      policyDecision: "APPROVED",
      requiresHumanApproval: false,
      currentNode: "humanApproval",
    };
  }

  if (isRejectedByHuman) {
    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "RECOVERY_STOPPED",
      actor: humanOperator || "OPERATIONS_MANAGER",
      status: "blocked",
      description: `LangGraph [humanApprovalNode]: Recovery rejected by operator. Workflow terminated.`,
    });

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: { status: RecoveryCaseStatus.STOPPED },
    });

    return {
      policyDecision: "BLOCKED",
      policyReason: "Operator rejected recovery authorization",
      currentNode: "humanApproval",
    };
  }

  // Suspended state awaiting operator input
  return {
    currentNode: "humanApproval",
  };
}

/**
 * Node 6: Razorpay Execution Node (Isolated Financial Boundary)
 */
export async function executionNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, selectedAction, amountAtRiskPaise, customerId, paymentId, retryCount } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RAZORPAY_ACTION_STARTED",
    actor: "EXECUTION_SERVICE",
    status: "running",
    description: `LangGraph [executionNode]: Calling Razorpay API for ${selectedAction || "CREATE_PAYMENT_LINK"}...`,
  });

  const customer = customerId ? await prisma.customer.findUnique({ where: { id: customerId } }) : null;

  // Strictly transition state machine to EXECUTING
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

  // Execute through ExecutionService
  const execution = await executionService.executeAction({
    caseId,
    action: (selectedAction || "CREATE_PAYMENT_LINK") as any,
    amountAtRisk: amountAtRiskPaise,
    customer: {
      name: customer?.name || "Customer",
      email: customer?.email || "customer@example.in",
      phone: customer?.phone || "+919876543210",
    },
    paymentId,
    subscriptionId: state.subscriptionId,
    razorpaySubscriptionId: state.razorpaySubscriptionId,
    attemptNumber: (retryCount || 0) + 1,
  });

  if (execution.success && execution.paymentLinkUrl) {
    await stateMachineService.transition(caseId, RecoveryCaseStatus.AWAITING_PAYMENT);

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        paymentLinkUrl: execution.paymentLinkUrl,
        razorpayPaymentLinkId: execution.razorpayReference,
        retryCount: { increment: 1 },
      },
    });

    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "PAYMENT_LINK_CREATED",
      actor: "RAZORPAY_API",
      status: "success",
      description: `LangGraph [executionNode]: 1-Click Razorpay Dynamic Payment Link: ${execution.paymentLinkUrl}`,
      metadata: { paymentLinkUrl: execution.paymentLinkUrl },
    });

    return {
      executionStatus: "SUCCESS",
      paymentLinkUrl: execution.paymentLinkUrl,
      razorpayReference: execution.razorpayReference,
      paymentStatus: "AWAITING_PAYMENT",
      retryCount: (retryCount || 0) + 1,
      currentNode: "execution",
    };
  }

  if (execution.success) {
    return {
      executionStatus: "SUCCESS",
      razorpayReference: execution.razorpayReference,
      paymentStatus: "CAPTURED",
      retryCount: (retryCount || 0) + 1,
      currentNode: "execution",
    };
  }

  return {
    executionStatus: "FAILED",
    executionMessage: execution.message,
    paymentStatus: "FAILED",
    retryCount: (retryCount || 0) + 1,
    currentNode: "execution",
  };
}

/**
 * Node 7: Outcome Evaluation Node
 */
export async function outcomeNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, paymentStatus, amountAtRiskPaise, razorpayReference } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "OUTCOME_NODE_STARTED",
    actor: "OUTCOME_SERVICE",
    status: "running",
    description: `LangGraph [outcomeNode]: Evaluating recovery outcome status: ${paymentStatus}...`,
  });

  if (paymentStatus === "CAPTURED") {
    await outcomeService.confirmRecovery({
      caseId,
      amountCapturedPaise: amountAtRiskPaise,
      razorpayPaymentId: razorpayReference,
    });

    await eventService.publishEvent({
      caseId,
      caseNumber,
      type: "REVENUE_RECOVERED",
      actor: "OUTCOME_SERVICE",
      status: "success",
      description: `LangGraph [outcomeNode]: Confirmed ₹${fromPaise(amountAtRiskPaise)} recovery in PostgreSQL.`,
    });

    return {
      recoveredAmountPaise: amountAtRiskPaise,
      currentNode: "outcome",
    };
  }

  return {
    currentNode: "outcome",
  };
}

/**
 * Node 8: Retry Node (Bounded Loop Safety)
 */
export async function retryNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, retryCount } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "GRAPH_RETRY",
    actor: "RECOVERY_ORCHESTRATOR",
    status: "running",
    description: `LangGraph [retryNode]: Retrying recovery attempt ${retryCount} / 3...`,
  });

  return {
    currentNode: "retry",
  };
}

/**
 * Node 9: Escalation Node
 */
export async function escalationNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, error } = state;

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: { status: RecoveryCaseStatus.ESCALATED },
  });

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RECOVERY_ESCALATED",
    actor: "RECOVERY_ORCHESTRATOR",
    status: "failed",
    description: `LangGraph [escalationNode]: Case escalated to operations team: ${error || "Maximum retry threshold exceeded."}`,
  });

  return {
    currentNode: "escalation",
  };
}

/**
 * Node 10: Stop Node
 */
export async function stopNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber, policyReason } = state;

  await prisma.recoveryCase.update({
    where: { id: caseId },
    data: { status: RecoveryCaseStatus.STOPPED },
  });

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "RECOVERY_STOPPED",
    actor: "POLICY_ENGINE",
    status: "blocked",
    description: `LangGraph [stopNode]: Recovery safely halted: ${policyReason || "Policy guardrail blocked action."}`,
  });

  return {
    currentNode: "stop",
  };
}

/**
 * Node 11: Complete Node
 */
export async function completeNode(state: RecoveryGraphState): Promise<Partial<RecoveryGraphState>> {
  const { caseId, caseNumber } = state;

  await eventService.publishEvent({
    caseId,
    caseNumber,
    type: "GRAPH_COMPLETED",
    actor: "LANGGRAPH_ORCHESTRATOR",
    status: "success",
    description: `LangGraph [completeNode]: Workflow execution completed successfully for ${caseNumber}.`,
  });

  return {
    currentNode: "complete",
  };
}

/**
 * 3. Conditional Edge Routing Functions
 */

export function routeAfterPolicy(state: RecoveryGraphState): string {
  if (state.isRejectedByHuman) return "stop";
  if (state.isApprovedByHuman) return "execution";
  if (state.policyDecision === "BLOCKED") return "stop";
  if (state.policyDecision === "HUMAN_APPROVAL_REQUIRED" || state.requiresHumanApproval) return "humanApproval";
  return "execution";
}

export function routeAfterHumanApproval(state: RecoveryGraphState): string {
  if (state.isApprovedByHuman) return "execution";
  if (state.isRejectedByHuman) return "stop";
  return END; // Pause execution awaiting external webhook/API approval
}

export function routeAfterExecution(state: RecoveryGraphState): string {
  if (state.executionStatus === "SUCCESS") return "outcome";
  if (state.retryCount >= 3) return "escalation";
  return "retry";
}

export function routeAfterOutcome(state: RecoveryGraphState): string {
  if (state.paymentStatus === "CAPTURED") return "complete";
  if (state.paymentStatus === "AWAITING_PAYMENT") return "complete"; // Pauses at dynamic payment link stage
  if (state.executionStatus === "SUCCESS") return "complete";
  if (state.retryCount >= 3) return "escalation";
  return "retry";
}

/**
 * 4. Graph Construction & Compilation
 */
export function buildRecoveryGraph() {
  const workflow = new StateGraph(RecoveryAnnotation)
    // Add all 11 explicit nodes
    .addNode("risk", riskNode)
    .addNode("diagnosis", diagnosisNode)
    .addNode("strategy", strategyNode)
    .addNode("policy", policyNode)
    .addNode("humanApproval", humanApprovalNode)
    .addNode("execution", executionNode)
    .addNode("outcome", outcomeNode)
    .addNode("retry", retryNode)
    .addNode("escalation", escalationNode)
    .addNode("stop", stopNode)
    .addNode("complete", completeNode)

    // Flow edges
    .addEdge(START, "risk")
    .addEdge("risk", "diagnosis")
    .addEdge("diagnosis", "strategy")
    .addEdge("strategy", "policy")

    // Conditional branches
    .addConditionalEdges("policy", routeAfterPolicy, {
      execution: "execution",
      humanApproval: "humanApproval",
      stop: "stop",
    })

    .addConditionalEdges("humanApproval", routeAfterHumanApproval, {
      execution: "execution",
      stop: "stop",
      [END]: END,
    })

    .addConditionalEdges("execution", routeAfterExecution, {
      outcome: "outcome",
      retry: "retry",
      escalation: "escalation",
    })

    .addConditionalEdges("outcome", routeAfterOutcome, {
      complete: "complete",
      retry: "retry",
      escalation: "escalation",
    })

    .addEdge("retry", "policy")
    .addEdge("escalation", END)
    .addEdge("stop", END)
    .addEdge("complete", END);

  return workflow.compile({ checkpointer: recoveryCheckpointer });
}

export const recoveryGraph = buildRecoveryGraph();
