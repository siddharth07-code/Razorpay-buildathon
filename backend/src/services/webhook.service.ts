import crypto from "crypto";
import { prisma } from "../config/prisma";
import { config } from "../config";
import { toPaise, fromPaise } from "../utils/money";
import { RecoveryCaseStatus, RecoveryStep, AttemptStatus, PaymentStatus } from "@prisma/client";
import { eventService } from "./event.service";

export class WebhookService {
  /**
   * Constant-time HMAC-SHA256 signature verification
   */
  public verifySignature(rawBody: string, signature: string, secret: string = config.razorpay.webhookSecret): boolean {
    if (!signature || !secret) return false;

    try {
      const expectedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
      const expectedBuffer = Buffer.from(expectedSignature, "utf8");
      const actualBuffer = Buffer.from(signature, "utf8");

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch (err) {
      console.error("[WebhookService] Signature verification error:", err);
      return false;
    }
  }

  /**
   * Process inbound Razorpay Webhook event with robust matching, idempotency, and atomic financial transactions
   */
  public async handleWebhook(rawBody: string, signature: string) {
    const isMock = config.razorpay.mode === "mock" && signature === "mock_signature_test";
    const isValid = this.verifySignature(rawBody, signature) || isMock;

    if (!isValid) {
      throw new Error("Invalid signature: Webhook authenticity check failed.");
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const paymentLinkEntity = payload.payload?.payment_link?.entity;
    const orderEntity = payload.payload?.order?.entity;
    const subscriptionEntity = payload.payload?.subscription?.entity;
    const invoiceEntity = payload.payload?.invoice?.entity;

    const eventId =
      payload.id ||
      `evt_${event}_${paymentEntity?.id || subscriptionEntity?.id || paymentLinkEntity?.id || Date.now()}`;

    // 1. Idempotency Check in PostgreSQL
    const existingEvent = await prisma.razorpayEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent && existingEvent.processed) {
      return {
        received: true,
        idempotent: true,
        message: `Event ${eventId} has already been processed. Recovered revenue will not be double-counted.`,
      };
    }

    // Upsert RazorpayEvent
    await prisma.razorpayEvent.upsert({
      where: { eventId },
      update: { signatureVerified: true },
      create: {
        eventId,
        eventType: event,
        signatureVerified: true,
        payload,
        processed: false,
      },
    });

    // 2. Process Confirmed Payment / Subscription Capture (Revenue Recovered)
    if (
      event === "payment.captured" ||
      event === "order.paid" ||
      event === "payment_link.paid" ||
      event === "subscription.charged" ||
      event === "subscription.activated" ||
      event === "invoice.paid"
    ) {
      const rzpPaymentId = paymentEntity?.id;
      const rzpOrderId = paymentEntity?.order_id || orderEntity?.id;
      const rzpLinkId = paymentLinkEntity?.id || paymentEntity?.notes?.recoverai_link_id;
      const rzpSubId = subscriptionEntity?.id || paymentEntity?.subscription_id || paymentEntity?.notes?.subscription_id;
      const rzpInvoiceId = invoiceEntity?.id || paymentEntity?.invoice_id || paymentEntity?.notes?.invoice_id || paymentLinkEntity?.notes?.invoice_id;
      const caseIdFromNotes = paymentEntity?.notes?.recoverai_case_id || paymentEntity?.notes?.caseId || paymentLinkEntity?.notes?.recoverai_case_id;
      
      let amountPaise = 0n;
      if (paymentEntity?.amount) {
        amountPaise = BigInt(paymentEntity.amount);
      } else if (paymentLinkEntity?.amount) {
        amountPaise = BigInt(paymentLinkEntity.amount);
      } else if (invoiceEntity?.amount) {
        amountPaise = BigInt(invoiceEntity.amount);
      } else if (subscriptionEntity?.amount) {
        amountPaise = BigInt(subscriptionEntity.amount);
      }

      // ATOMIC TRANSACTION: Only confirmed Razorpay payments record recovered revenue
      const txResult = await prisma.$transaction(async (tx) => {
        // Robust Multi-field Matching
        const whereClauses: any[] = [];
        if (caseIdFromNotes) whereClauses.push({ id: caseIdFromNotes });
        if (rzpPaymentId) whereClauses.push({ razorpayPaymentId: rzpPaymentId });
        if (rzpLinkId) whereClauses.push({ razorpayPaymentLinkId: rzpLinkId });
        if (rzpOrderId) whereClauses.push({ razorpayOrderId: rzpOrderId });
        if (rzpSubId) whereClauses.push({ razorpaySubscriptionId: rzpSubId });
        if (rzpInvoiceId) whereClauses.push({ razorpayInvoiceId: rzpInvoiceId });

        let matchedCase = whereClauses.length > 0
          ? await tx.recoveryCase.findFirst({
              where: { OR: whereClauses },
              include: { customer: true, payment: true, subscription: true, invoice: true },
              orderBy: { createdAt: "desc" },
            })
          : null;

        // If not matched, try matching through associated payment record
        if (!matchedCase && rzpPaymentId) {
          const associatedPayment = await tx.payment.findUnique({
            where: { razorpayPaymentId: rzpPaymentId },
            include: { recoveryCases: { take: 1, orderBy: { createdAt: "desc" } } },
          });
          if (associatedPayment && associatedPayment.recoveryCases.length > 0) {
            matchedCase = await tx.recoveryCase.findUnique({
              where: { id: associatedPayment.recoveryCases[0].id },
              include: { customer: true, payment: true, subscription: true, invoice: true },
            });
          }
        }

        // UNMATCHED EVENT HANDLING: If webhook cannot be safely matched to a recovery case, DO NOT mark recovered
        if (!matchedCase) {
          await tx.auditEvent.create({
            data: {
              actor: "RAZORPAY_WEBHOOK",
              eventType: "UNMATCHED_RAZORPAY_EVENT",
              description: `Received ${event} for ₹${fromPaise(amountPaise).toLocaleString("en-IN")}, but no active RecoveryCase was bound to ID ${rzpPaymentId || rzpSubId || rzpLinkId || "N/A"}. Logged for audit isolation.`,
              metadata: { event, rzpPaymentId, rzpSubId, rzpLinkId, rzpOrderId, amountPaise: Number(amountPaise) },
            },
          });

          await tx.razorpayEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          });

          return {
            received: true,
            processed: true,
            revenueRecovered: false,
            message: "Payment captured, but no matching recovery case was found. Logged as UNMATCHED_RAZORPAY_EVENT.",
          };
        }

        // Check if case is already recovered (idempotency guard)
        if (matchedCase.status === "RECOVERED") {
          await tx.razorpayEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          });

          return {
            received: true,
            processed: true,
            revenueRecovered: false,
            alreadyRecovered: true,
            caseNumber: matchedCase.caseNumber,
            recoveredAmountPaise: matchedCase.recoveredAmount,
            message: `Case ${matchedCase.caseNumber} is already marked as RECOVERED.`,
          };
        }

        const effectiveRecoveredAmount = amountPaise > 0n ? amountPaise : matchedCase.amountAtRisk;

        // 1. Update Payment status
        if (matchedCase.paymentId) {
          await tx.payment.update({
            where: { id: matchedCase.paymentId },
            data: {
              status: PaymentStatus.captured,
              razorpayPaymentId: rzpPaymentId || undefined,
              updatedAt: new Date(),
            },
          });
        }

        // 1b. Update Subscription status if linked
        if (matchedCase.subscriptionId || matchedCase.razorpaySubscriptionId) {
          const subId = matchedCase.subscriptionId;
          if (subId) {
            await tx.subscription.update({
              where: { id: subId },
              data: {
                status: "active",
                updatedAt: new Date(),
              },
            }).catch(() => null);
          }
        }

        // 1c. Update Order status if linked
        if (matchedCase.orderId) {
          await tx.order.update({
            where: { id: matchedCase.orderId },
            data: {
              status: "paid",
              updatedAt: new Date(),
            },
          }).catch(() => null);
        } else if (matchedCase.razorpayOrderId || rzpOrderId) {
          await tx.order.updateMany({
            where: { razorpayOrderId: matchedCase.razorpayOrderId || rzpOrderId },
            data: {
              status: "paid",
              updatedAt: new Date(),
            },
          }).catch(() => null);
        }

        // 1d. Update Invoice status & fulfill pending PromiseToPay if linked
        if (matchedCase.invoiceId) {
          await tx.invoice.update({
            where: { id: matchedCase.invoiceId },
            data: {
              status: "paid",
              paidAt: new Date(),
              updatedAt: new Date(),
            },
          }).catch(() => null);

          await tx.promiseToPay.updateMany({
            where: { invoiceId: matchedCase.invoiceId, status: "PENDING" },
            data: { status: "FULFILLED", updatedAt: new Date() },
          }).catch(() => null);
        } else if (matchedCase.razorpayInvoiceId || rzpInvoiceId) {
          const invId = matchedCase.razorpayInvoiceId || rzpInvoiceId;
          const matchingInvoices = await tx.invoice.findMany({
            where: { razorpayInvoiceId: invId },
            select: { id: true },
          });
          if (matchingInvoices.length > 0) {
            const invIds = matchingInvoices.map((i) => i.id);
            await tx.invoice.updateMany({
              where: { id: { in: invIds } },
              data: { status: "paid", paidAt: new Date(), updatedAt: new Date() },
            }).catch(() => null);

            await tx.promiseToPay.updateMany({
              where: { invoiceId: { in: invIds }, status: "PENDING" },
              data: { status: "FULFILLED", updatedAt: new Date() },
            }).catch(() => null);
          }
        }

        // 2. Update RecoveryCase to RECOVERED (terminal state)
        const updatedCase = await tx.recoveryCase.update({
          where: { id: matchedCase.id },
          data: {
            status: RecoveryCaseStatus.RECOVERED,
            currentStep: RecoveryStep.RECOVERY_RESOLVED,
            recoveredAmount: effectiveRecoveredAmount,
            recoveredAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // 3. Update Customer stats in paise
        await tx.customer.update({
          where: { id: matchedCase.customerId },
          data: {
            successfulPayments: { increment: 1 },
            recoveredAmount: { increment: effectiveRecoveredAmount },
          },
        });

        // 4. Record RecoveryAttempt Success
        await tx.recoveryAttempt.create({
          data: {
            recoveryCaseId: matchedCase.id,
            paymentId: matchedCase.paymentId,
            attemptNumber: matchedCase.retryCount + 1,
            action: matchedCase.selectedAction || "CREATE_PAYMENT_LINK",
            status: AttemptStatus.SUCCESS,
            razorpayReference: rzpPaymentId || rzpSubId || rzpLinkId,
            amount: effectiveRecoveredAmount,
            result: { event, rzpPaymentId, rzpSubId, rzpLinkId },
            notes: `Confirmed captured via Razorpay Sandbox Webhook (${event})`,
          },
        });

        // 5. Create AuditEvent
        await tx.auditEvent.create({
          data: {
            caseId: matchedCase.id,
            actor: "RAZORPAY_WEBHOOK",
            eventType: "SUBSCRIPTION_RECOVERED",
            description: `₹${fromPaise(effectiveRecoveredAmount).toLocaleString("en-IN")} confirmed captured by Razorpay. Subscription capital recovered.`,
            metadata: {
              event,
              rzpPaymentId,
              rzpSubId,
              rzpLinkId,
              amountPaise: Number(effectiveRecoveredAmount),
              caseNumber: matchedCase.caseNumber,
            },
          },
        });

        // 6. Mark Event Processed
        await tx.razorpayEvent.update({
          where: { eventId },
          data: { processed: true, processedAt: new Date() },
        });

        return {
          received: true,
          processed: true,
          revenueRecovered: true,
          caseId: matchedCase.id,
          caseNumber: updatedCase.caseNumber,
          recoveredAmount: fromPaise(effectiveRecoveredAmount),
          recoveredAmountPaise: effectiveRecoveredAmount,
          effectiveRecoveredAmount,
        };
      }, { maxWait: 10000, timeout: 20000 });

      // Publish SSE event outside the interactive transaction
      if (txResult && txResult.revenueRecovered) {
        await eventService.publishEvent({
          caseId: txResult.caseId,
          caseNumber: txResult.caseNumber,
          type: "SUBSCRIPTION_RECOVERED",
          actor: "RAZORPAY_WEBHOOK",
          status: "success",
          description: `Subscription ${txResult.caseNumber} recovered: ₹${(txResult.recoveredAmount || 0).toLocaleString("en-IN")}`,
          metadata: { amountPaise: Number(txResult.effectiveRecoveredAmount || 0n), rzpSubId },
        }).catch(() => null);
      }

      return txResult;
    }

    // 3. Process Subscription Payment Failure (subscription.pending or subscription.halted)
    if (event === "subscription.pending" || event === "subscription.halted") {
      const subId = subscriptionEntity?.id || payload.payload?.subscription_id || `sub_fail_${Date.now()}`;
      const planId = subscriptionEntity?.plan_id || "plan_standard";
      const customerEmail = paymentEntity?.email || payload.payload?.customer?.email || "subscriber@company.in";
      const customerPhone = paymentEntity?.contact || payload.payload?.customer?.contact || "+919876543210";
      const customerName = payload.payload?.customer?.name || "Subscription Customer";

      let amountPaise = 0n;
      if (invoiceEntity?.amount) {
        amountPaise = BigInt(invoiceEntity.amount);
      } else if (paymentEntity?.amount) {
        amountPaise = BigInt(paymentEntity.amount);
      } else if (subscriptionEntity?.amount) {
        amountPaise = BigInt(subscriptionEntity.amount);
      } else {
        amountPaise = 2500000n; // Default ₹25,000 in paise
      }

      const amountRupees = fromPaise(amountPaise);
      const isHalted = event === "subscription.halted" || subscriptionEntity?.status === "halted";
      const isCritical = amountRupees >= 100000 || isHalted;

      return await prisma.$transaction(async (tx) => {
        // IDEMPOTENCY GUARD: Check if an active/open recovery case already exists for this subscription!
        const existingOpenCase = await tx.recoveryCase.findFirst({
          where: {
            razorpaySubscriptionId: subId,
            status: { notIn: [RecoveryCaseStatus.RECOVERED, RecoveryCaseStatus.STOPPED, RecoveryCaseStatus.EXPIRED] },
          },
          include: { customer: true },
        });

        if (existingOpenCase) {
          // Log audit event and acknowledge without creating a duplicate case
          await tx.auditEvent.create({
            data: {
              caseId: existingOpenCase.id,
              actor: "RAZORPAY_WEBHOOK",
              eventType: isHalted ? "SUBSCRIPTION_HALTED" : "SUBSCRIPTION_FAILURE_DETECTED",
              description: `Received recurring ${event} for active case ${existingOpenCase.caseNumber}. Duplicate case creation prevented.`,
              metadata: { subId, event, amountPaise: Number(amountPaise) },
            },
          });

          await tx.razorpayEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          });

          return {
            received: true,
            processed: true,
            duplicateCasePrevented: true,
            caseNumber: existingOpenCase.caseNumber,
            caseId: existingOpenCase.id,
            status: existingOpenCase.status,
          };
        }

        // Upsert customer
        const customer = await tx.customer.upsert({
          where: { email: customerEmail },
          update: {
            failedPayments: { increment: 1 },
            phone: customerPhone,
          },
          create: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            tier: amountRupees >= 100000 ? "ENTERPRISE" : amountRupees >= 25000 ? "GROWTH" : "STARTER",
            lifetimeValue: amountPaise * 4n,
            failedPayments: 1,
          },
        });

        // Upsert Subscription
        const subscription = await tx.subscription.upsert({
          where: { razorpaySubscriptionId: subId },
          update: {
            status: isHalted ? "halted" : "pending",
            amount: amountPaise,
          },
          create: {
            razorpaySubscriptionId: subId,
            customerId: customer.id,
            planId,
            amount: amountPaise,
            status: isHalted ? "halted" : "pending",
          },
        });

        const caseNumber = `REC-SUB-${Math.floor(1000 + Math.random() * 9000)}`;

        // Create RecoveryCase in NEW state
        const recCase = await tx.recoveryCase.create({
          data: {
            caseNumber,
            customerId: customer.id,
            subscriptionId: subscription.id,
            razorpaySubscriptionId: subId,
            amountAtRisk: amountPaise,
            recoverableAmount: toPaise(Math.round(amountRupees * 0.88)),
            recoveredAmount: 0n,
            status: RecoveryCaseStatus.NEW,
            riskLevel: isCritical ? "CRITICAL" : "HIGH",
            riskScore: isHalted ? 88 : isCritical ? 80 : 60,
            recoverabilityScore: isHalted ? 70 : 88,
            expectedRecoveryValue: toPaise(Math.round(amountRupees * 0.88)),
            priority: isCritical ? "P0" : "P1",
            rootCause: isHalted ? "subscription_payment_failure" : "payment_method_issue",
            rootCauseDetails: `Razorpay subscription event ${event} detected for subscription ${subId}. Initiated autonomous agent triage.`,
            recommendedAction: isHalted && amountRupees >= 100000 ? "ESCALATE_TO_HUMAN" : "CREATE_PAYMENT_LINK",
            selectedAction: isHalted && amountRupees >= 100000 ? "ESCALATE_TO_HUMAN" : "CREATE_PAYMENT_LINK",
            currentStep: RecoveryStep.ROOT_CAUSE_ANALYSIS,
            retryCount: 0,
            contactCount: 0,
            requiresHumanApproval: amountRupees >= 100000 || isHalted,
          },
        });

        // Create AuditEvent
        await tx.auditEvent.create({
          data: {
            caseId: recCase.id,
            actor: "RAZORPAY_WEBHOOK",
            eventType: isHalted ? "SUBSCRIPTION_HALTED" : "SUBSCRIPTION_FAILURE_DETECTED",
            description: `Case ${caseNumber} opened for ₹${amountRupees.toLocaleString("en-IN")} failed subscription (${subId}).`,
            metadata: { event, subId, amountPaise: Number(amountPaise), planId },
          },
        });

        // Mark event processed
        await tx.razorpayEvent.update({
          where: { eventId },
          data: { processed: true, processedAt: new Date() },
        });

        // Publish SSE Event
        await eventService.publishEvent({
          caseId: recCase.id,
          caseNumber: recCase.caseNumber,
          type: "SUBSCRIPTION_FAILURE_DETECTED",
          actor: "RAZORPAY_WEBHOOK",
          status: "waiting",
          description: `Subscription failure detected: Case ${caseNumber} (${subId}) at risk ₹${amountRupees.toLocaleString("en-IN")}`,
          metadata: { subId, amountPaise: Number(amountPaise), isHalted },
        });

        return {
          received: true,
          processed: true,
          caseNumber,
          caseId: recCase.id,
          subscriptionId: subId,
          action: recCase.recommendedAction,
        };
      });
    }

    // 4. Process Payment Failed
    if (event === "payment.failed") {
      if (paymentEntity) {
        const amountPaise = BigInt(paymentEntity.amount);
        const amountRupees = fromPaise(amountPaise);
        const customerEmail = paymentEntity.email || "customer@example.in";

        return await prisma.$transaction(async (tx) => {
          // Upsert customer
          const customer = await tx.customer.upsert({
            where: { email: customerEmail },
            update: {
              failedPayments: { increment: 1 },
              phone: paymentEntity.contact || "+919876543210",
            },
            create: {
              name: paymentEntity.contact || "Razorpay Customer",
              email: customerEmail,
              phone: paymentEntity.contact || "+919876543210",
              tier: amountRupees >= 100000 ? "ENTERPRISE" : amountRupees >= 25000 ? "GROWTH" : "STARTER",
              lifetimeValue: amountPaise * 3n,
              failedPayments: 1,
            },
          });

          // Create payment
          const payment = await tx.payment.create({
            data: {
              customerId: customer.id,
              razorpayPaymentId: paymentEntity.id,
              amount: amountPaise,
              currency: paymentEntity.currency || "INR",
              status: PaymentStatus.failed,
              method: paymentEntity.method || "card",
              bank: paymentEntity.bank,
              vpa: paymentEntity.vpa,
              errorCode: paymentEntity.error_code,
              errorDescription: paymentEntity.error_description,
              errorSource: paymentEntity.error_source,
              errorStep: paymentEntity.error_step,
              errorReason: paymentEntity.error_reason,
            },
          });

          const caseNumber = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
          const isCritical = amountRupees >= 100000;

          // Create recovery case in NEW
          const recCase = await tx.recoveryCase.create({
            data: {
              caseNumber,
              customerId: customer.id,
              paymentId: payment.id,
              razorpayPaymentId: paymentEntity.id,
              amountAtRisk: amountPaise,
              recoverableAmount: toPaise(Math.round(amountRupees * 0.88)),
              recoveredAmount: 0n,
              status: RecoveryCaseStatus.NEW,
              riskLevel: isCritical ? "CRITICAL" : "HIGH",
              riskScore: isCritical ? 85 : 65,
              recoverabilityScore: 88,
              expectedRecoveryValue: toPaise(Math.round(amountRupees * 0.88)),
              priority: isCritical ? "P0" : "P1",
              rootCause: paymentEntity.error_code === "INSUFFICIENT_FUNDS" ? "insufficient_funds" : "authentication_failure",
              rootCauseDetails: `Razorpay payment failed with ${paymentEntity.error_code || "Unknown Error"}. Initiated autonomous triage.`,
              recommendedAction: "CREATE_PAYMENT_LINK",
              selectedAction: "CREATE_PAYMENT_LINK",
              currentStep: RecoveryStep.ROOT_CAUSE_ANALYSIS,
              retryCount: 0,
              contactCount: 0,
              requiresHumanApproval: isCritical,
            },
          });

          // Create AuditEvent
          await tx.auditEvent.create({
            data: {
              caseId: recCase.id,
              actor: "RAZORPAY_WEBHOOK",
              eventType: "CASE_CREATED",
              description: `Case ${caseNumber} opened for ₹${amountRupees.toLocaleString("en-IN")} failed payment.`,
            },
          });

          // Mark event processed
          await tx.razorpayEvent.update({
            where: { eventId },
            data: { processed: true, processedAt: new Date() },
          });

          return {
            received: true,
            processed: true,
            caseNumber,
            caseId: recCase.id,
            action: recCase.recommendedAction,
          };
        });
      }
    }

    // Default acknowledgement
    await prisma.razorpayEvent.update({
      where: { eventId },
      data: { processed: true, processedAt: new Date() },
    });

    return {
      received: true,
      processed: true,
      event,
      status: "acknowledged",
    };
  }
}

export const webhookService = new WebhookService();

