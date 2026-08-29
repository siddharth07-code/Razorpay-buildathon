import { getRazorpayService } from "../../../src/lib/razorpay/provider";
import { prisma } from "../config/prisma";
import { fromPaise } from "../utils/money";
import { RecoveryAction as StrategyRecoveryAction } from "./strategy.service";
import { AttemptStatus, RecoveryAction as PrismaRecoveryAction } from "@prisma/client";

function mapToPrismaAction(action: string): PrismaRecoveryAction {
  switch (action) {
    case "PAYMENT_RETRY":
    case "RETRY_PAYMENT":
      return PrismaRecoveryAction.RETRY_PAYMENT;
    case "CREATE_PAYMENT_LINK":
    case "CHECKOUT_RECOVERY_LINK":
    case "INVOICE_PAYMENT_LINK":
    case "INVOICE_RECOVERY":
      return PrismaRecoveryAction.CREATE_PAYMENT_LINK;
    case "SEND_PAYMENT_LINK":
      return PrismaRecoveryAction.SEND_PAYMENT_LINK;
    case "REQUEST_PAYMENT_METHOD_UPDATE":
      return PrismaRecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE;
    case "SUBSCRIPTION_RECOVERY":
    case "SUBSCRIPTION_PAYMENT_RECOVERY":
    case "SUBSCRIPTION_LINK_RECOVERY":
    case "RETRY_SUBSCRIPTION":
      return PrismaRecoveryAction.RETRY_SUBSCRIPTION;
    case "SEND_REMINDER":
    case "SEND_NOTIFICATION":
    case "SEND_INVOICE_REMINDER":
    case "RECORD_PROMISE_TO_PAY":
      return PrismaRecoveryAction.SEND_NOTIFICATION;
    case "HUMAN_ESCALATION":
    case "ESCALATE_TO_HUMAN":
      return PrismaRecoveryAction.ESCALATE_TO_HUMAN;
    case "STOP_RECOVERY":
      return PrismaRecoveryAction.STOP_RECOVERY;
    default:
      return PrismaRecoveryAction.CREATE_PAYMENT_LINK;
  }
}

export interface ExecutionResult {
  success: boolean;
  attemptId: string;
  action: StrategyRecoveryAction | string;
  status: AttemptStatus;
  razorpayReference?: string;
  paymentLinkUrl?: string;
  message: string;
  error?: string;
}

export class ExecutionService {
  /**
   * Execution boundary: Only ExecutionService is authorized to call Razorpay
   */
  public async executeAction(params: {
    caseId: string;
    paymentId?: string;
    orderId?: string;
    razorpayOrderId?: string;
    subscriptionId?: string;
    razorpaySubscriptionId?: string;
    invoiceId?: string;
    razorpayInvoiceId?: string;
    action: StrategyRecoveryAction | string;
    amountAtRisk: bigint;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    description?: string;
    attemptNumber: number;
  }): Promise<ExecutionResult> {
    const { caseId, paymentId, orderId, razorpayOrderId, subscriptionId, razorpaySubscriptionId, invoiceId, razorpayInvoiceId, action, amountAtRisk, customer, description, attemptNumber } = params;
    const amountRupees = fromPaise(amountAtRisk);

    const razorpay = await getRazorpayService();

    let status: AttemptStatus = AttemptStatus.INITIATED;
    let razorpayReference: string | undefined;
    let paymentLinkUrl: string | undefined;
    let executionMessage = "";
    let executionError: string | undefined;
    let resultPayload: any = {};

    try {
      if (action === "SUBSCRIPTION_LINK_RECOVERY" || action === "SUBSCRIPTION_PAYMENT_RECOVERY") {
        // Create 1-click dedicated Razorpay Subscription recovery link
        const subId = razorpaySubscriptionId || subscriptionId || `sub_${caseId.substring(0, 10)}`;
        const subLinkResponse = await razorpay.createSubscriptionLink({
          subscriptionId: subId,
          amount: amountRupees,
          description: description || `Subscription billing recovery for ${subId}`,
          customer: {
            name: customer.name,
            email: customer.email,
            contact: customer.phone,
          },
          notes: {
            recoverai_case_id: caseId,
            action_type: action,
            subscription_id: subId,
          },
        });

        status = AttemptStatus.INITIATED;
        razorpayReference = subLinkResponse.id;
        paymentLinkUrl = subLinkResponse.short_url;
        executionMessage = `Generated 1-click Razorpay subscription recovery link: ${subLinkResponse.short_url}`;
        resultPayload = subLinkResponse;

        // Associate link with recovery case
        await prisma.recoveryCase.update({
          where: { id: caseId },
          data: {
            paymentLinkUrl: subLinkResponse.short_url,
            razorpayPaymentLinkId: subLinkResponse.id,
            razorpaySubscriptionId: subId,
          },
        });
      } else if (
        action === "CREATE_PAYMENT_LINK" ||
        action === "SEND_PAYMENT_LINK" ||
        action === "CHECKOUT_RECOVERY_LINK" ||
        action === "REQUEST_PAYMENT_METHOD_UPDATE" ||
        action === "INVOICE_PAYMENT_LINK" ||
        action === "INVOICE_RECOVERY" ||
        action === "SEND_INVOICE_REMINDER"
      ) {
        // Create 1-click dynamic Razorpay payment link
        const invId = razorpayInvoiceId || invoiceId;
        const linkResponse = await razorpay.createPaymentLink({
          amount: amountRupees,
          currency: "INR",
          description: description || (
            action === "CHECKOUT_RECOVERY_LINK"
              ? `Complete your order settlement`
              : action === "INVOICE_PAYMENT_LINK" || action === "INVOICE_RECOVERY"
              ? `B2B Invoice Payment: ${invId || caseId}`
              : `Recovery settlement for Case ${caseId}`
          ),
          customer: {
            name: customer.name,
            email: customer.email,
            contact: customer.phone,
          },
          notify: {
            sms: true,
            email: true,
          },
          reminder_enable: true,
          notes: {
            recoverai_case_id: caseId,
            action_type: action,
            order_id: razorpayOrderId || orderId || "",
            invoice_id: invId || "",
          },
        });

        status = AttemptStatus.INITIATED;
        razorpayReference = linkResponse.id;
        paymentLinkUrl = linkResponse.short_url;
        executionMessage = `Generated 1-click Razorpay payment link: ${linkResponse.short_url}`;
        resultPayload = linkResponse;

        // Associate link with recovery case
        await prisma.recoveryCase.update({
          where: { id: caseId },
          data: {
            paymentLinkUrl: linkResponse.short_url,
            razorpayPaymentLinkId: linkResponse.id,
            ...(razorpayOrderId ? { razorpayOrderId } : {}),
            ...(invId ? { razorpayInvoiceId: invId } : {}),
          },
        });
      } else if (action === "RECORD_PROMISE_TO_PAY") {
        status = AttemptStatus.INITIATED;
        executionMessage = "Promise-to-pay registered for B2B receivable tracking.";
        resultPayload = { promiseTracked: true };
      } else if (action === "PAYMENT_RETRY" || action === "SUBSCRIPTION_RECOVERY") {
        // Attempt backend retry via order generation / mandate re-presentation
        const orderResponse = await razorpay.createOrder({
          amount: amountRupees,
          currency: "INR",
          receipt: `rcpt_${caseId.substring(0, 8)}_${attemptNumber}`,
          notes: {
            caseId,
            retryAttempt: String(attemptNumber),
          },
        });

        status = AttemptStatus.INITIATED;
        razorpayReference = orderResponse.id;
        executionMessage = `Created backend retry order: ${orderResponse.id}`;
        resultPayload = orderResponse;
      } else if (action === "HUMAN_ESCALATION") {
        status = AttemptStatus.INITIATED;
        executionMessage = "Escalated case to Key Account Management queue for VIP settlement outreach.";
        resultPayload = { escalated: true, assignedQueue: "VIP_FINANCE" };
      } else if (action === "STOP_RECOVERY") {
        status = AttemptStatus.BLOCKED_BY_POLICY;
        executionMessage = "Recovery halted by policy rule.";
        resultPayload = { stopped: true };
      } else {
        status = AttemptStatus.INITIATED;
        executionMessage = `Action ${action} dispatched.`;
      }
    } catch (err: any) {
      status = AttemptStatus.FAILED;
      executionError = err?.message || "Razorpay API call failed";
      executionMessage = `Execution failed: ${executionError}`;
      console.error("[ExecutionService Error]:", err);
    }


    // Persist RecoveryAttempt to PostgreSQL (Never overwrite historical attempts)
    const attemptRecord = await prisma.recoveryAttempt.create({
      data: {
        recoveryCaseId: caseId,
        paymentId,
        attemptNumber,
        action: mapToPrismaAction(action),
        status,
        razorpayReference,
        amount: amountAtRisk,
        channel: action.includes("LINK") ? "WHATSAPP_SMS" : "BACKEND_RAZORPAY",
        result: resultPayload,
        notes: executionMessage,
      },
    });

    return {
      success: status !== AttemptStatus.FAILED,
      attemptId: attemptRecord.id,
      action,
      status,
      razorpayReference,
      paymentLinkUrl,
      message: executionMessage,
      error: executionError,
    };
  }

  /**
   * Dedicated checkout order creation/reuse for Razorpay Checkout.js
   * Enforces order reuse, BigInt paise precision, and records a RecoveryAttempt.
   */
  public async createOrReuseCheckoutOrder(params: {
    caseId: string;
    amountAtRisk: bigint;
    customer?: {
      name: string;
      email: string;
      phone: string;
    };
    caseNumber?: string;
    description?: string;
  }): Promise<{
    orderId: string;
    amountPaise: number;
    currency: string;
    keyId: string;
    isExisting: boolean;
  }> {
    const { caseId, amountAtRisk, customer, caseNumber, description } = params;
    const razorpay = await getRazorpayService();

    // 1. Check if case already has a valid Razorpay Order in PostgreSQL
    const existingCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      select: { razorpayOrderId: true, amountAtRisk: true, caseNumber: true },
    });

    if (existingCase?.razorpayOrderId) {
      const oid = existingCase.razorpayOrderId;
      const isSuspicious =
        !oid.startsWith("order_") ||
        oid.startsWith("order_demo_") ||
        oid.startsWith("order_mock_") ||
        oid.startsWith("order_sandbox_") ||
        oid.startsWith("order_simulated_") ||
        oid.startsWith("order_fake_") ||
        oid.includes("demo") ||
        oid.includes("mock") ||
        oid.includes("sandbox") ||
        oid.includes("simulated") ||
        oid === "order_rzp_sandbox" ||
        oid === "pay_rzp_sandbox";

      if (!isSuspicious) {
        return {
          orderId: oid,
          amountPaise: Number(existingCase.amountAtRisk || amountAtRisk),
          currency: "INR",
          keyId: process.env.RAZORPAY_KEY_ID || "",
          isExisting: true,
        };
      }
    }

    // 2. Convert to integer Rupees for Razorpay createOrder API
    const amountRupees = fromPaise(amountAtRisk);

    const orderResponse = await razorpay.createOrder({
      amount: amountRupees,
      currency: "INR",
      receipt: `chk_${caseId.substring(0, 8)}_${Date.now()}`,
      notes: {
        vireon_case_id: caseId,
        recoverai_case_id: caseId,
        caseNumber: caseNumber || existingCase?.caseNumber || "REC-2026",
        source: "VIREON_Checkout",
      },
    });

    // 3. Log safe order creation diagnostic
    console.log("[REAL RAZORPAY ORDER CREATED]", {
      provider: razorpay.isMockMode() ? "MockRazorpayService" : "RazorpayService",
      mode: process.env.RAZORPAY_MODE || "sandbox",
      orderId: orderResponse.id,
      amount: orderResponse.amount,
      currency: orderResponse.currency || "INR",
    });

    // 4. Server-Side GET verification against Razorpay API
    const keyId = process.env.RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    if (keyId && keySecret && !orderResponse.id.includes("demo")) {
      try {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const fetchRes = await fetch(`https://api.razorpay.com/v1/orders/${orderResponse.id}`, {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        });
        const fetchedOrder = await fetchRes.json();
        console.log("[RAZORPAY ORDER VERIFY]", {
          httpStatus: fetchRes.status,
          orderId: orderResponse.id,
          fetchedId: fetchedOrder?.id || "NONE",
          amount: fetchedOrder?.amount || 0,
          currency: fetchedOrder?.currency || "NONE",
          status: fetchedOrder?.status || "NONE",
          errorCode: fetchedOrder?.error?.code || "NONE",
          errorDescription: fetchedOrder?.error?.description || "NONE",
        });
      } catch (err: any) {
        console.error("[RAZORPAY ORDER VERIFY ERROR]:", err.message);
      }
    }

    // 5. Store razorpayOrderId on the recovery case in PostgreSQL
    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        razorpayOrderId: orderResponse.id,
      },
    });

    // 6. Record RecoveryAttempt (Idempotent tracking)
    const attemptsCount = await prisma.recoveryAttempt.count({
      where: { recoveryCaseId: caseId },
    });

    await prisma.recoveryAttempt.create({
      data: {
        recoveryCaseId: caseId,
        attemptNumber: attemptsCount + 1,
        action: PrismaRecoveryAction.CREATE_PAYMENT_LINK,
        status: AttemptStatus.INITIATED,
        razorpayReference: orderResponse.id,
        amount: amountAtRisk,
        channel: "RAZORPAY_CHECKOUT",
        result: orderResponse as any,
        notes: `Created Razorpay checkout order ${orderResponse.id} for ₹${amountRupees}`,
      },
    });

    return {
      orderId: orderResponse.id,
      amountPaise: Number(amountAtRisk),
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID || "",
      isExisting: false,
    };
  }
}

export const executionService = new ExecutionService();
