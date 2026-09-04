import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { config } from "../../../../../../backend/src/config";
import { prisma } from "../../../../../../backend/src/config/prisma";
import { webhookService } from "../../../../../../backend/src/services/webhook.service";
import { serializeBigInt } from "../../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

/**
 * Controlled Sandbox Webhook Simulation Endpoint
 * Signs a legitimate test payment.captured payload using the server's RAZORPAY_WEBHOOK_SECRET
 * and settles it through the canonical webhookService.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { caseId, caseNumber, paymentId: customPaymentId, amountPaise: customAmountPaise } = body;

    let targetCase = null;
    if (caseId) {
      targetCase = await prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: { customer: true, payment: true },
      });
    } else if (caseNumber) {
      targetCase = await prisma.recoveryCase.findUnique({
        where: { caseNumber },
        include: { customer: true, payment: true },
      });
    }

    if (!targetCase) {
      // Fallback to REC-DEMO-005 if neither specified
      targetCase = await prisma.recoveryCase.findUnique({
        where: { caseNumber: "REC-DEMO-005" },
        include: { customer: true, payment: true },
      });
    }

    if (!targetCase) {
      return NextResponse.json({ error: "No target recovery case found for simulation" }, { status: 404 });
    }

    const paymentId = customPaymentId || targetCase.razorpayPaymentId || `pay_sim_${Date.now()}`;
    const amountPaise = customAmountPaise ? BigInt(customAmountPaise) : targetCase.amountAtRisk;

    const payload = {
      event: "payment.captured",
      id: `evt_sim_${Date.now()}`,
      created_at: Math.floor(Date.now() / 1000),
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: "payment",
            amount: Number(amountPaise),
            currency: "INR",
            status: "captured",
            order_id: targetCase.razorpayOrderId || undefined,
            method: "card",
            captured: true,
            email: targetCase.customer?.email || "billing@demo.vireon",
            contact: targetCase.customer?.phone || "+919876543210",
            notes: {
              vireon_case_id: targetCase.id,
              recoverai_case_id: targetCase.id,
              case_number: targetCase.caseNumber,
            },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const secret = config.razorpay.webhookSecret;
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    // Process through the canonical webhook pipeline with authentic HMAC verification
    const webhookResult = await webhookService.handleWebhook(rawBody, signature);

    const updatedCase = await prisma.recoveryCase.findUnique({
      where: { id: targetCase.id },
      include: { customer: true, payment: true },
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        message: `Webhook simulation successfully settled case ${targetCase.caseNumber}`,
        case: updatedCase,
        webhookResult,
      })
    );
  } catch (err: any) {
    console.error("[Simulate Webhook Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to simulate webhook settlement" },
      { status: 500 }
    );
  }
}
