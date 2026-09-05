import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../../backend/src/config/prisma";
import { executionService } from "../../../../../../../backend/src/services/execution.service";
import { repository } from "@/lib/db/repository";
import { appConfig } from "@/lib/config";
import { getRazorpayService } from "@/lib/razorpay/provider";

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

    // 1. Load authoritative RecoveryCase from PostgreSQL
    let caseRecord = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, payment: true },
    });

    // Fallback to in-memory repository if database is empty/mock mode
    let isDbCase = Boolean(caseRecord);
    let repoCase: any = null;
    if (!caseRecord) {
      repoCase = repository.getRecoveryCaseById(caseId);
      if (!repoCase) {
        return NextResponse.json(
          { error: "CASE_NOT_FOUND", message: `Recovery case ${caseId} not found.` },
          { status: 404 }
        );
      }
    }

    const currentStatus = caseRecord ? caseRecord.status : repoCase.status;
    const caseNumber = caseRecord ? caseRecord.caseNumber : repoCase.caseNumber;
    const customer = caseRecord ? caseRecord.customer : repoCase.customer;
    const amountAtRiskPaise = caseRecord
      ? caseRecord.amountAtRisk
      : typeof repoCase.amountAtRisk === "bigint"
      ? repoCase.amountAtRisk
      : BigInt(repoCase.amount || 25000) * 100n;

    // 2. Terminal state validation
    if (currentStatus === "RECOVERED") {
      return NextResponse.json(
        {
          error: "CASE_ALREADY_TERMINAL",
          status: "RECOVERED",
          message: "This case has already been successfully recovered and settled.",
        },
        { status: 409 }
      );
    }

    if (currentStatus === "STOPPED" || currentStatus === "EXPIRED") {
      return NextResponse.json(
        {
          error: "CASE_ALREADY_TERMINAL",
          status: currentStatus,
          message: `Case is in terminal state (${currentStatus}) and cannot accept payment.`,
        },
        { status: 409 }
      );
    }

    // 3. State machine validation (Must be AWAITING_PAYMENT, or ACTION_SELECTED if transitioning)
    if (
      currentStatus === "NEW" ||
      currentStatus === "OPEN" ||
      currentStatus === "ANALYZING" ||
      currentStatus === "AWAITING_APPROVAL" ||
      currentStatus === "PENDING_APPROVAL"
    ) {
      return NextResponse.json(
        {
          error: "INVALID_STATE_FOR_CHECKOUT",
          status: currentStatus,
          message: `Payment checkout cannot be initiated while case is in ${currentStatus} state.`,
        },
        { status: 409 }
      );
    }

    // 4. Create or reuse Razorpay Order via ExecutionService
    const keyId =
      appConfig.razorpay.keyId ||
      process.env.RAZORPAY_KEY_ID ||
      "";

    let orderId: string;
    let isExisting: boolean;

    if (isDbCase && caseRecord) {
      const orderResult = await executionService.createOrReuseCheckoutOrder({
        caseId,
        amountAtRisk: amountAtRiskPaise,
        customer: {
          name: customer?.name || "Customer",
          email: customer?.email || "",
          phone: customer?.phone || "",
        },
        caseNumber,
        description: `Revenue Recovery - ${caseNumber}`,
      });
      orderId = orderResult.orderId;
      isExisting = orderResult.isExisting;
    } else {
      // In-memory fallback
      const razorpay = await getRazorpayService();
      const amountRupees = Number(amountAtRiskPaise / 100n);
      const order = await razorpay.createOrder({
        amount: amountRupees,
        currency: "INR",
        receipt: `chk_${caseId.substring(0, 8)}_${Date.now()}`,
        notes: {
          vireon_case_id: caseId,
          caseNumber,
        },
      });
      orderId = order.id;
      isExisting = false;
      if (repoCase) repoCase.razorpayOrderId = orderId;
    }

    // 5. Return strictly safe public checkout data (Paise integer precision)
    const amountInPaiseNumber = Number(amountAtRiskPaise);

    // Safe structured diagnostics (Never log secrets or authorization headers)
    console.log("[RAZORPAY CHECKOUT]", {
      mode: "test",
      keyPrefix: keyId.substring(0, 9),
      orderPrefix: orderId ? orderId.substring(0, 6) : "order_",
      amount: amountInPaiseNumber,
      currency: "INR",
      isExistingOrder: isExisting,
    });

    return NextResponse.json({
      success: true,
      checkout: {
        keyId,
        orderId,
        amount: amountInPaiseNumber,
        currency: "INR",
        name: "VIREON",
        description: `Revenue Recovery - ${caseNumber}`,
        caseNumber,
        isExistingOrder: isExisting,
        customer: {
          name: customer?.name || "Customer Entity",
          email: customer?.email || "",
          contact: customer?.phone || "",
        },
      },
    });
  } catch (err: any) {
    console.error("[VIREON Checkout API Error]:", err);
    return NextResponse.json(
      {
        error: "CHECKOUT_INITIALIZATION_FAILED",
        message: err?.message || "Failed to initialize Razorpay checkout session",
      },
      { status: 500 }
    );
  }
}
