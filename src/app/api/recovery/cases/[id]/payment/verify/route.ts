import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "../../../../../../../../backend/src/config/prisma";
import { outcomeService } from "../../../../../../../../backend/src/services/outcome.service";
import { appConfig } from "@/lib/config";
import { repository } from "@/lib/db/repository";
import { serializeBigInt } from "../../../../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    if (!caseId) {
      return NextResponse.json(
        { error: "MISSING_CASE_ID", message: "Case ID is required" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = body;

    if (!razorpayPaymentId) {
      return NextResponse.json(
        { error: "MISSING_PAYMENT_ID", message: "razorpayPaymentId is required for payment verification." },
        { status: 400 }
      );
    }

    if (!razorpayOrderId) {
      return NextResponse.json(
        { error: "MISSING_ORDER_ID", message: "razorpayOrderId is required for payment verification." },
        { status: 400 }
      );
    }

    if (!razorpaySignature) {
      return NextResponse.json(
        { error: "MISSING_SIGNATURE", message: "razorpaySignature is required for payment verification. Unsigned requests are rejected." },
        { status: 400 }
      );
    }

    // 1. Fetch authoritative case from PostgreSQL
    let caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, payment: true },
    });

    let isDbCase = Boolean(caseRecord);
    let repoCase: any = null;

    if (!caseRecord) {
      repoCase = repository.getRecoveryCaseById(caseId);
      if (!repoCase) {
        return NextResponse.json(
          { error: "CASE_NOT_FOUND", message: `Case ${caseId} not found` },
          { status: 404 }
        );
      }
    }

    // Reject mismatched order ID if case already has an associated order ID
    if (caseRecord?.razorpayOrderId && caseRecord.razorpayOrderId !== razorpayOrderId) {
      return NextResponse.json(
        {
          error: "ORDER_MISMATCH",
          message: `Provided order ID '${razorpayOrderId}' does not match registered case order ID '${caseRecord.razorpayOrderId}'.`,
        },
        { status: 400 }
      );
    }

    const currentStatus = caseRecord ? caseRecord.status : repoCase.status;
    const amountAtRiskPaise = caseRecord
      ? caseRecord.amountAtRisk
      : typeof repoCase.amountAtRisk === "bigint"
      ? repoCase.amountAtRisk
      : BigInt(repoCase.amount || 25000) * 100n;

    // 2. Terminal state idempotency
    if (currentStatus === "RECOVERED") {
      return NextResponse.json(
        serializeBigInt({
          success: true,
          alreadyRecovered: true,
          message: "Case has already been confirmed as RECOVERED",
          case: caseRecord || repoCase,
        })
      );
    }

    if (currentStatus === "STOPPED" || currentStatus === "EXPIRED") {
      return NextResponse.json(
        {
          error: "CASE_TERMINAL",
          status: currentStatus,
          message: `Cannot process payment for terminal case (${currentStatus})`,
        },
        { status: 409 }
      );
    }

    // 3. Server-side HMAC Signature Verification (Checkout signature: order_id + "|" + payment_id)
    const secret = appConfig.razorpay.keySecret || process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "SERVER_CONFIG_ERROR", message: "Razorpay key secret is not configured on server." },
        { status: 500 }
      );
    }

    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    let isSignatureValid = false;
    try {
      const genBuffer = Buffer.from(generatedSignature, "utf8");
      const sigBuffer = Buffer.from(razorpaySignature, "utf8");
      if (genBuffer.length === sigBuffer.length) {
        isSignatureValid = crypto.timingSafeEqual(genBuffer, sigBuffer);
      }
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      console.error("[VIREON Payment Verify] Signature mismatch for case:", caseId);
      return NextResponse.json(
        {
          error: "INVALID_SIGNATURE",
          message: "Payment signature verification failed. Settlement rejected.",
        },
        { status: 400 }
      );
    }

    // 4. Atomically commit recovery via OutcomeService
    if (isDbCase) {
      const confirmResult = await outcomeService.confirmRecovery({
        caseId,
        amountCapturedPaise: amountAtRiskPaise,
        razorpayPaymentId,
        razorpayOrderId,
      });

      if (!confirmResult.success && !(confirmResult as any).alreadyRecovered) {
        return NextResponse.json(
          {
            error: "RECOVERY_CONFIRMATION_FAILED",
            message: (confirmResult as any).message || "Failed to commit recovery to database",
          },
          { status: 500 }
        );
      }

      const updatedCase = await prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: { customer: true, payment: true, recoveryAttempts: true },
      });

      return NextResponse.json(
        serializeBigInt({
          success: true,
          case: updatedCase,
          message: "Payment verified and recovery confirmed",
        })
      );
    } else {
      // In-memory fallback
      repoCase.status = "RECOVERED";
      repoCase.recoveredAmount = repoCase.amount || 25000;
      repoCase.recoveredAt = new Date().toISOString();
      repoCase.razorpayPaymentId = razorpayPaymentId;
      if (razorpayOrderId) repoCase.razorpayOrderId = razorpayOrderId;

      return NextResponse.json(
        serializeBigInt({
          success: true,
          case: repoCase,
          message: "Payment verified and recovery confirmed (in-memory)",
        })
      );
    }
  } catch (err: any) {
    console.error("[VIREON Payment Verify Error]:", err);
    return NextResponse.json(
      {
        error: "INTERNAL_VERIFY_ERROR",
        message: err?.message || "Internal error during payment verification",
      },
      { status: 500 }
    );
  }
}
