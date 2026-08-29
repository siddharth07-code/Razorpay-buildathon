import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { appConfig } from "@/lib/config";
import { repository } from "@/lib/db/repository";
import { recoveryOrchestrator } from "@/lib/agents/orchestrator";
import { paiseToRupees } from "@/lib/utils";
import { Payment } from "@/types/payment";
import { Customer } from "@/types/customer";

export const dynamic = "force-dynamic";

// In-memory idempotency registry (tracks event IDs to prevent duplicate processing)
const processedEventIds = new Set<string>();

/**
 * Verify Razorpay Webhook HMAC-SHA256 signature
 */
function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const actualBuffer = Buffer.from(signature, "utf8");

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    console.error("[Webhook Auth] Signature comparison error:", err);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = appConfig.razorpay.webhookSecret;

    // 1. Signature Verification (Allow bypass only in mock mode without secret)
    const isValidSignature = verifyRazorpaySignature(rawBody, signature, webhookSecret);
    const isMock = appConfig.isMock && signature === "mock_signature_test";

    if (!isValidSignature && !isMock) {
      console.warn("[Razorpay Webhook] Invalid webhook signature rejected.");
      return NextResponse.json(
        { error: "Invalid signature: Webhook authenticity check failed." },
        { status: 401 }
      );
    }

    // 2. Parse Event Payload
    const eventPayload = JSON.parse(rawBody);
    const { event, account_id, contains, payload } = eventPayload;
    const eventId = eventPayload.id || `evt_${event}_${payload?.payment?.entity?.id || Date.now()}`;

    // 3. Idempotency Check
    if (processedEventIds.has(eventId)) {
      console.log(`[Razorpay Webhook] Idempotent skip for event ${eventId}`);
      return NextResponse.json({
        received: true,
        idempotent: true,
        message: "Event already processed.",
      });
    }
    processedEventIds.add(eventId);

    // 4. Record Inbound Audit Event
    repository.logAuditEvent({
      entityType: "PAYMENT",
      entityId: eventId,
      eventType: `RAZORPAY_WEBHOOK_${event.toUpperCase().replace(/\./g, "_")}`,
      actor: "RAZORPAY_WEBHOOK",
      description: `Inbound Razorpay webhook '${event}' verified and received.`,
      payload: {
        event,
        accountId: account_id,
        entityId: payload?.payment?.entity?.id || payload?.payment_link?.entity?.id,
      },
    });

    // 5. Route to Multi-Agent Recovery Pipeline

    // Scenario A: PAYMENT FAILED
    if (event === "payment.failed" || event === "subscription.halted") {
      const p = payload?.payment?.entity;
      if (p) {
        const amountInRupees = paiseToRupees(p.amount);
        const customerId = `cust_${p.email?.replace(/[^a-zA-Z0-9]/g, "_") || Date.now()}`;

        // Ensure customer exists in repository
        let customer = repository.getCustomerById(customerId);
        if (!customer) {
          customer = {
            id: customerId,
            name: p.contact || "Razorpay Customer",
            email: p.email || "customer@example.in",
            phone: p.contact || "+919876543210",
            companyName: p.email?.split("@")[1]?.split(".")[0]?.toUpperCase() || "Enterprise",
            tier: amountInRupees >= 100000 ? "ENTERPRISE" : amountInRupees >= 20000 ? "GROWTH" : "STARTER",
            ltv: amountInRupees * 2,
            preferredPaymentMethod: p.method as any || "card",
            failureCount: 1,
            recoveryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          repository.getCustomers().unshift(customer);
        }

        const payment: Payment = {
          id: `pay_${p.id}`,
          razorpayPaymentId: p.id,
          razorpayOrderId: p.order_id,
          customerId,
          amount: amountInRupees,
          currency: "INR",
          status: "failed",
          method: p.method as any || "card",
          bank: p.bank,
          vpa: p.vpa,
          errorCode: p.error_code as any,
          errorDescription: p.error_description,
          errorSource: p.error_source as any,
          errorStep: p.error_step as any,
          errorReason: p.error_reason,
          attempts: 1,
          lastAttemptAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        repository.getPayments().unshift(payment);

        // Run Multi-Agent Autonomous Recovery Loop
        const result = await recoveryOrchestrator.processPaymentFailure({
          payment,
          customer,
          caseId: `case_wh_${p.id}`,
        });

        return NextResponse.json({
          received: true,
          processed: true,
          event,
          caseNumber: result.caseNumber,
          action: result.strategy.action,
        });
      }
    }

    // Scenario B: PAYMENT CAPTURED / ORDER PAID / PAYMENT LINK PAID
    if (
      event === "payment.captured" ||
      event === "order.paid" ||
      event === "payment_link.paid" ||
      event === "subscription.charged" ||
      event === "invoice.paid"
    ) {
      const p = payload?.payment?.entity;
      const plink = payload?.payment_link?.entity;
      const paymentId = p?.id;
      const linkId = plink?.id;
      const amountInRupees = p ? paiseToRupees(p.amount) : plink ? paiseToRupees(plink.amount) : 0;

      const recoveryResult = recoveryOrchestrator.processPaymentCaptured({
        paymentId: `pay_${paymentId}`,
        razorpayPaymentId: paymentId || "",
        paymentLinkId: linkId,
        amount: amountInRupees,
      });

      return NextResponse.json({
        received: true,
        processed: true,
        event,
        revenueRecovered: recoveryResult.success,
        message: recoveryResult.message,
      });
    }

    // Other events (e.g. payment_link.created, payment.authorized)
    return NextResponse.json({
      received: true,
      event,
      status: "acknowledged",
    });
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json({ error: error?.message || "Webhook processing failed" }, { status: 500 });
  }
}
