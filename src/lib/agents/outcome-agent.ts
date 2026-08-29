import { OutcomeAgentInput, OutcomeAgentOutput } from "./types";

export class OutcomeAgent {
  /**
   * Determine true financial outcome from Razorpay webhook or API response.
   * STRICT CRITICAL INVARIANT:
   * Payment Link Created != Revenue Recovered.
   * Payment Captured/Confirmed = Revenue Recovered.
   */
  public evaluateOutcome(input: OutcomeAgentInput): OutcomeAgentOutput {
    const { caseId, amount, razorpayEvent, razorpayPaymentStatus, executionResult } = input;

    // 1. Webhook explicitly confirmed capture or payment_link.paid or order.paid
    if (
      razorpayEvent === "payment.captured" ||
      razorpayEvent === "payment_link.paid" ||
      razorpayEvent === "order.paid" ||
      razorpayEvent === "subscription.charged" ||
      razorpayPaymentStatus === "captured"
    ) {
      return {
        status: "SUCCESS",
        isRecovered: true,
        recoveredAmount: amount,
        summary: `Payment confirmed and captured by Razorpay. Full capital of ₹${amount.toLocaleString("en-IN")} recovered.`,
      };
    }

    // 2. Webhook confirmed payment failure
    if (
      razorpayEvent === "payment.failed" ||
      razorpayEvent === "subscription.halted" ||
      razorpayPaymentStatus === "failed"
    ) {
      return {
        status: "FAILED",
        isRecovered: false,
        recoveredAmount: 0,
        summary: "Transaction attempt failed on downstream bank gateway.",
      };
    }

    // 3. Webhook confirmed link or order expiration
    if (razorpayEvent === "payment_link.expired" || razorpayEvent === "payment_link.cancelled") {
      return {
        status: "EXPIRED",
        isRecovered: false,
        recoveredAmount: 0,
        summary: "Payment link expired or cancelled without customer completion.",
      };
    }

    // 4. Execution state evaluation
    if (executionResult) {
      if (executionResult.executionStatus === "QUEUED_FOR_APPROVAL") {
        return {
          status: "ESCALATED",
          isRecovered: false,
          recoveredAmount: 0,
          summary: "Case escalated for manual review and operations approval.",
        };
      }

      if (executionResult.executionStatus === "WAITING_CUSTOMER_ACTION") {
        return {
          status: "PENDING",
          isRecovered: false,
          recoveredAmount: 0, // IMPORTANT: Payment link created is NEVER counted as recovered yet!
          summary: "Dynamic payment link generated. Awaiting customer completion.",
        };
      }

      if (executionResult.executionStatus === "REJECTED_BY_POLICY") {
        return {
          status: "STOPPED",
          isRecovered: false,
          recoveredAmount: 0,
          summary: `Recovery halted by policy rules: ${executionResult.message}`,
        };
      }

      if (executionResult.executionStatus === "EXECUTED" && executionResult.details?.status === "captured") {
        return {
          status: "SUCCESS",
          isRecovered: true,
          recoveredAmount: amount,
          summary: `Direct retry succeeded! ₹${amount.toLocaleString("en-IN")} captured.`,
        };
      }
    }

    // Default: Pending customer or system action
    return {
      status: "PENDING",
      isRecovered: false,
      recoveredAmount: 0,
      summary: "Recovery workflow in progress. Awaiting payment event.",
    };
  }
}

export const outcomeAgent = new OutcomeAgent();
