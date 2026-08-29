import { prisma } from "../config/prisma";
import { config } from "../config";
import { langGraphOrchestrator } from "./langgraph-orchestrator.service";
import { eventService } from "./event.service";
import { fromPaise } from "../utils/money";

export interface AbandonmentScanOptions {
  windowMinutes?: number;
  limit?: number;
}

export interface AbandonmentScanResult {
  success: boolean;
  windowMinutes: number;
  scannedCount: number;
  abandonedCount: number;
  casesCreatedCount: number;
  cases: Array<{
    caseId: string;
    caseNumber: string;
    orderId: string;
    razorpayOrderId: string;
    amountPaise: string;
    amountINR: number;
    customerEmail: string;
    status: string;
  }>;
}

export class AbandonmentService {
  /**
   * Scans for unpaid checkout orders past the abandonment window and initiates multi-agent recovery.
   * Authoritative, idempotent backend detection.
   */
  public async scanAndRecoverAbandonedCheckouts(options?: AbandonmentScanOptions): Promise<AbandonmentScanResult> {
    const windowMinutes = options?.windowMinutes ?? config.policy.checkoutAbandonmentWindowMinutes ?? 30;
    const limit = options?.limit ?? 50;

    const cutoffTime = new Date(Date.now() - windowMinutes * 60 * 1000);

    // Emit scan started event
    await eventService.publishEvent({
      type: "CHECKOUT_ABANDONMENT_SCAN_STARTED",
      actor: "ABANDONMENT_DETECTOR",
      status: "running",
      description: `Initiated checkout abandonment scan with ${windowMinutes}m window.`,
      metadata: { windowMinutes, cutoffTime: cutoffTime.toISOString() },
    });

    // 1. Query candidate unpaid orders older than the abandonment window
    const candidateOrders = await prisma.order.findMany({
      where: {
        createdAt: { lte: cutoffTime },
        status: { not: "paid" },
      },
      include: {
        customer: true,
        payments: true,
        recoveryCases: {
          where: {
            status: { notIn: ["RECOVERED", "STOPPED", "EXPIRED"] },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const resultCases: AbandonmentScanResult["cases"] = [];
    let casesCreatedCount = 0;

    for (const order of candidateOrders) {
      // Check if any successful payment exists for this order
      const hasSuccessfulPayment = order.payments.some((p) => p.status === "captured" || p.status === "authorized");
      if (hasSuccessfulPayment) {
        // Self-heal order status if payment succeeded
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "paid", updatedAt: new Date() },
        }).catch(() => null);
        continue;
      }

      // Check if an active recovery case already exists (Idempotency)
      if (order.recoveryCases.length > 0) {
        const existingCase = order.recoveryCases[0];
        resultCases.push({
          caseId: existingCase.id,
          caseNumber: existingCase.caseNumber,
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          amountPaise: existingCase.amountAtRisk.toString(),
          amountINR: fromPaise(existingCase.amountAtRisk),
          customerEmail: order.customer.email,
          status: existingCase.status,
        });
        continue;
      }

      // 2. Create authoritative RecoveryCase
      const caseNumber = `REC-CHK-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const recoveryCase = await prisma.recoveryCase.create({
        data: {
          caseNumber,
          customerId: order.customerId,
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          amountAtRisk: order.amount,
          status: "NEW",
          rootCause: "checkout_abandonment",
          rootCauseDetails: `Checkout abandoned: Razorpay order ${order.razorpayOrderId} created > ${windowMinutes}m ago without payment authorization.`,
        },
        include: {
          customer: true,
        },
      });

      casesCreatedCount++;

      // 3. Emit checkout abandoned and recovery started events
      await eventService.publishEvent({
        caseId: recoveryCase.id,
        caseNumber: recoveryCase.caseNumber,
        type: "CHECKOUT_ABANDONED",
        actor: "ABANDONMENT_DETECTOR",
        status: "success",
        description: `Checkout session for order ${order.razorpayOrderId} detected as abandoned (Age: ${Math.round((Date.now() - order.createdAt.getTime()) / 60000)}m).`,
        metadata: {
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          amountPaise: Number(order.amount),
          amountINR: fromPaise(order.amount),
          customerEmail: order.customer.email,
        },
      });

      await eventService.publishEvent({
        caseId: recoveryCase.id,
        caseNumber: recoveryCase.caseNumber,
        type: "CHECKOUT_RECOVERY_STARTED",
        actor: "LANGGRAPH_ORCHESTRATOR",
        status: "running",
        description: `Starting LangGraph multi-agent checkout recovery for case ${recoveryCase.caseNumber}.`,
      });

      // 4. Trigger LangGraph recovery workflow
      try {
        await langGraphOrchestrator.runRecoveryWorkflow(recoveryCase.id);
      } catch (err: any) {
        console.error(`[AbandonmentService] Error running LangGraph for case ${recoveryCase.id}:`, err);
      }

      const freshCase = await prisma.recoveryCase.findUnique({ where: { id: recoveryCase.id } });

      resultCases.push({
        caseId: recoveryCase.id,
        caseNumber: recoveryCase.caseNumber,
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        amountPaise: recoveryCase.amountAtRisk.toString(),
        amountINR: fromPaise(recoveryCase.amountAtRisk),
        customerEmail: order.customer.email,
        status: freshCase?.status || recoveryCase.status,
      });
    }

    return {
      success: true,
      windowMinutes,
      scannedCount: candidateOrders.length,
      abandonedCount: resultCases.length,
      casesCreatedCount,
      cases: resultCases,
    };
  }
}

export const abandonmentService = new AbandonmentService();
