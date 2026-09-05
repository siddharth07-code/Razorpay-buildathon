import {
  ExecutionAgentInput,
  ExecutionAgentOutput,
} from "./types";
import { getRazorpayService } from "../razorpay/provider";

export class ExecutionAgent {
  /**
   * Execute approved actions against Razorpay provider.
   * NEVER called directly from LLMs. All calls flow through deterministic policy checks.
   */
  public async execute(input: ExecutionAgentInput): Promise<ExecutionAgentOutput> {
    const { caseId, strategy, policy, payment, customer, subscription } = input;

    // 1. Check if rejected by policy
    if (!policy.allowed) {
      return {
        success: false,
        executedAction: "REJECTED",
        channel: strategy.channel,
        executionStatus: "REJECTED_BY_POLICY",
        message: `Execution blocked by policy engine: ${policy.reason}`,
      };
    }

    // 2. Check if human approval is required (> ₹1,00,000 threshold)
    if (policy.requiresHumanApproval) {
      return {
        success: true,
        executedAction: strategy.action,
        channel: strategy.channel,
        executionStatus: "QUEUED_FOR_APPROVAL",
        message: `Action '${strategy.action}' queued for merchant operations review. Amount (₹${payment.amount.toLocaleString("en-IN")}) requires authorization.`,
      };
    }

    const razorpayService = await getRazorpayService();

    try {
      if (strategy.action === "CREATE_PAYMENT_LINK" || strategy.action === "SEND_PAYMENT_LINK") {
        const link = await razorpayService.createPaymentLink({
          amount: payment.amount,
          description: `VIREON Recovery for Case #${caseId}`,
          customer: {
            name: customer?.name || "Customer",
            email: customer?.email || "customer@example.in",
            contact: customer?.phone || "+919876543210",
          },
          notes: {
            caseId,
            originPaymentId: payment.id,
            reason: strategy.reason,
          },
        });

        return {
          success: true,
          executedAction: strategy.action,
          channel: strategy.channel,
          razorpayPaymentLinkId: link.id,
          paymentLinkUrl: link.short_url,
          executionStatus: "WAITING_CUSTOMER_ACTION",
          message: `Created Razorpay Payment Link (${link.id}). Dispatched via ${strategy.channel}.`,
          details: { linkId: link.id, shortUrl: link.short_url },
        };
      }

      if (strategy.action === "RETRY_SUBSCRIPTION" || strategy.action === "RETRY_PAYMENT") {
        const retryResult = await razorpayService.triggerMandateRetry({
          subscriptionId: subscription?.id || payment.id,
          mandateId: subscription?.mandateId || "mandate_default",
          amount: payment.amount,
        });

        return {
          success: retryResult.success,
          executedAction: strategy.action,
          channel: strategy.channel,
          razorpayPaymentId: retryResult.paymentId,
          executionStatus: retryResult.success ? "EXECUTED" : "FAILED",
          message: retryResult.message,
          details: retryResult,
        };
      }

      if (strategy.action === "ESCALATE_TO_HUMAN") {
        return {
          success: true,
          executedAction: "ESCALATE_TO_HUMAN",
          channel: "ACCOUNT_MANAGER",
          executionStatus: "QUEUED_FOR_APPROVAL",
          message: "Case escalated to dedicated merchant account manager for bespoke resolution.",
        };
      }

      if (strategy.action === "REQUEST_PAYMENT_METHOD_UPDATE") {
        const link = await razorpayService.createPaymentLink({
          amount: payment.amount,
          description: `Update Payment Method & Renew Subscription #${caseId}`,
          customer: {
            name: customer?.name || "Customer",
            email: customer?.email || "customer@example.in",
            contact: customer?.phone || "+919876543210",
          },
        });

        return {
          success: true,
          executedAction: "REQUEST_PAYMENT_METHOD_UPDATE",
          channel: "EMAIL",
          razorpayPaymentLinkId: link.id,
          paymentLinkUrl: link.short_url,
          executionStatus: "WAITING_CUSTOMER_ACTION",
          message: `Dispatched payment instrument update link (${link.short_url}) via email.`,
        };
      }

      // Default notification
      return {
        success: true,
        executedAction: strategy.action,
        channel: strategy.channel,
        executionStatus: "EXECUTED",
        message: `Recovery strategy '${strategy.action}' dispatched.`,
      };
    } catch (error: any) {
      console.error("[ExecutionAgent] Razorpay execution error:", error);
      return {
        success: false,
        executedAction: strategy.action,
        channel: strategy.channel,
        executionStatus: "FAILED",
        message: `Failed to execute Razorpay API call: ${error?.message || "Unknown error"}`,
        error: error?.message,
      };
    }
  }
}

export const executionAgent = new ExecutionAgent();
