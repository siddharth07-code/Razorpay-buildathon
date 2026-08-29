import { prisma } from "../config/prisma";
import { fromPaise, toPaise, serializeBigInt } from "../utils/money";
import { eventService } from "./event.service";
import { langGraphOrchestrator } from "./langgraph-orchestrator.service";
import { RecoveryCaseStatus, RecoveryRiskLevel } from "@prisma/client";

export interface ReceivablesScanResult {
  success: boolean;
  overdueInvoicesFound: number;
  casesCreated: number;
  cases: Array<{
    caseId: string;
    caseNumber: string;
    invoiceId: string;
    amountINR: number;
    daysOverdue: number;
    customerEmail: string;
    status: string;
  }>;
}

export class ReceivablesService {
  /**
   * Authoritative backend scan for overdue B2B invoices past due date.
   * Creates RecoveryCase records with strict idempotency (0 duplicate cases).
   */
  public async scanAndRecoverOverdueInvoices(options?: {
    daysOverdueThreshold?: number;
    limit?: number;
  }): Promise<ReceivablesScanResult> {
    const daysThreshold = options?.daysOverdueThreshold ?? 0;
    const limit = options?.limit ?? 50;

    const now = new Date();
    const cutoffTime = new Date(now.getTime() - daysThreshold * 24 * 60 * 60 * 1000);

    // Emit scan started event
    await eventService.publishEvent({
      type: "RECEIVABLES_SCAN_STARTED",
      actor: "RECEIVABLES_ENGINE",
      status: "running",
      description: `Initiated B2B overdue receivables scan with ${daysThreshold} days threshold.`,
      metadata: { daysThreshold, cutoffTime: cutoffTime.toISOString() },
    });

    // 1. Query overdue invoices in PostgreSQL
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { notIn: ["paid", "cancelled"] },
        dueDate: { lte: cutoffTime },
      },
      include: {
        customer: true,
        recoveryCases: {
          where: {
            status: { notIn: [RecoveryCaseStatus.RECOVERED, RecoveryCaseStatus.FAILED, RecoveryCaseStatus.STOPPED] },
          },
        },
      },
      orderBy: { dueDate: "asc" },
      take: limit,
    });

    const resultCases: ReceivablesScanResult["cases"] = [];
    let casesCreated = 0;

    for (const invoice of overdueInvoices) {
      const daysOverdue = invoice.dueDate
        ? Math.max(1, Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 1;

      // 2. Strict Idempotency: Skip if active recovery case already exists
      if (invoice.recoveryCases.length > 0) {
        const existing = invoice.recoveryCases[0];
        resultCases.push({
          caseId: existing.id,
          caseNumber: existing.caseNumber,
          invoiceId: invoice.id,
          amountINR: fromPaise(invoice.amount),
          daysOverdue,
          customerEmail: invoice.customer.email,
          status: existing.status,
        });
        continue;
      }

      // 3. Create new B2B RecoveryCase
      const caseNumber = `REC-INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const isHighValue = invoice.amount >= 10000000n; // >= ₹1,00,000

      const recoveryCase = await prisma.recoveryCase.create({
        data: {
          caseNumber,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          razorpayInvoiceId: invoice.razorpayInvoiceId,
          amountAtRisk: invoice.amount,
          recoverableAmount: invoice.amount,
          status: RecoveryCaseStatus.NEW,
          riskLevel: isHighValue ? RecoveryRiskLevel.HIGH : RecoveryRiskLevel.MEDIUM,
          requiresHumanApproval: isHighValue,
          rootCauseDetails: `B2B corporate invoice overdue by ${daysOverdue} days. Due date: ${invoice.dueDate?.toISOString().split("T")[0]}.`,
        },
      });

      // Update invoice status to overdue if issued
      if (invoice.status === "issued") {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: "overdue" },
        });
      }

      casesCreated++;

      // Emit SSE events
      await eventService.publishEvent({
        caseId: recoveryCase.id,
        caseNumber: recoveryCase.caseNumber,
        type: "INVOICE_OVERDUE_DETECTED",
        actor: "RECEIVABLES_ENGINE",
        status: "waiting",
        description: `B2B Invoice ${invoice.razorpayInvoiceId || invoice.id} overdue by ${daysOverdue} days for ₹${fromPaise(invoice.amount).toLocaleString("en-IN")}.`,
        metadata: {
          invoiceId: invoice.id,
          razorpayInvoiceId: invoice.razorpayInvoiceId,
          amountPaise: Number(invoice.amount),
          amountINR: fromPaise(invoice.amount),
          daysOverdue,
          customerEmail: invoice.customer.email,
        },
      });

      await eventService.publishEvent({
        caseId: recoveryCase.id,
        caseNumber: recoveryCase.caseNumber,
        type: "INVOICE_RECOVERY_STARTED",
        actor: "LANGGRAPH_ORCHESTRATOR",
        status: "running",
        description: `Starting LangGraph multi-agent B2B recovery for case ${recoveryCase.caseNumber}.`,
      });

      // 4. Trigger LangGraph recovery workflow
      try {
        await langGraphOrchestrator.runRecoveryWorkflow(recoveryCase.id);
      } catch (err: any) {
        console.error(`[ReceivablesService] Error running LangGraph for case ${recoveryCase.id}:`, err);
      }

      const freshCase = await prisma.recoveryCase.findUnique({ where: { id: recoveryCase.id } });

      resultCases.push({
        caseId: recoveryCase.id,
        caseNumber: recoveryCase.caseNumber,
        invoiceId: invoice.id,
        amountINR: fromPaise(invoice.amount),
        daysOverdue,
        customerEmail: invoice.customer.email,
        status: freshCase?.status || recoveryCase.status,
      });
    }

    return {
      success: true,
      overdueInvoicesFound: overdueInvoices.length,
      casesCreated,
      cases: resultCases,
    };
  }

  /**
   * Record a customer promise-to-pay commitment for a B2B recovery case.
   */
  public async recordPromiseToPay(
    caseId: string,
    params: {
      promiseDate: Date | string;
      amountPaise?: bigint;
      notes?: string;
    }
  ) {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, invoice: true },
    });

    if (!recCase) {
      throw new Error(`Recovery case ${caseId} not found`);
    }

    const promiseDate = new Date(params.promiseDate);
    const amount = params.amountPaise || recCase.amountAtRisk;

    const ptp = await prisma.promiseToPay.create({
      data: {
        customerId: recCase.customerId,
        invoiceId: recCase.invoiceId,
        amount,
        promiseDate,
        status: "PENDING",
        notes: params.notes || `Promise-to-pay registered by ${recCase.customer.name}`,
      },
    });

    await eventService.publishEvent({
      caseId: recCase.id,
      caseNumber: recCase.caseNumber,
      type: "PROMISE_TO_PAY_RECORDED",
      actor: "CUSTOMER_ENGAGEMENT",
      status: "success",
      description: `Promise-to-pay commitment recorded for ${promiseDate.toISOString().split("T")[0]} for ₹${fromPaise(amount).toLocaleString("en-IN")}.`,
      metadata: {
        promiseId: ptp.id,
        promiseDate: promiseDate.toISOString(),
        amountINR: fromPaise(amount),
        notes: params.notes,
      },
    });

    return serializeBigInt({
      success: true,
      promiseId: ptp.id,
      caseId: recCase.id,
      invoiceId: recCase.invoiceId,
      amountINR: fromPaise(amount),
      promiseDate: ptp.promiseDate.toISOString(),
      status: ptp.status,
    });
  }

  /**
   * Scan pending promises against current time, marking broken commitments and triggering escalations.
   */
  public async evaluatePromiseToPayDeadlines(): Promise<{
    evaluated: number;
    broken: number;
    fulfilled: number;
    escalatedCases: string[];
  }> {
    const now = new Date();

    const pendingPromises = await prisma.promiseToPay.findMany({
      where: {
        status: "PENDING",
        promiseDate: { lt: now },
      },
      include: {
        customer: true,
        invoice: {
          include: {
            recoveryCases: {
              where: {
                status: { notIn: [RecoveryCaseStatus.RECOVERED, RecoveryCaseStatus.STOPPED] },
              },
            },
          },
        },
      },
    });

    let broken = 0;
    let fulfilled = 0;
    const escalatedCases: string[] = [];

    for (const ptp of pendingPromises) {
      if (ptp.invoice?.status === "paid") {
        await prisma.promiseToPay.update({
          where: { id: ptp.id },
          data: { status: "FULFILLED" },
        });
        fulfilled++;
        continue;
      }

      // Mark promise broken
      await prisma.promiseToPay.update({
        where: { id: ptp.id },
        data: { status: "BROKEN" },
      });
      broken++;

      // Trigger escalation for associated active recovery cases
      if (ptp.invoice && ptp.invoice.recoveryCases.length > 0) {
        for (const recCase of ptp.invoice.recoveryCases) {
          await prisma.recoveryCase.update({
            where: { id: recCase.id },
            data: {
              status: RecoveryCaseStatus.ESCALATED,
              riskLevel: RecoveryRiskLevel.CRITICAL,
              requiresHumanApproval: true,
              rootCause: "missed_promise_to_pay",
              rootCauseDetails: `Broken Promise-to-Pay: Customer missed committed payment date ${ptp.promiseDate.toISOString().split("T")[0]}.`,
            },
          });

          escalatedCases.push(recCase.id);

          await eventService.publishEvent({
            caseId: recCase.id,
            caseNumber: recCase.caseNumber,
            type: "PROMISE_TO_PAY_BROKEN",
            actor: "PROMISE_TRACKER",
            status: "failed",
            description: `Broken Promise-to-Pay for case ${recCase.caseNumber}. Missed deadline ${ptp.promiseDate.toISOString().split("T")[0]}. Escalated to CRITICAL.`,
            metadata: {
              promiseId: ptp.id,
              promiseDate: ptp.promiseDate.toISOString(),
              amountINR: fromPaise(ptp.amount),
            },
          });

          // Re-trigger LangGraph workflow for risk re-evaluation and escalation node
          try {
            await langGraphOrchestrator.runRecoveryWorkflow(recCase.id);
          } catch (err: any) {
            console.error(`[ReceivablesService] Error re-running LangGraph on broken promise for case ${recCase.id}:`, err);
          }
        }
      }
    }

    return {
      evaluated: pendingPromises.length,
      broken,
      fulfilled,
      escalatedCases,
    };
  }

  /**
   * Fulfill promise-to-pay upon payment confirmation.
   */
  public async fulfillPromiseToPay(invoiceId: string) {
    return await prisma.promiseToPay.updateMany({
      where: { invoiceId, status: "PENDING" },
      data: { status: "FULFILLED" },
    });
  }
}

export const receivablesService = new ReceivablesService();
