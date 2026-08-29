import { RecoveryCaseStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { auditRepository } from "../repositories/audit.repository";

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: RecoveryCaseStatus,
    public readonly targetStatus: RecoveryCaseStatus,
    public readonly caseId: string
  ) {
    super(
      `Invalid state transition for case ${caseId}: Cannot transition from '${currentStatus}' to '${targetStatus}'.`
    );
    this.name = "InvalidStateTransitionError";
  }
}

/**
 * Strict RecoveryCase State Machine
 * Defines all allowable state transitions and terminal states.
 */
export class RecoveryStateMachine {
  // Allowed transitions map
  private static readonly ALLOWED_TRANSITIONS: Record<RecoveryCaseStatus, RecoveryCaseStatus[]> = {
    NEW: ["ANALYZING", "OPEN", "STOPPED", "ESCALATED"],
    OPEN: ["ANALYZING", "ACTION_SELECTED", "IN_PROGRESS", "STOPPED", "ESCALATED"],
    ANALYZING: ["DIAGNOSED", "FAILED", "STOPPED"],
    DIAGNOSED: ["ACTION_SELECTED", "FAILED", "STOPPED"],
    ACTION_SELECTED: ["AWAITING_APPROVAL", "PENDING_APPROVAL", "EXECUTING", "IN_PROGRESS", "STOPPED", "ESCALATED"],
    AWAITING_APPROVAL: ["EXECUTING", "IN_PROGRESS", "STOPPED", "ESCALATED"],
    PENDING_APPROVAL: ["EXECUTING", "IN_PROGRESS", "STOPPED", "ESCALATED"],
    EXECUTING: ["AWAITING_PAYMENT", "RECOVERED", "FAILED", "STOPPED"],
    IN_PROGRESS: ["AWAITING_PAYMENT", "RECOVERED", "FAILED", "STOPPED", "PENDING_APPROVAL", "AWAITING_APPROVAL"],
    AWAITING_PAYMENT: ["RECOVERED", "FAILED", "EXPIRED", "STOPPED", "ESCALATED"],
    FAILED: ["ACTION_SELECTED", "ESCALATED", "STOPPED", "ANALYZING"],
    ESCALATED: ["ACTION_SELECTED", "EXECUTING", "STOPPED"],
    // Terminal States (No further transitions allowed)
    RECOVERED: [],
    STOPPED: [],
    EXPIRED: [],
  };

  /**
   * Check if a transition is logically valid
   */
  public static isValidTransition(from: RecoveryCaseStatus, to: RecoveryCaseStatus): boolean {
    if (from === to) return true; // Idempotent same-state check
    const allowed = this.ALLOWED_TRANSITIONS[from] || [];
    return allowed.includes(to);
  }

  /**
   * Check if status is a terminal state
   */
  public static isTerminal(status: RecoveryCaseStatus): boolean {
    return status === "RECOVERED" || status === "STOPPED" || status === "EXPIRED";
  }

  /**
   * Transition a RecoveryCase to a new status with validation, persistence, and audit logging
   */
  public async transition(
    caseId: string,
    targetStatus: RecoveryCaseStatus,
    context?: {
      actor?: string;
      reason?: string;
      metadata?: any;
      tx?: any;
    }
  ) {
    const client = context?.tx || prisma;

    const currentCase = await client.recoveryCase.findUnique({
      where: { id: caseId },
    });

    if (!currentCase) {
      throw new Error(`Recovery case ${caseId} not found`);
    }

    if (!RecoveryStateMachine.isValidTransition(currentCase.status, targetStatus)) {
      throw new InvalidStateTransitionError(currentCase.status, targetStatus, caseId);
    }

    // Update case status in database
    const updatedCase = await client.recoveryCase.update({
      where: { id: caseId },
      data: {
        status: targetStatus,
        updatedAt: new Date(),
      },
    });

    // Log audit event
    const actor = context?.actor || "RECOVERY_STATE_MACHINE";
    const reason = context?.reason || `Transitioned from ${currentCase.status} to ${targetStatus}`;

    await client.auditEvent.create({
      data: {
        caseId,
        actor,
        eventType: `STATE_TRANSITION_${targetStatus}`,
        description: reason,
        metadata: {
          fromStatus: currentCase.status,
          toStatus: targetStatus,
          ...(context?.metadata || {}),
        },
      },
    });

    return updatedCase;
  }
}

export const stateMachineService = new RecoveryStateMachine();
