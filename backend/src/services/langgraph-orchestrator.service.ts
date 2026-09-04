import {
  recoveryWorkflowGraph,
  RecoveryWorkflowState,
} from "../../../src/lib/langgraph/recovery-graph";
import { Command } from "@langchain/langgraph";
import { prisma } from "../config/prisma";
import { recoveryOrchestrator as legacyOrchestrator } from "./orchestrator.service";
import { serializeBigInt, fromPaise } from "../utils/money";
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
    // Stable thread ID: caseId
    const threadId = caseId;

    const daysOverdue = recCase.invoice?.dueDate
      ? Math.max(0, Math.floor((Date.now() - recCase.invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    const customerTenureDays = recCase.customer?.createdAt
      ? Math.max(1, Math.floor((Date.now() - recCase.customer.createdAt.getTime()) / (1000 * 60 * 60 * 24)))
      : 30;

    const initialState: Partial<RecoveryWorkflowState> = {
      caseId: recCase.id,
      caseNumber: recCase.caseNumber,
      customerId: recCase.customerId,
      paymentId: recCase.paymentId || undefined,
      orderId: recCase.orderId || undefined,
      subscriptionId: recCase.subscriptionId || undefined,
      invoiceId: recCase.invoiceId || undefined,
      amountAtRiskPaise: recCase.amountAtRisk,
      customerLTVPaise: recCase.customer?.lifetimeValue || 0n,
      failureType: recCase.payment?.errorCode || "AUTHENTICATION_FAILURE",
      paymentMethod: (recCase.payment?.method || "CARD").toUpperCase(),
      daysOverdue,
      previousSuccessfulPayments: recCase.customer?.successfulPayments || 0,
      previousRecoveryAttempts: recCase.retryCount || 0,
      customerTenureDays,
      retryCount: recCase.retryCount || 0,
      currentStage: "detect",
    };

    const finalState: any = await recoveryWorkflowGraph.invoke(initialState, {
      configurable: { thread_id: threadId },
    });

    const isInterrupted = Boolean(finalState.__interrupt__ && finalState.__interrupt__.length > 0);
    const interruptPayload = isInterrupted ? finalState.__interrupt__[0]?.value : null;

    const updatedCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
    });

    return serializeBigInt({
      caseId: recCase.id,
      caseNumber: recCase.caseNumber,
      threadId,
      status: updatedCase?.status || finalState.paymentStatus || finalState.executionStatus || "IN_PROGRESS",
      currentStage: finalState.currentStage,
      isInterrupted,
      requiresHumanApproval: finalState.requiresApproval || isInterrupted,
      interruptDetails: interruptPayload,
      state: {
        recoveryProbability: finalState.riskProbability,
        recoverabilityScore: finalState.recoverabilityScore,
        priority: finalState.priority,
        rootCause: finalState.rootCause,
        selectedStrategy: finalState.selectedStrategy,
        requiresHumanApproval: finalState.requiresApproval || isInterrupted,
        approvalStatus: finalState.approvalStatus,
        policyReason: finalState.policyReason,
        paymentLinkUrl: finalState.paymentLinkUrl || updatedCase?.paymentLinkUrl,
        executionStatus: finalState.executionStatus,
        paymentStatus: finalState.paymentStatus,
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
    const threadId = caseId;
    const { approved, operator = "OPERATIONS_MANAGER", reason } = params;

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
        await legacyOrchestrator.stopRecovery(caseId, reason || "Rejected by operations manager");
      }
      return await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    }

    // Resume using official LangGraph Command({ resume: ... })
    const resumeCommand = new Command({
      resume: {
        approved,
        operator,
        reason: reason || (approved ? "Authorized via dashboard" : "Rejected via dashboard"),
      },
    });

    const result: any = await recoveryWorkflowGraph.invoke(resumeCommand as any, {
      configurable: { thread_id: threadId },
    });

    const updatedCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
    });

    return serializeBigInt({
      caseId,
      threadId,
      resumed: true,
      status: updatedCase?.status,
      currentStage: result.currentStage,
      paymentLinkUrl: result.paymentLinkUrl || updatedCase?.paymentLinkUrl,
      executionStatus: result.executionStatus,
      paymentStatus: result.paymentStatus,
    });
  }

  /**
   * Retrieve the safe snapshot of the LangGraph workflow state
   */
  public async getWorkflowState(caseId: string): Promise<any> {
    const threadId = caseId;
    try {
      const state = await recoveryWorkflowGraph.getState({
        configurable: { thread_id: threadId },
      });

      const values: any = state.values || {};
      const isInterrupted = Boolean(state.tasks && state.tasks.some((t: any) => t.interrupts && t.interrupts.length > 0));

      return serializeBigInt({
        caseId,
        threadId,
        values: {
          caseNumber: values.caseNumber,
          currentStage: values.currentStage,
          riskProbability: values.riskProbability,
          recoverabilityScore: values.recoverabilityScore,
          priority: values.priority,
          rootCause: values.rootCause,
          selectedStrategy: values.selectedStrategy,
          requiresHumanApproval: values.requiresApproval || isInterrupted,
          approvalStatus: values.approvalStatus,
          policyReason: values.policyReason,
          paymentLinkUrl: values.paymentLinkUrl,
          executionStatus: values.executionStatus,
          paymentStatus: values.paymentStatus,
          isInterrupted,
        },
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
          currentStage: recCase?.currentStep || "riskScore",
          requiresHumanApproval: recCase?.requiresHumanApproval,
          paymentLinkUrl: recCase?.paymentLinkUrl,
        },
        next: [],
      });
    }
  }

  /**
   * Return the 11-node graph topology structure for visualization
   */
  public getGraphTopology() {
    return {
      nodes: [
        { id: "START", label: "Recovery Ingestion", type: "entry", layer: 0 },
        { id: "detect", label: "Case Ingestion & Telemetry", type: "detection", layer: 1 },
        { id: "riskScore", label: "Supervised ML Risk & Recoverability", type: "ml_model", layer: 2 },
        { id: "diagnose", label: "Root Cause Diagnosis", type: "agent", layer: 3 },
        { id: "strategy", label: "Strategy Formulation", type: "agent", layer: 4 },
        { id: "policy", label: "Deterministic Policy Gate (₹1L Threshold)", type: "guardrail", layer: 5 },
        { id: "humanApproval", label: "Human-in-the-Loop Approval (Interrupt)", type: "interrupt", layer: 6 },
        { id: "execute", label: "Razorpay TEST Execution Boundary", type: "action", layer: 7 },
        { id: "outcome", label: "PostgreSQL Outcome Verification", type: "evaluation", layer: 8 },
        { id: "retry", label: "Bounded Retry Scheduler (Max 3)", type: "loop", layer: 5 },
        { id: "escalate", label: "Operations Escalation Queue", type: "terminal", layer: 9 },
        { id: "complete", label: "Recovery Settled & Finalized", type: "success", layer: 9 },
      ],
      edges: [
        { from: "START", to: "detect", label: "Ingest failure" },
        { from: "detect", to: "riskScore", label: "Telemetry extracted" },
        { from: "riskScore", to: "diagnose", label: "ML score evaluated" },
        { from: "diagnose", to: "strategy", label: "Root cause diagnosed" },
        { from: "strategy", to: "policy", label: "Intervention proposed" },
        { from: "policy", to: "execute", label: "Auto-Approved (< ₹1,00,000)" },
        { from: "policy", to: "humanApproval", label: "Human Required (≥ ₹1,00,000)" },
        { from: "policy", to: "escalate", label: "Policy Blocked" },
        { from: "humanApproval", to: "execute", label: "Operator Approved" },
        { from: "humanApproval", to: "escalate", label: "Operator Rejected" },
        { from: "execute", to: "outcome", label: "Dispatched to Razorpay" },
        { from: "outcome", to: "complete", label: "Payment Captured / Active Link" },
        { from: "outcome", to: "retry", label: "Failed (< 3 attempts)" },
        { from: "outcome", to: "escalate", label: "Failed (≥ 3 attempts)" },
        { from: "retry", to: "execute", label: "Re-execute" },
        { from: "retry", to: "escalate", label: "Max attempts reached" },
        { from: "complete", to: "END", label: "Settled" },
        { from: "escalate", to: "END", label: "Escalated" },
      ],
    };
  }
}

export const langGraphOrchestrator = new LangGraphRecoveryOrchestrator();
