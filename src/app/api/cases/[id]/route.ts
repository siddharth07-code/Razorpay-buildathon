import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db/repository";
import { recoveryOrchestrator } from "../../../../../backend/src/services/orchestrator.service";
import { prisma } from "../../../../../backend/src/config/prisma";
import { fromPaise, serializeBigInt } from "../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Try fetching from Supabase PostgreSQL via Prisma
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        payment: true,
        recoveryAttempts: { orderBy: { createdAt: "desc" } },
        agentDecisions: { orderBy: { createdAt: "desc" } },
        auditEvents: { orderBy: { timestamp: "desc" } },
      },
    });

    if (recCase) {
      // Map PostgreSQL case to frontend type
      const adapted = {
        id: recCase.id,
        caseNumber: recCase.caseNumber,
        customerId: recCase.customerId,
        paymentId: recCase.paymentId || undefined,
        razorpayPaymentId: recCase.razorpayPaymentId || undefined,
        amount: fromPaise(recCase.amountAtRisk),
        recoverableAmount: fromPaise(recCase.recoverableAmount),
        recoveredAmount: fromPaise(recCase.recoveredAmount),
        currency: recCase.currency,
        status: recCase.status,
        riskLevel: recCase.riskLevel,
        riskScore: recCase.riskScore,
        recoverabilityScore: recCase.recoverabilityScore,
        expectedRecoveryValue: fromPaise(recCase.expectedRecoveryValue),
        priority: recCase.priority,
        rootCause: recCase.rootCause,
        rootCauseDetails: recCase.rootCauseDetails,
        recommendedAction: recCase.recommendedAction,
        selectedAction: recCase.selectedAction || undefined,
        currentStep: recCase.currentStep,
        retryCount: recCase.retryCount,
        contactCount: recCase.contactCount,
        actionsTakenCount: recCase.actionsTakenCount,
        requiresHumanApproval: recCase.requiresHumanApproval,
        paymentLinkUrl: recCase.paymentLinkUrl || undefined,
        createdAt: recCase.createdAt.toISOString(),
        updatedAt: recCase.updatedAt.toISOString(),
        recoveredAt: recCase.recoveredAt?.toISOString(),
        customer: recCase.customer ? {
          ...recCase.customer,
          lifetimeValue: fromPaise(recCase.customer.lifetimeValue),
          recoveredAmount: fromPaise(recCase.customer.recoveredAmount),
          createdAt: recCase.customer.createdAt.toISOString(),
          updatedAt: recCase.customer.updatedAt.toISOString(),
        } : undefined,
        payment: recCase.payment ? {
          ...recCase.payment,
          amount: fromPaise(recCase.payment.amount),
          lastAttemptAt: recCase.payment.lastAttemptAt?.toISOString(),
          createdAt: recCase.payment.createdAt.toISOString(),
          updatedAt: recCase.payment.updatedAt.toISOString(),
        } : undefined,
        recoveryAttempts: recCase.recoveryAttempts.map(a => ({
          ...a,
          amount: fromPaise(a.amount),
          createdAt: a.createdAt.toISOString(),
        })),
        auditEvents: recCase.auditEvents.map(e => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
        agentDecisions: recCase.agentDecisions.map(d => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        })),
        timeline: recCase.auditEvents.length > 0
          ? recCase.auditEvents.map(e => ({
              id: e.id,
              timestamp: e.timestamp.toISOString(),
              title: e.eventType ? e.eventType.replace(/_/g, " ") : "AUDIT_EVENT",
              description: e.description || `${e.eventType} executed by ${e.actor}`,
              type: (e.eventType as any) || "ACTION_EXECUTED",
              actor: (e.actor as any) || "SYSTEM",
              metadata: typeof e.metadata === "object" ? (e.metadata as Record<string, any>) : undefined,
            }))
          : [],
      };

      return NextResponse.json(serializeBigInt(adapted));
    }
  } catch (err) {
    console.warn("[API /cases/id] PostgreSQL lookup fallback:", err);
  }

  // Fallback to local memory repository
  const fallbackCase = repository.getRecoveryCaseById(params.id);
  if (!fallbackCase) {
    return NextResponse.json({ error: "Case not found" }, { status: 404 });
  }
  return NextResponse.json(fallbackCase);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, forceExecute } = body;
    const caseId = params.id;

    // Check if case exists in PostgreSQL
    const dbCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
    });

    if (dbCase) {
      if (dbCase.status === "RECOVERED" || dbCase.status === "STOPPED" || dbCase.status === "EXPIRED") {
        if (action === "MARK_RESOLVED") {
          return NextResponse.json(serializeBigInt({
            success: true,
            alreadyRecovered: true,
            status: dbCase.status,
            caseNumber: dbCase.caseNumber,
            message: `Recovery case is already in terminal state '${dbCase.status}'.`,
          }), { status: 200 });
        }

        return NextResponse.json(serializeBigInt({
          error: "CASE_ALREADY_TERMINAL",
          status: dbCase.status,
          message: `Recovery case is already in terminal state '${dbCase.status}'; no further action is required.`,
        }), { status: 409 });
      }

      if (dbCase.status === "AWAITING_PAYMENT") {
        if (action === "ANALYZE" || action === "SELECT_STRATEGY" || action === "VALIDATE_POLICY") {
          return NextResponse.json(serializeBigInt({
            error: "INVALID_CASE_ACTION",
            status: "AWAITING_PAYMENT",
            message: "Case has already progressed to payment and cannot restart analysis.",
          }), { status: 409 });
        }

        if (action === "EXECUTE_ACTION" || action === "SEND_PAYMENT_LINK" || action === "TRIGGER_RETRY") {
          if (dbCase.paymentLinkUrl && !forceExecute) {
            return NextResponse.json(serializeBigInt({
              success: true,
              paymentLinkUrl: dbCase.paymentLinkUrl,
              alreadyAwaitingPayment: true,
              message: "1-Click Razorpay payment link is already active and awaiting customer payment.",
            }), { status: 200 });
          }
        }
      }

      if (dbCase.status === "ACTION_SELECTED") {
        if (action === "ANALYZE") {
          return NextResponse.json(serializeBigInt({
            error: "INVALID_CASE_ACTION",
            status: "ACTION_SELECTED",
            message: "Case has already completed analysis and selected a recovery strategy.",
          }), { status: 409 });
        }

        if (action === "MARK_RESOLVED") {
          return NextResponse.json(serializeBigInt({
            error: "PREMATURE_PAYMENT_CONFIRMATION",
            status: "ACTION_SELECTED",
            message: "Cannot confirm payment for a case that has not generated an active payment link or reached AWAITING_PAYMENT.",
          }), { status: 409 });
        }
      }

      if (dbCase.status === "NEW" || dbCase.status === "OPEN" || dbCase.status === "ANALYZING" || dbCase.status === "DIAGNOSED") {
        if (action === "MARK_RESOLVED") {
          return NextResponse.json(serializeBigInt({
            error: "PREMATURE_PAYMENT_CONFIRMATION",
            status: dbCase.status,
            message: "Cannot confirm payment before recovery strategy formulation and execution.",
          }), { status: 409 });
        }
      }

      if (dbCase.status === "AWAITING_APPROVAL" || dbCase.status === "PENDING_APPROVAL") {
        if (action === "ANALYZE" || action === "MARK_RESOLVED") {
          return NextResponse.json(serializeBigInt({
            error: "INVALID_CASE_ACTION",
            status: dbCase.status,
            message: "Case is awaiting human approval and cannot perform this action.",
          }), { status: 409 });
        }
      }

      if (action === "ANALYZE") {
        const result = await recoveryOrchestrator.analyzeCase(caseId);
        return NextResponse.json(serializeBigInt({ success: true, result, message: "AI Risk & Root Cause analysis complete." }));
      }

      if (action === "SELECT_STRATEGY") {
        const result = await recoveryOrchestrator.selectRecoveryAction(caseId);
        return NextResponse.json(serializeBigInt({ success: true, result, message: "Recovery strategy formulated." }));
      }

      if (action === "VALIDATE_POLICY") {
        const result = await recoveryOrchestrator.validatePolicy(caseId);
        return NextResponse.json(serializeBigInt({ success: true, result, message: "Policy check completed." }));
      }

      if (action === "EXECUTE_ACTION" || action === "SEND_PAYMENT_LINK" || action === "TRIGGER_RETRY" || action === "CONTINUE_RECOVERY") {
        const result = await recoveryOrchestrator.executeRecoveryAction(caseId, { forceExecute: true });
        return NextResponse.json(serializeBigInt({ success: true, result, message: result.message }));
      }

      if (action === "MARK_RESOLVED") {
        const result = await recoveryOrchestrator.completeRecovery(caseId);
        return NextResponse.json(serializeBigInt({ success: true, result, message: "Recovery confirmed and marked captured." }));
      }

      if (action === "STOP_RECOVERY") {
        const result = await recoveryOrchestrator.stopRecovery(caseId, body.reason || "Halted from dashboard");
        return NextResponse.json(serializeBigInt({ success: true, result, message: "Recovery halted." }));
      }

      if (action === "ESCALATE_RECOVERY") {
        const result = await recoveryOrchestrator.escalateRecovery(caseId, body.reason || "Escalated to human supervisor");
        return NextResponse.json(serializeBigInt({ success: true, result, message: "Recovery escalated to human supervisor." }));
      }
    }

    // Memory fallback
    const currentCase = repository.getRecoveryCaseById(caseId);
    if (!currentCase) {
      return NextResponse.json({ error: "Recovery case not found" }, { status: 404 });
    }

    if (action === "MARK_RESOLVED") {
      const updated = repository.markCaseRecovered(currentCase.id, currentCase.amount);
      return NextResponse.json(serializeBigInt({ success: true, message: "Case marked recovered", case: updated }));
    }

    return NextResponse.json(serializeBigInt({ success: true, message: `Action ${action} executed successfully` }));
  } catch (err: any) {
    console.error("[API POST /cases/id Error]:", err);
    const isStateConflict = err?.name === "InvalidStateTransitionError" || err?.message?.includes("Invalid state transition");
    return NextResponse.json(
      {
        error: isStateConflict ? "INVALID_STATE_TRANSITION" : "ACTION_FAILED",
        message: err?.message || "Failed to process case action",
      },
      { status: isStateConflict ? 409 : 500 }
    );
  }
}
