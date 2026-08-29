import { RecoveryCase, RecoveryCaseStatus } from "@/types";

export interface CaseActionAvailability {
  // Action capability flags
  canAnalyze: boolean;
  canSelectStrategy: boolean;
  canValidatePolicy: boolean;
  canExecute: boolean;
  canContinueRecovery: boolean;
  canApprove: boolean;
  canReject: boolean;
  canStop: boolean;
  canEscalate: boolean;
  canOpenPayment: boolean;
  canConfirmPayment: boolean;
  isTerminal: boolean;

  // Presentation metadata
  statusLabel: string;
  statusBadgeClass: string;
  statusDescription: string;
  primaryActionLabel?: string;
  primaryActionKey?: "ANALYZE" | "CONTINUE_RECOVERY" | "APPROVE" | "OPEN_PAYMENT" | "NONE";
}

/**
 * Authoritative case action availability engine.
 * Derives allowed UI actions strictly in accordance with RecoveryStateMachine rules.
 */
export function getCaseActionAvailability(
  caseItem: Partial<RecoveryCase> | null | undefined
): CaseActionAvailability {
  if (!caseItem || !caseItem.status) {
    return {
      canAnalyze: false,
      canSelectStrategy: false,
      canValidatePolicy: false,
      canExecute: false,
      canContinueRecovery: false,
      canApprove: false,
      canReject: false,
      canStop: false,
      canEscalate: false,
      canOpenPayment: false,
      canConfirmPayment: false,
      isTerminal: false,
      statusLabel: "UNKNOWN",
      statusBadgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      statusDescription: "Case state unavailable",
      primaryActionKey: "NONE",
    };
  }

  const status = caseItem.status as RecoveryCaseStatus;
  const hasPaymentLink = Boolean(caseItem.paymentLinkUrl);

  switch (status) {
    case "NEW":
    case "OPEN":
      return {
        canAnalyze: true,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: true,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: "NEW",
        statusBadgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        statusDescription: "Payment failure ingested. Ready for AI risk & root cause triage.",
        primaryActionLabel: "Run AI Triage",
        primaryActionKey: "ANALYZE",
      };

    case "ANALYZING":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: "ANALYZING",
        statusBadgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30 animate-pulse",
        statusDescription: "Multi-agent triage in progress (Risk Analysis + Failure Diagnosis)...",
        primaryActionKey: "NONE",
      };

    case "DIAGNOSED":
      return {
        canAnalyze: false,
        canSelectStrategy: true,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: true,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: "DIAGNOSED",
        statusBadgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        statusDescription: `Root cause diagnosed: ${caseItem.rootCause || "Payment failure"}. Formulating recovery strategy.`,
        primaryActionLabel: "Formulate Strategy",
        primaryActionKey: "CONTINUE_RECOVERY",
      };

    case "ACTION_SELECTED":
      return {
        canAnalyze: false, // Strictly blocked: Cannot re-analyze once strategy is selected
        canSelectStrategy: false,
        canValidatePolicy: true,
        canExecute: true,
        canContinueRecovery: true,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false, // Strictly blocked: Payment link has not been generated or paid yet
        isTerminal: false,
        statusLabel: "STRATEGY SELECTED",
        statusBadgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        statusDescription: `Strategy selected (${caseItem.selectedAction || "Dynamic 1-Click Link"}). Ready for policy validation & execution.`,
        primaryActionLabel: "Execute Recovery Strategy",
        primaryActionKey: "CONTINUE_RECOVERY",
      };

    case "AWAITING_APPROVAL":
    case "PENDING_APPROVAL":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: true,
        canReject: true,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: "AWAITING APPROVAL",
        statusBadgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        statusDescription: "Policy gate requires operator approval before proceeding with execution.",
        primaryActionLabel: "Approve Intervention",
        primaryActionKey: "APPROVE",
      };

    case "EXECUTING":
    case "IN_PROGRESS":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: "EXECUTING",
        statusBadgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse",
        statusDescription: "Executing Razorpay recovery intervention (generating payment link)...",
        primaryActionKey: "NONE",
      };

    case "AWAITING_PAYMENT":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false, // Payment link already exists; reuse it without duplicate creation
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: hasPaymentLink,
        canConfirmPayment: true, // Only allowable at AWAITING_PAYMENT in sandbox test mode
        isTerminal: false,
        statusLabel: "AWAITING PAYMENT",
        statusBadgeClass: "bg-amber-500/10 text-amber-300 border-amber-500/30",
        statusDescription: "1-Click Razorpay payment link dispatched to customer. Awaiting payment capture webhook.",
        primaryActionLabel: "Open Razorpay Payment Link",
        primaryActionKey: "OPEN_PAYMENT",
      };

    case "RECOVERED":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: false,
        canEscalate: false,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: true,
        statusLabel: "RECOVERED",
        statusBadgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
        statusDescription: "Revenue recovered and atomically settled in PostgreSQL via Razorpay webhook.",
        primaryActionKey: "NONE",
      };

    case "FAILED":
      return {
        canAnalyze: true, // Re-triage permitted on failure
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: true,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: "FAILED",
        statusBadgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
        statusDescription: "Recovery attempt failed or payment was rejected. Re-triage available.",
        primaryActionLabel: "Re-run AI Triage",
        primaryActionKey: "ANALYZE",
      };

    case "STOPPED":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: false,
        canEscalate: false,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: true,
        statusLabel: "STOPPED",
        statusBadgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        statusDescription: "Recovery stopped by operator. Terminal state.",
        primaryActionKey: "NONE",
      };

    case "EXPIRED":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: false,
        canEscalate: false,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: true,
        statusLabel: "EXPIRED",
        statusBadgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        statusDescription: "Recovery window elapsed. Terminal state.",
        primaryActionKey: "NONE",
      };

    case "ESCALATED":
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: false,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: "ESCALATED",
        statusBadgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        statusDescription: "Case escalated to account management for manual intervention.",
        primaryActionKey: "NONE",
      };

    default:
      return {
        canAnalyze: false,
        canSelectStrategy: false,
        canValidatePolicy: false,
        canExecute: false,
        canContinueRecovery: false,
        canApprove: false,
        canReject: false,
        canStop: true,
        canEscalate: true,
        canOpenPayment: false,
        canConfirmPayment: false,
        isTerminal: false,
        statusLabel: status,
        statusBadgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
        statusDescription: `Case status: ${status}`,
        primaryActionKey: "NONE",
      };
  }
}
