import {
  StrategyAgentInput,
  StrategyAgentOutput,
  RecoveryAction,
} from "./types";

export class RecoveryStrategyAgent {
  /**
   * Select optimal recovery strategy using valid Razorpay supported operations.
   * Does NOT invent non-existent Razorpay endpoints.
   */
  public selectStrategy(input: StrategyAgentInput): StrategyAgentOutput {
    const { payment, customer, subscription, risk, diagnosis, recoveryAttemptsCount } = input;
    const { rootCause } = diagnosis;
    const amount = payment.amount;

    // 1. If repeated failure limit reached or high risk with zero customer response
    if (recoveryAttemptsCount >= 3) {
      return {
        action: "ESCALATE_TO_HUMAN",
        confidence: 0.95,
        expectedRecoveryValue: risk.expectedRecoveryValue,
        channel: "ACCOUNT_MANAGER",
        reason: `Maximum automated retry policy limit reached (${recoveryAttemptsCount} attempts). Handing off to human account manager.`,
      };
    }

    // 2. Insufficient Funds on Mandate / Subscription
    if (rootCause === "insufficient_funds") {
      if (subscription || payment.method === "nach") {
        return {
          action: "RETRY_SUBSCRIPTION",
          confidence: 0.92,
          expectedRecoveryValue: risk.expectedRecoveryValue,
          channel: "RAZORPAY_RETRY",
          suggestedSchedule: "Scheduled for 02:30 PM IST during peak liquidity window",
          reason: "Bank CBS clearing failure due to early morning balance dip. Optimal strategy is scheduling mandate retry for afternoon clearing batch.",
        };
      } else {
        return {
          action: "CREATE_PAYMENT_LINK",
          confidence: 0.88,
          expectedRecoveryValue: risk.expectedRecoveryValue,
          channel: "WHATSAPP",
          reason: "Customer account balance low on primary card. Dispatch dynamic Razorpay Payment Link allowing alternate UPI / Netbanking payment.",
        };
      }
    }

    // 3. 3DS Authentication Failure / Checkout Drop
    if (rootCause === "authentication_failure" || rootCause === "checkout_abandonment") {
      return {
        action: "CREATE_PAYMENT_LINK",
        confidence: 0.91,
        expectedRecoveryValue: risk.expectedRecoveryValue,
        channel: "WHATSAPP",
        reason: "Customer dropped off at OTP screen. Generating interactive Razorpay Payment Link with 1-touch UPI Intent bypasses card 3DS friction.",
      };
    }

    // 4. Expired Card / Inactive Token
    if (rootCause === "payment_method_issue") {
      return {
        action: "REQUEST_PAYMENT_METHOD_UPDATE",
        confidence: 0.94,
        expectedRecoveryValue: risk.expectedRecoveryValue,
        channel: "EMAIL",
        reason: "Stored card token expired. Dispatched secure payment update link to capture updated card token with RBI compliant e-mandate consent.",
      };
    }

    // 5. Transient Gateway Glitch
    if (rootCause === "temporary_payment_failure") {
      if (subscription) {
        return {
          action: "RETRY_SUBSCRIPTION",
          confidence: 0.96,
          expectedRecoveryValue: risk.expectedRecoveryValue,
          channel: "RAZORPAY_RETRY",
          suggestedSchedule: "Immediate retry after gateway health confirmation",
          reason: "Downstream partner bank gateway error resolved. Trigger immediate recurring charge via Razorpay API.",
        };
      } else {
        return {
          action: "CREATE_PAYMENT_LINK",
          confidence: 0.89,
          expectedRecoveryValue: risk.expectedRecoveryValue,
          channel: "WHATSAPP",
          reason: "Transient gateway downtime on customer's selected bank. Generating Razorpay payment link with multi-rail backup options.",
        };
      }
    }

    // 6. High Value Thresholds (> ₹1,00,000)
    if (amount >= 100000 && customer?.tier === "ENTERPRISE") {
      return {
        action: "ESCALATE_TO_HUMAN",
        confidence: 0.90,
        expectedRecoveryValue: risk.expectedRecoveryValue,
        channel: "ACCOUNT_MANAGER",
        reason: `High value enterprise revenue (₹${amount.toLocaleString("en-IN")}) requires high-touch relationship manager engagement alongside automated payment link generation.`,
      };
    }

    // Default Fallback: Create dynamic Razorpay Payment Link
    return {
      action: "CREATE_PAYMENT_LINK",
      confidence: 0.82,
      expectedRecoveryValue: risk.expectedRecoveryValue,
      channel: "EMAIL",
      reason: "Creating dynamic Razorpay Payment Link to provide customer with verified payment portal.",
    };
  }
}

export const recoveryStrategyAgent = new RecoveryStrategyAgent();
