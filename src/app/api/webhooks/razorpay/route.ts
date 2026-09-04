import { NextRequest, NextResponse } from "next/server";
import { webhookService } from "../../../../../backend/src/services/webhook.service";
import { serializeBigInt } from "../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

/**
 * Authoritative Next.js Razorpay Webhook Endpoint
 * Delegates to canonical webhookService for atomic PostgreSQL settlement and HMAC verification.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const result = await webhookService.handleWebhook(rawBody, signature);
    return NextResponse.json(serializeBigInt(result));
  } catch (error: any) {
    console.error("[Next.js Webhook Error]:", error);
    if (error?.message?.includes("Invalid signature")) {
      return NextResponse.json(
        { error: "Invalid signature: Webhook authenticity check failed." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: error?.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
