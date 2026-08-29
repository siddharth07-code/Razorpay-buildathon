import { z } from "zod";
import { RootCauseType } from "./diagnosis.service";
import { RiskOutput } from "./risk.service";
import { fromPaise } from "../utils/money";

export const RecoveryActionEnum = z.enum([
  "PAYMENT_RETRY",
  "CREATE_PAYMENT_LINK",
  "SEND_PAYMENT_LINK",
  "SEND_REMINDER",
  "REQUEST_PAYMENT_METHOD_UPDATE",
  "SUBSCRIPTION_RECOVERY",
  "SUBSCRIPTION_PAYMENT_RECOVERY",
  "SUBSCRIPTION_LINK_RECOVERY",
  "CHECKOUT_RECOVERY_LINK",
  "INVOICE_RECOVERY",
  "INVOICE_PAYMENT_LINK",
  "RECORD_PROMISE_TO_PAY",
  "SEND_INVOICE_REMINDER",
  "HUMAN_ESCALATION",
  "STOP_RECOVERY",
]);

export type RecoveryAction = z.infer<typeof RecoveryActionEnum>;

export const StrategyOutputSchema = z.object({
  action: RecoveryActionEnum,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  expectedRecoveryValue: z.bigint(),
  isDirectlySupportedByRazorpay: z.boolean(),
  requiresCustomerInteraction: z.boolean(),
});

export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;
export type StrategyResult = StrategyOutput;

export interface StrategyInput {
  amountAtRisk: bigint;
  paymentMethod?: string;
  rootCause: RootCauseType;
  risk: RiskOutput;
  recoveryAttemptsCount: number;
  customerContactCount: number;
  isHighValue?: boolean;
}

export class StrategyService {
  /**
   * Selects an action from a strict CLOSED SET of recovery actions.
   * ExecutionService decides if the action is directly executable via Razorpay.
   */
  public selectStrategy(input: StrategyInput): StrategyOutput {
    const { rootCause, risk, recoveryAttemptsCount, amountAtRisk } = input;
    const amountRupees = fromPaise(amountAtRisk);

    let action: RecoveryAction = "CREATE_PAYMENT_LINK";
    let confidence = 0.90;
    let explanation = "Generate 1-click Razorpay payment link.";
    let isDirectlySupportedByRazorpay = true;
    let requiresCustomerInteraction = true;

    // Rule 1: High attempts fatigue -> Escalate or Stop
    if (recoveryAttemptsCount >= 3) {
      if (amountRupees >= 100000) {
        action = "HUMAN_ESCALATION";
        confidence = 0.95;
        explanation = "Maximum automated retry threshold reached for high-value account. Escalating to Key Account Manager.";
        isDirectlySupportedByRazorpay = false;
        requiresCustomerInteraction = false;
      } else {
        action = "STOP_RECOVERY";
        confidence = 0.99;
        explanation = "Maximum automated retry attempts (3) exhausted. Halting recovery to preserve customer relationship.";
        isDirectlySupportedByRazorpay = false;
        requiresCustomerInteraction = false;
      }
    }
    // Rule 2: Checkout Abandonment & Checkout Timeout
    else if (
      rootCause === "CHECKOUT_ABANDONMENT" ||
      rootCause === "CHECKOUT_TIMEOUT" ||
      rootCause === "PAYMENT_ATTEMPT_FAILED" ||
      rootCause === "UNKNOWN_CHECKOUT_ABANDONMENT"
    ) {
      action = "CHECKOUT_RECOVERY_LINK";
      confidence = 0.95;
      explanation = "Dispatching 1-click prefilled Razorpay checkout recovery link to restore abandoned shopping cart.";
      isDirectlySupportedByRazorpay = true;
      requiresCustomerInteraction = true;
    }
    // Rule 3: Payment Method Friction
    else if (rootCause === "PAYMENT_METHOD_FRICTION") {
      action = "REQUEST_PAYMENT_METHOD_UPDATE";
      confidence = 0.92;
      explanation = "Sending recovery link with alternative payment options (UPI, NetBanking, Cards) to bypass method friction.";
      isDirectlySupportedByRazorpay = true;
      requiresCustomerInteraction = true;
    }
    // Rule 4: Subscription Halted
    else if (rootCause === "SUBSCRIPTION_HALTED") {
      if (amountRupees >= 100000) {
        action = "HUMAN_ESCALATION";
        confidence = 0.96;
        explanation = "High-value subscription reached halted status. Flagging for account manager intervention.";
        isDirectlySupportedByRazorpay = false;
        requiresCustomerInteraction = false;
      } else {
        action = "SUBSCRIPTION_LINK_RECOVERY";
        confidence = 0.94;
        explanation = "Dispatching dedicated subscription recovery link to restart billing cycle.";
        isDirectlySupportedByRazorpay = true;
        requiresCustomerInteraction = true;
      }
    }
    // Rule 5: Expired Card / Mandate Issue / Instrument Update
    else if (rootCause === "CARD_EXPIRED" || rootCause === "MANDATE_ISSUE" || rootCause === "PAYMENT_METHOD_ISSUE") {
      action = "REQUEST_PAYMENT_METHOD_UPDATE";
      confidence = 0.95;
      explanation = "Payment instrument invalid or expired. Prompting customer to register updated payment method.";
      isDirectlySupportedByRazorpay = true;
      requiresCustomerInteraction = true;
    }
    // Rule 6: Repeated Subscription Failure
    else if (rootCause === "REPEATED_SUBSCRIPTION_FAILURE") {
      action = "SUBSCRIPTION_LINK_RECOVERY";
      confidence = 0.92;
      explanation = "Repeated mandate failures detected. Providing hosted 1-click subscription settlement link.";
      isDirectlySupportedByRazorpay = true;
      requiresCustomerInteraction = true;
    }
    // Rule 7: Generic Subscription Payment Failure
    else if (rootCause === "SUBSCRIPTION_PAYMENT_FAILURE" || rootCause === "SUBSCRIPTION_FAILURE" || rootCause === "UNKNOWN_SUBSCRIPTION_FAILURE") {
      action = "SUBSCRIPTION_PAYMENT_RECOVERY";
      confidence = 0.90;
      explanation = "Dispatching 1-click Razorpay subscription recovery link with instant UPI/Card retry.";
      isDirectlySupportedByRazorpay = true;
      requiresCustomerInteraction = true;
    }
    // Rule 8: Temporary Bank Failure / Gateway Glitch
    else if (rootCause === "TEMPORARY_PAYMENT_FAILURE") {
      if (recoveryAttemptsCount === 0) {
        action = "PAYMENT_RETRY";
        confidence = 0.92;
        explanation = "Transient gateway downtime detected. Scheduling autonomous backend retry.";
        isDirectlySupportedByRazorpay = true;
        requiresCustomerInteraction = false;
      } else {
        action = "CREATE_PAYMENT_LINK";
        confidence = 0.88;
        explanation = "Fallback to direct customer payment link after initial gateway retry.";
        isDirectlySupportedByRazorpay = true;
        requiresCustomerInteraction = true;
      }
    }
    // Rule 9: Insufficient Funds
    else if (rootCause === "INSUFFICIENT_FUNDS") {
      if (recoveryAttemptsCount === 0 && (input.paymentMethod === "nach" || input.paymentMethod === "upi")) {
        action = "SUBSCRIPTION_RECOVERY";
        confidence = 0.91;
        explanation = "Scheduling optimal mandate re-presentation at next bank clearing window.";
        isDirectlySupportedByRazorpay = true;
        requiresCustomerInteraction = false;
      } else {
        action = "CREATE_PAYMENT_LINK";
        confidence = 0.93;
        explanation = "Dispatching interactive payment link allowing instant settlement via UPI / NetBanking.";
        isDirectlySupportedByRazorpay = true;
        requiresCustomerInteraction = true;
      }
    }
    // Rule 10: Authentication Failure / 3DS Dropoff
    else if (rootCause === "AUTHENTICATION_FAILURE") {
      action = "CREATE_PAYMENT_LINK";
      confidence = 0.96;
      explanation = "Sending 1-click prefilled Razorpay checkout link directly to customer WhatsApp / SMS.";
      isDirectlySupportedByRazorpay = true;
      requiresCustomerInteraction = true;
    }
    // Rule 11: Missed Promise-to-Pay or Enterprise Dispute
    else if (rootCause === "MISSED_PROMISE_TO_PAY" || rootCause === "ENTERPRISE_DISPUTE") {
      action = "HUMAN_ESCALATION";
      confidence = 0.96;
      explanation = rootCause === "MISSED_PROMISE_TO_PAY"
        ? "Customer failed to fulfill scheduled B2B promise-to-pay commitment. Escalating to account manager for immediate collection."
        : "Enterprise commercial dispute flagged on invoice line items. Account manager resolution required.";
      isDirectlySupportedByRazorpay = false;
      requiresCustomerInteraction = false;
    }
    // Rule 12: Overdue B2B Invoice & AP Delays
    else if (rootCause === "OVERDUE_INVOICE" || rootCause === "ACCOUNTS_PAYABLE_DELAY") {
      action = "INVOICE_PAYMENT_LINK";
      confidence = 0.94;
      explanation = "Dispatched 1-click Razorpay B2B invoice collection link with NetBanking/RTGS virtual account details.";
      isDirectlySupportedByRazorpay = true;
      requiresCustomerInteraction = true;
    }

    const output = {
      action,
      confidence,
      explanation,
      expectedRecoveryValue: risk.expectedRecoveryValue,
      isDirectlySupportedByRazorpay,
      requiresCustomerInteraction,
    };

    return StrategyOutputSchema.parse(output);
  }
}

export const strategyService = new StrategyService();


