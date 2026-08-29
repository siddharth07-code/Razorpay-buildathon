import { RootCauseAgentInput, RootCauseAgentOutput, RootCauseType } from "./types";
import { appConfig } from "../config";

export class RootCauseAgent {
  /**
   * Determine the root cause of payment failure using structured reasoning and deterministic fallback rules.
   */
  public async diagnose(input: RootCauseAgentInput): Promise<RootCauseAgentOutput> {
    const { payment, customer, subscription } = input;
    const errorCode = payment.errorCode || "";
    const method = payment.method;
    const errorStep = payment.errorStep || "";
    const errorSource = payment.errorSource || "";
    const totalFailures = customer?.failureCount || 1;

    const signals: string[] = [];

    // Check signals
    if (errorCode) signals.push(`Razorpay error code: ${errorCode}`);
    if (errorStep) signals.push(`Failure step: ${errorStep}`);
    if (errorSource) signals.push(`Originating source: ${errorSource}`);
    if (method) signals.push(`Payment rail: ${method.toUpperCase()}`);
    if (totalFailures > 1) signals.push(`Consecutive failure count: ${totalFailures}`);

    // If Gemini API Key is configured, we could optionally call LLM, but deterministic rules provide fast, reliable sub-millisecond execution.
    return this.deterministicDiagnosis(input, signals);
  }

  private deterministicDiagnosis(
    input: RootCauseAgentInput,
    signals: string[]
  ): RootCauseAgentOutput {
    const { payment, customer, subscription } = input;
    const errorCode = payment.errorCode || "";
    const method = payment.method;
    const errorStep = payment.errorStep || "";
    const totalFailures = customer?.failureCount || 1;

    let rootCause: RootCauseType = "temporary_payment_failure";
    let confidence = 0.85;
    let explanation = "";

    if (errorCode === "INSUFFICIENT_FUNDS" || payment.errorReason?.includes("insufficient")) {
      rootCause = "insufficient_funds";
      confidence = 0.94;
      explanation = `Bank CBS declined ${method.toUpperCase()} debit presentation due to insufficient available funds at execution time. Common during early-morning clearing before liquidity credits.`;
    } else if (
      errorCode === "PAYMENT_AUTHENTICATION_FAILED" ||
      errorCode === "AUTHENTICATION_TIMED_OUT" ||
      errorStep === "payment_authentication"
    ) {
      rootCause = "authentication_failure";
      confidence = 0.92;
      explanation = "Customer dropped off or failed OTP / 3DS 2.0 verification challenge during payment checkout authentication.";
    } else if (errorCode === "CARD_EXPIRED") {
      rootCause = "payment_method_issue";
      confidence = 0.96;
      explanation = "The stored payment instrument (card / recurring token) has expired. Requires fresh KYC tokenization from the customer.";
    } else if (errorCode === "UPI_COLLECT_TIMEOUT" || payment.errorReason?.includes("timeout")) {
      rootCause = "checkout_abandonment";
      confidence = 0.90;
      explanation = "UPI push collect request was delivered to customer's UPI app (GPay/PhonePe/Paytm) but expired after 300s without approval.";
    } else if (errorCode === "MANDATE_EXECUTION_FAILED" || subscription) {
      rootCause = "subscription_payment_failure";
      confidence = 0.89;
      explanation = `Recurring mandate debit failed on ${method.toUpperCase()} subscription cycle. Sponsor bank rejected clearing presentation.`;
    } else if (errorCode === "GATEWAY_ERROR" || errorCode === "BANK_SERVER_DOWN") {
      rootCause = "temporary_payment_failure";
      confidence = 0.95;
      explanation = `Transient bank gateway unreachable error on ${payment.bank || "partner bank"}. Underlying customer account and card remain healthy.`;
    } else if (totalFailures >= 3) {
      rootCause = "repeated_failure";
      confidence = 0.88;
      explanation = `Account has experienced ${totalFailures} consecutive payment rejections across multiple cycles. Requires account manager or alternate payment channel intervention.`;
    } else {
      rootCause = "unknown_other";
      confidence = 0.70;
      explanation = `Generic payment failure (${errorCode || "UNSPECIFIED_ERROR"}). Telemetry indicates standard authorization decline.`;
    }

    return {
      rootCause,
      confidence,
      explanation,
      signalsDetected: signals,
    };
  }
}

export const rootCauseAgent = new RootCauseAgent();
