import { recoveryGraph, RecoveryGraphState } from "../workflows/recovery.graph";
import { prisma } from "../config/prisma";
import { recoveryOrchestrator as legacyOrchestrator } from "./orchestrator.service";
import { serializeBigInt } from "../utils/money";
import { eventService } from "./event.service";
import { RecoveryStateMachine } from "./state-machine.service";

export type OrchestrationEngine = "langgraph" | "legacy";

export class LangGraphRecoveryOrchestrator {
  private engine: OrchestrationEngine = (process.env.RECOVERY_ORCHESTRATION_ENGINE as OrchestrationEngine) || "langgraph";

  public getEngine(): OrchestrationEngine {
    return this.engine;
  }

  public setEngine(engine: OrchestrationEngine) {
    this.engine = engine;
  }

  /**
   * Run or initialize the recovery workflow for a given recovery case
   */
  public async runRecoveryWorkflow(caseId: string): Promise<any> {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: {
        customer: true,
        payment: true,
        subscription: true,
        order: true,
        invoice: {
          include: { promiseToPays: true },
        },
      },
    });

    if (!recCase) {
      throw new Error(`Recovery case ${caseId} not found`);
    }

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      return {
        caseId: recCase.id,
        caseNumber: recCase.caseNumber,
        status: recCase.status,
        alreadyTerminal: true,
        message: `Recovery case is already in terminal state '${recCase.status}'. No further workflow execution required.`,
      };
    }

    if (this.engine === "legacy") {
      // Legacy fallback
      await legacyOrchestrator.analyzeCase(caseId);
      await legacyOrchestrator.selectRecoveryAction(caseId);
      const policy = await legacyOrchestrator.validatePolicy(caseId);
      if (!policy.requiresHumanApproval && policy.allowed) {
        await legacyOrchestrator.executeRecoveryAction(caseId);
      }
      return await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    }

    // LangGraph Orchestration Execution
    const threadId = `recovery-case:${caseId}`;

    await eventService.publishEvent({
      caseId: recCase.id,
      caseNumber: recCase.caseNumber,
      type: "RECOVERY_STARTED",
      actor: "LANGGRAPH_ORCHESTRATOR",
      status: "running",
      description: `LangGraph StateGraph initialized for case ${recCase.caseNumber} [thread_id: ${threadId}]`,
    });

    const isSub = Boolean(recCase.subscriptionId || recCase.razorpaySubscriptionId);
    const isCheckout = Boolean(recCase.orderId || recCase.razorpayOrderId || recCase.rootCause === "checkout_abandonment");
    const isInvoice = Boolean(recCase.invoiceId || recCase.razorpayInvoiceId || recCase.caseNumber.startsWith("REC-INV") || recCase.rootCause === "overdue_invoice");
    const hasBrokenPromise = Boolean(
      recCase.invoice?.promiseToPays?.some((p) => p.status === "BROKEN") ||
      recCase.rootCauseDetails?.toLowerCase().includes("broken promise") ||
      recCase.rootCauseDetails?.toLowerCase().includes("missed promise") ||
      recCase.rootCause === "missed_promise_to_pay"
    );
    const checkoutAge = recCase.order?.createdAt
      ? Math.round((Date.now() - recCase.order.createdAt.getTime()) / 60000)
      : 30;
    const daysOverdue = recCase.invoice?.dueDate
      ? Math.max(1, Math.floor((Date.now() - recCase.invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    const initialState: Partial<RecoveryGraphState> = {
      caseId: recCase.id,
      caseNumber: recCase.caseNumber,
      customerId: recCase.customerId,
      paymentId: recCase.paymentId || undefined,
      orderId: recCase.orderId || undefined,
      razorpayOrderId: recCase.razorpayOrderId || undefined,
      checkoutSessionId: recCase.orderId || undefined,
      checkoutAgeMinutes: isCheckout ? checkoutAge : undefined,
      subscriptionId: recCase.subscriptionId || undefined,
      razorpaySubscriptionId: recCase.razorpaySubscriptionId || undefined,
      invoiceId: recCase.invoiceId || undefined,
      razorpayInvoiceId: recCase.razorpayInvoiceId || undefined,
      daysOverdue: isInvoice ? daysOverdue : undefined,
      isPromiseToPay: hasBrokenPromise,
      revenueSource: isInvoice ? "INVOICE" : isSub ? "SUBSCRIPTION" : isCheckout ? "CHECKOUT" : "PAYMENT",
      subscriptionStatus: recCase.subscription?.status || undefined,
      amountAtRiskPaise: recCase.amountAtRisk,
      recoverableAmountPaise: recCase.recoverableAmount,
      recoveredAmountPaise: recCase.recoveredAmount,
      retryCount: recCase.retryCount || 0,
      currentNode: "START",
    };

    const finalState = await recoveryGraph.invoke(initialState, {
      configurable: { thread_id: threadId },
    });

    return serializeBigInt({
      caseId: recCase.id,
      caseNumber: recCase.caseNumber,
      threadId,
      status: finalState.paymentStatus || finalState.executionStatus || "IN_PROGRESS",
      currentNode: finalState.currentNode,
      state: {
        riskScore: finalState.riskScore,
        recoverabilityScore: finalState.recoverabilityScore,
        rootCause: finalState.rootCause,
        selectedAction: finalState.selectedAction,
        policyDecision: finalState.policyDecision,
        requiresHumanApproval: finalState.requiresHumanApproval,
        paymentLinkUrl: finalState.paymentLinkUrl,
        executionStatus: finalState.executionStatus,
      },
    });
  }

  /**
   * Resume an interrupted LangGraph workflow (e.g. after Human Approval)
   */
  public async resumeWorkflow(
    caseId: string,
    params: { approved: boolean; operator?: string; reason?: string }
  ): Promise<any> {
    const threadId = `recovery-case:${caseId}`;
    const { approved, operator = "OPERATIONS_MANAGER" } = params;

    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
    });

    if (!recCase) throw new Error(`Recovery case ${caseId} not found`);

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      return {
        caseId: recCase.id,
        caseNumber: recCase.caseNumber,
        status: recCase.status,
        alreadyTerminal: true,
        message: `Recovery case is already in terminal state '${recCase.status}'. No further workflow execution required.`,
      };
    }

    if (this.engine === "legacy") {
      if (approved) {
        await legacyOrchestrator.executeRecoveryAction(caseId, {
          forceExecute: true,
          actor: operator,
        });
      } else {
        await legacyOrchestrator.stopRecovery(caseId, "Rejected by operations manager");
      }
      return await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    }

    const resumeState: Partial<RecoveryGraphState> = {
      caseId: recCase.id,
      caseNumber: recCase.caseNumber,
      customerId: recCase.customerId,
      amountAtRiskPaise: recCase.amountAtRisk,
      recoverableAmountPaise: recCase.recoverableAmount,
      recoveredAmountPaise: recCase.recoveredAmount,
      isApprovedByHuman: approved,
      isRejectedByHuman: !approved,
      humanOperator: operator,
      requiresHumanApproval: false,
    };

    const result = await recoveryGraph.invoke(resumeState, {
      configurable: { thread_id: threadId },
    });

    return serializeBigInt({
      caseId,
      threadId,
      resumed: true,
      currentNode: result.currentNode,
      paymentLinkUrl: result.paymentLinkUrl,
      executionStatus: result.executionStatus,
    });
  }

  /**
   * Retrieve the safe snapshot of the LangGraph workflow state
   */
  public async getWorkflowState(caseId: string): Promise<any> {
    const threadId = `recovery-case:${caseId}`;
    try {
      const state = await recoveryGraph.getState({
        configurable: { thread_id: threadId },
      });

      return serializeBigInt({
        caseId,
        threadId,
        values: state.values,
        next: state.next,
      });
    } catch {
      // Return DB state fallback if graph checkpoint not found
      const recCase = await prisma.recoveryCase.findUnique({
        where: { id: caseId },
      });

      return serializeBigInt({
        caseId,
        threadId,
        values: {
          caseNumber: recCase?.caseNumber,
          status: recCase?.status,
          requiresHumanApproval: recCase?.requiresHumanApproval,
          paymentLinkUrl: recCase?.paymentLinkUrl,
          currentNode: recCase?.currentStep || "risk",
        },
        next: [],
      });
    }
  }

  /**
   * Return the static graph topology structure for visualization
   */
  public getGraphTopology() {
    return {
      nodes: [
        { id: "START", label: "Recovery Event Trigger", type: "entry", layer: 0 },
        { id: "risk", label: "Risk Scoring Agent", type: "agent", layer: 1 },
        { id: "diagnosis", label: "Root Cause Diagnosis AI", type: "agent", layer: 2 },
        { id: "strategy", label: "Recovery Strategy Agent", type: "agent", layer: 3 },
        { id: "policy", label: "Deterministic Policy Engine", type: "guardrail", layer: 4 },
        { id: "humanApproval", label: "Human-in-the-Loop Approval", type: "interrupt", layer: 5 },
        { id: "execution", label: "Razorpay Execution Boundary", type: "action", layer: 6 },
        { id: "outcome", label: "Outcome Verification Service", type: "evaluation", layer: 7 },
        { id: "retry", label: "Bounded Retry Scheduler", type: "loop", layer: 4 },
        { id: "escalation", label: "Operations Escalation Queue", type: "terminal", layer: 8 },
        { id: "stop", label: "Safe Recovery Halt", type: "terminal", layer: 8 },
        { id: "complete", label: "Recovery Finalized", type: "success", layer: 8 },
      ],
      edges: [
        { from: "START", to: "risk", label: "Ingest failure" },
        { from: "risk", to: "diagnosis", label: "Score evaluated" },
        { from: "diagnosis", to: "strategy", label: "Root cause classified" },
        { from: "strategy", to: "policy", label: "Action proposed" },
        { from: "policy", to: "execution", label: "Policy Approved" },
        { from: "policy", to: "humanApproval", label: ">= ₹1,00,000 threshold" },
        { from: "policy", to: "stop", label: "Policy Blocked" },
        { from: "humanApproval", to: "execution", label: "Operator Approved" },
        { from: "humanApproval", to: "stop", label: "Operator Rejected" },
        { from: "execution", to: "outcome", label: "Dispatched to Razorpay" },
        { from: "execution", to: "retry", label: "Execution Failed" },
        { from: "outcome", to: "complete", label: "Payment Captured" },
        { from: "outcome", to: "retry", label: "Payment Unsettled" },
        { from: "retry", to: "policy", label: "Re-evaluate Policy (< 3 attempts)" },
        { from: "retry", to: "escalation", label: "Max Attempts Reached (>= 3)" },
      ],
    };
  }
}

export const langGraphOrchestrator = new LangGraphRecoveryOrchestrator();
