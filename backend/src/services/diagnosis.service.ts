import { z } from "zod";

export const RootCauseEnum = z.enum([
  "TEMPORARY_PAYMENT_FAILURE",
  "INSUFFICIENT_FUNDS",
  "PAYMENT_METHOD_ISSUE",
  "CARD_EXPIRED",
  "MANDATE_ISSUE",
  "AUTHENTICATION_FAILURE",
  "REPEATED_FAILURE",
  "REPEATED_SUBSCRIPTION_FAILURE",
  "CHECKOUT_ABANDONMENT",
  "CHECKOUT_TIMEOUT",
  "PAYMENT_METHOD_FRICTION",
  "PAYMENT_ATTEMPT_FAILED",
  "UNKNOWN_CHECKOUT_ABANDONMENT",
  "SUBSCRIPTION_FAILURE",
  "SUBSCRIPTION_PAYMENT_FAILURE",
  "SUBSCRIPTION_HALTED",
  "UNKNOWN_SUBSCRIPTION_FAILURE",
  "OVERDUE_INVOICE",
  "MISSED_PROMISE_TO_PAY",
  "ENTERPRISE_DISPUTE",
  "ACCOUNTS_PAYABLE_DELAY",
  "UNKNOWN",
]);

export type RootCauseType = z.infer<typeof RootCauseEnum>;

export const DiagnosisOutputSchema = z.object({
  rootCause: RootCauseEnum,
  confidence: z.number().min(0).max(1),
  explanation: z.string(),
  isTransient: z.boolean(),
  recommendedStep: z.string(),
});

export type DiagnosisOutput = z.infer<typeof DiagnosisOutputSchema>;
export type DiagnosisResult = DiagnosisOutput;

export interface DiagnosisInput {
  errorCode?: string | null;
  errorDescription?: string | null;
  errorStep?: string | null;
  errorSource?: string | null;
  errorReason?: string | null;
  paymentMethod?: string | null;
  attempts?: number;
  isSubscription?: boolean;
  subscriptionStatus?: string | null;
  failureReason?: string | null;
  isInvoice?: boolean;
  isPromiseToPay?: boolean;
  isCheckout?: boolean;
  checkoutAgeMinutes?: number;
  daysOverdue?: number;
}

export class DiagnosisService {
  /**
   * Determine why revenue is at risk using deterministic heuristics with Zod validation.
   */
  public async diagnose(input: DiagnosisInput): Promise<DiagnosisOutput> {
    const code = (input.errorCode || "").toUpperCase();
    const desc = (input.errorDescription || input.failureReason || "").toLowerCase();
    const step = (input.errorStep || "").toLowerCase();
    const reason = (input.errorReason || "").toLowerCase();
    const method = (input.paymentMethod || "").toLowerCase();
    const subStatus = (input.subscriptionStatus || "").toLowerCase();

    let rootCause: RootCauseType = input.isCheckout
      ? "CHECKOUT_ABANDONMENT"
      : input.isSubscription
      ? "UNKNOWN_SUBSCRIPTION_FAILURE"
      : input.isInvoice
      ? "OVERDUE_INVOICE"
      : "UNKNOWN";
    let confidence = 0.85;
    let explanation = "Standard transaction failure detected.";
    let isTransient = false;
    let recommendedStep = "Initiate automated payment retry";


    if (input.isPromiseToPay || desc.includes("broken promise") || desc.includes("missed promise") || code.includes("PROMISE")) {
      rootCause = "MISSED_PROMISE_TO_PAY";
      confidence = 0.95;
      explanation = "Customer failed to fulfill scheduled B2B promise-to-pay commitment.";
      isTransient = false;
      recommendedStep = "Account manager escalation & WhatsApp invoice reminder";
    } else if (input.isInvoice || desc.includes("overdue invoice") || code.includes("INVOICE")) {
      if (desc.includes("dispute") || code.includes("DISPUTE")) {
        rootCause = "ENTERPRISE_DISPUTE";
        confidence = 0.93;
        explanation = "Enterprise customer raised commercial or billing dispute on invoice line items.";
        isTransient = false;
        recommendedStep = "Escalate to dedicated enterprise account executive for commercial resolution";
      } else if (desc.includes("ap delay") || desc.includes("accounts payable") || desc.includes("processing delay")) {
        rootCause = "ACCOUNTS_PAYABLE_DELAY";
        confidence = 0.90;
        explanation = "Corporate Accounts Payable department processing batch cycle delay.";
        isTransient = true;
        recommendedStep = "Dispatch official corporate payment link & request AP payment schedule date";
      } else {
        rootCause = "OVERDUE_INVOICE";
        confidence = 0.92;
        explanation = "Enterprise invoice has passed due date without payment capture.";
        isTransient = false;
        recommendedStep = "Send dynamic invoice payment link with NetBanking/RTGS option";
      }
    } else if (subStatus === "halted" || desc.includes("subscription halted") || code.includes("SUB_HALTED")) {
      rootCause = "SUBSCRIPTION_HALTED";
      confidence = 0.98;
      explanation = "Subscription reached terminal halted state due to repeated presentation failures.";
      isTransient = false;
      recommendedStep = "Dispatch high-priority subscription recovery link & request payment method update";
    } else if (input.isCheckout || step.includes("checkout") || desc.includes("abandon")) {
      if (desc.includes("timeout") || code.includes("TIMEOUT")) {
        rootCause = "CHECKOUT_TIMEOUT";
        confidence = 0.92;
        explanation = "Checkout session elapsed past abandonment window without payment authorization.";
        isTransient = false;
        recommendedStep = "Dispatch 1-click checkout recovery link to resume cart settlement";
      } else if (desc.includes("friction") || desc.includes("declined") || code.includes("FRICTION") || code.includes("METHOD")) {
        rootCause = "PAYMENT_METHOD_FRICTION";
        confidence = 0.90;
        explanation = "Customer experienced friction with selected payment instrument during checkout.";
        isTransient = false;
        recommendedStep = "Send prefilled checkout link with alternative UPI / Card methods";
      } else if ((input.attempts && input.attempts >= 1) || desc.includes("failed") || code.includes("FAIL")) {
        rootCause = "PAYMENT_ATTEMPT_FAILED";
        confidence = 0.94;
        explanation = "Customer attempted payment during checkout but authorization failed.";
        isTransient = false;
        recommendedStep = "Dispatch 1-click checkout recovery link with instant retry";
      } else {
        rootCause = "CHECKOUT_ABANDONMENT";
        confidence = 0.88;
        explanation = "User initiated checkout session but abandoned before completing authorization.";
        isTransient = false;
        recommendedStep = "Send abandonment recovery link with prefilled checkout session";
      }
    } else if (code.includes("EXPIRED") || desc.includes("card expired") || reason.includes("expired")) {
      rootCause = "CARD_EXPIRED";
      confidence = 0.97;
      explanation = "Customer's recurring debit card has reached expiration date.";
      isTransient = false;
      recommendedStep = "Prompt customer to update card credentials or register new UPI autopay";
    } else if (code.includes("MANDATE") || desc.includes("mandate") || reason.includes("mandate") || desc.includes("mandate inactive")) {
      rootCause = "MANDATE_ISSUE";
      confidence = 0.95;
      explanation = "Mandate registration is inactive, revoked, or rejected by the issuing bank.";
      isTransient = false;
      recommendedStep = "Dispatch 1-click mandate instrument update link";
    } else if (code.includes("INSUFFICIENT") || desc.includes("funds") || reason.includes("funds")) {
      rootCause = "INSUFFICIENT_FUNDS";
      confidence = 0.96;
      explanation = "Bank CBS reported insufficient balance for debit presentation.";
      isTransient = true;
      recommendedStep = "Schedule smart retry aligned with salary credit window";
    } else if (input.isSubscription && input.attempts && input.attempts >= 2) {
      rootCause = "REPEATED_SUBSCRIPTION_FAILURE";
      confidence = 0.94;
      explanation = "Recurring subscription failed on multiple consecutive debit cycles.";
      isTransient = false;
      recommendedStep = "Dispatch multi-channel subscription recovery link";
    } else if (
      code.includes("AUTH") ||
      code.includes("3DS") ||
      code.includes("OTP") ||
      step.includes("auth") ||
      desc.includes("authentication") ||
      reason.includes("3ds")
    ) {
      rootCause = "AUTHENTICATION_FAILURE";
      confidence = 0.94;
      explanation = "Customer dropped off or failed OTP / 3DS authentication challenge.";
      isTransient = false;
      recommendedStep = "Dispatch 1-click Razorpay payment link via WhatsApp / SMS";
    } else if (code.includes("INVALID") || code.includes("LOST") || desc.includes("invalid card") || desc.includes("invalid instrument")) {
      rootCause = "PAYMENT_METHOD_ISSUE";
      confidence = 0.98;
      explanation = "Payment instrument invalid or blocked by issuing bank.";
      isTransient = false;
      recommendedStep = "Request customer to update payment method or add new card/UPI mandate";
    } else if (
      code.includes("GATEWAY") ||
      code.includes("TIMEOUT") ||
      code.includes("NETWORK") ||
      desc.includes("bank down") ||
      desc.includes("timeout")
    ) {
      rootCause = "TEMPORARY_PAYMENT_FAILURE";
      confidence = 0.90;
      explanation = "Temporary bank switch outage or network timeout during authorization.";
      isTransient = true;
      recommendedStep = "Queue exponential backoff retry via alternative payment rail";
    } else if (input.isSubscription || method === "nach" || method === "upi_autopay") {
      rootCause = "SUBSCRIPTION_PAYMENT_FAILURE";
      confidence = 0.90;
      explanation = "Recurring subscription mandate debit failed on schedule.";
      isTransient = true;
      recommendedStep = "Dispatch 1-click subscription payment recovery link";
    } else if (input.attempts && input.attempts >= 2) {
      rootCause = "REPEATED_FAILURE";
      confidence = 0.92;
      explanation = "Multiple consecutive attempts failed across payment channels.";
      isTransient = false;
      recommendedStep = "Multi-channel recovery link with alternative payment methods";
    }

    const diagnosis = {
      rootCause,
      confidence,
      explanation,
      isTransient,
      recommendedStep,
    };

    return DiagnosisOutputSchema.parse(diagnosis);
  }
}

export const diagnosisService = new DiagnosisService();

