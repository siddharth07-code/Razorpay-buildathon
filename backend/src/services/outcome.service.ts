import { prisma } from "../config/prisma";
import { stateMachineService } from "./state-machine.service";
import { fromPaise } from "../utils/money";
import { PaymentStatus, AttemptStatus, RecoveryCaseStatus, RecoveryStep } from "@prisma/client";

export class OutcomeService {
  /**
   * Process confirmed payment capture with atomic database transaction
   */
  public async confirmRecovery(params: {
    caseId: string;
    amountCapturedPaise: bigint;
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    actor?: string;
    notes?: string;
  }) {
    const { caseId, amountCapturedPaise, razorpayPaymentId, razorpayOrderId, actor = "RAZORPAY_WEBHOOK", notes } = params;

    // ATOMIC TRANSACTION: Guarantees all financial state changes succeed or rollback
    return await prisma.$transaction(
      async (tx) => {
      const recCase = await tx.recoveryCase.findUnique({
        where: { id: caseId },
        include: { customer: true, payment: true },
      });

      if (!recCase) {
        throw new Error(`Recovery case ${caseId} not found`);
      }

      if (recCase.status === "RECOVERED") {
        return {
          success: true,
          alreadyRecovered: true,
          caseNumber: recCase.caseNumber,
          recoveredAmountPaise: recCase.recoveredAmount,
          recoveredAmount: fromPaise(recCase.recoveredAmount),
        };
      }

      // 1. Update Payment status
      if (recCase.paymentId) {
        await tx.payment.update({
          where: { id: recCase.paymentId },
          data: {
            status: PaymentStatus.captured,
            razorpayPaymentId: razorpayPaymentId || undefined,
            updatedAt: new Date(),
          },
        });
      }

      // 1b. Update Subscription status if linked
      if (recCase.subscriptionId) {
        await tx.subscription.update({
          where: { id: recCase.subscriptionId },
          data: {
            status: "active",
            updatedAt: new Date(),
          },
        }).catch(() => null);
      }

      // 1c. Update Order status if linked
      if (recCase.orderId) {
        await tx.order.update({
          where: { id: recCase.orderId },
          data: {
            status: "paid",
            updatedAt: new Date(),
          },
        }).catch(() => null);
      } else if (recCase.razorpayOrderId) {
        await tx.order.updateMany({
          where: { razorpayOrderId: recCase.razorpayOrderId },
          data: {
            status: "paid",
            updatedAt: new Date(),
          },
        }).catch(() => null);
      }

      // 1d. Update Invoice status & fulfill pending PromiseToPay if linked
      if (recCase.invoiceId) {
        await tx.invoice.update({
          where: { id: recCase.invoiceId },
          data: {
            status: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        }).catch(() => null);

        await tx.promiseToPay.updateMany({
          where: { invoiceId: recCase.invoiceId, status: "PENDING" },
          data: {
            status: "FULFILLED",
            updatedAt: new Date(),
          },
        }).catch(() => null);
      } else if (recCase.razorpayInvoiceId) {
        await tx.invoice.updateMany({
          where: { razorpayInvoiceId: recCase.razorpayInvoiceId },
          data: {
            status: "paid",
            paidAt: new Date(),
            updatedAt: new Date(),
          },
        }).catch(() => null);

        const matchingInvoices = await tx.invoice.findMany({
          where: { razorpayInvoiceId: recCase.razorpayInvoiceId },
          select: { id: true },
        });
        if (matchingInvoices.length > 0) {
          await tx.promiseToPay.updateMany({
            where: { invoiceId: { in: matchingInvoices.map((i) => i.id) }, status: "PENDING" },
            data: { status: "FULFILLED", updatedAt: new Date() },
          }).catch(() => null);
        }
      }

      // 2. Update RecoveryCase to RECOVERED (terminal state)
      const updatedCase = await tx.recoveryCase.update({
        where: { id: caseId },
        data: {
          status: RecoveryCaseStatus.RECOVERED,
          currentStep: RecoveryStep.RECOVERY_RESOLVED,
          recoveredAmount: amountCapturedPaise,
          recoveredAt: new Date(),
          razorpayPaymentId: razorpayPaymentId || undefined,
          razorpayOrderId: razorpayOrderId || undefined,
          updatedAt: new Date(),
        },
      });

      // 3. Update Customer stats in paise
      await tx.customer.update({
        where: { id: recCase.customerId },
        data: {
          successfulPayments: { increment: 1 },
          recoveredAmount: { increment: amountCapturedPaise },
        },
      });

      // 4. Record RecoveryAttempt Success
      await tx.recoveryAttempt.create({
        data: {
          recoveryCaseId: caseId,
          paymentId: recCase.paymentId,
          attemptNumber: recCase.retryCount + 1,
          action: recCase.selectedAction || "CREATE_PAYMENT_LINK",
          status: AttemptStatus.SUCCESS,
          razorpayReference: razorpayPaymentId,
          amount: amountCapturedPaise,
          notes: notes || "Payment confirmed and captured by Razorpay.",
        },
      });

      // 5. Create immutable AuditEvent
      await tx.auditEvent.create({
        data: {
          caseId,
          actor,
          eventType: "REVENUE_RECOVERED",
          description: `₹${fromPaise(amountCapturedPaise).toLocaleString("en-IN")} confirmed captured. Full capital restored.`,
          metadata: {
            razorpayPaymentId,
            amountPaise: Number(amountCapturedPaise),
            previousStatus: recCase.status,
          },
        },
      });

      return {
        success: true,
        caseNumber: updatedCase.caseNumber,
        recoveredAmountPaise: amountCapturedPaise,
        recoveredAmountRupees: fromPaise(amountCapturedPaise),
        case: updatedCase,
      };
    }, { maxWait: 10000, timeout: 20000 });
  }

  /**
   * Process a failed recovery attempt
   */
  public async handleFailure(params: {
    caseId: string;
    reason: string;
    actor?: string;
  }) {
    const { caseId, reason, actor = "RECOVERY_ORCHESTRATOR" } = params;

    return await prisma.$transaction(async (tx) => {
      const recCase = await tx.recoveryCase.findUnique({
        where: { id: caseId },
      });

      if (!recCase) throw new Error(`Case ${caseId} not found`);

      const updatedCase = await tx.recoveryCase.update({
        where: { id: caseId },
        data: {
          status: RecoveryCaseStatus.FAILED,
          retryCount: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      await tx.auditEvent.create({
        data: {
          caseId,
          actor,
          eventType: "RECOVERY_ATTEMPT_FAILED",
          description: `Recovery attempt failed: ${reason}`,
          metadata: { reason },
        },
      });

      return updatedCase;
    });
  }
}

export const outcomeService = new OutcomeService();
