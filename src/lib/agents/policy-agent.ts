import { PolicyAgentInput, PolicyAgentOutput, RecoveryAction } from "./types";
import { appConfig } from "../config";

export class PolicyAgent {
  private maxPaymentRetries = appConfig.policy.maxPaymentRetries; // 3
  private maxCustomerContacts = appConfig.policy.maxCustomerContacts; // 3
  private minimumRetryIntervalHours = appConfig.policy.minimumRetryIntervalHours; // 12
  private humanApprovalAmount = appConfig.policy.humanApprovalAmount; // 100000 (₹1,00,000)

  // Explicit whitelist of operations supported by Razorpay
  private supportedRazorpayActions = new Set<RecoveryAction>([
    "RETRY_PAYMENT",
    "CREATE_PAYMENT_LINK",
    "SEND_PAYMENT_LINK",
    "REQUEST_PAYMENT_METHOD_UPDATE",
    "RETRY_SUBSCRIPTION",
    "SEND_NOTIFICATION",
    "CREATE_PROMISE_TO_PAY",
    "ESCALATE_TO_HUMAN",
    "STOP_RECOVERY",
  ]);

  /**
   * Deterministic Policy Enforcement.
   * AI heuristics CANNOT override these rules.
   */
  public evaluatePolicy(input: PolicyAgentInput): PolicyAgentOutput {
    const {
      amount,
      action,
      recoveryAttempts,
      customerContactCount,
      isDisputedInvoice = false,
      environment = appConfig.appEnv,
    } = input;

    const violations: string[] = [];
    let requiresHumanApproval = false;

    // Rule 1: Validate supported Razorpay action
    if (!this.supportedRazorpayActions.has(action)) {
      violations.push(`Action '${action}' is not supported by the Razorpay API provider.`);
    }

    // Rule 2: Retry count limit
    if (
      (action === "RETRY_PAYMENT" || action === "RETRY_SUBSCRIPTION") &&
      recoveryAttempts >= this.maxPaymentRetries
    ) {
      violations.push(
        `Policy violation: Maximum payment retry limit of ${this.maxPaymentRetries} attempts exceeded.`
      );
    }

    // Rule 3: Customer contact spam prevention limit
    if (
      (action === "SEND_PAYMENT_LINK" || action === "SEND_NOTIFICATION") &&
      customerContactCount >= this.maxCustomerContacts
    ) {
      violations.push(
        `Policy violation: Maximum customer contact frequency of ${this.maxCustomerContacts} contacts reached.`
      );
    }

    // Rule 4: Never process disputed invoices automatically
    if (isDisputedInvoice) {
      violations.push("Policy violation: Invoices under merchant/customer dispute cannot be processed automatically.");
    }

    // Rule 5: High Value threshold requires human approval (> ₹1,00,000)
    if (amount >= this.humanApprovalAmount) {
      requiresHumanApproval = true;
    }

    // Rule 6: Escalate to human if stopped or violations present
    if (action === "STOP_RECOVERY") {
      return {
        allowed: true,
        reason: "Recovery terminated as requested by policy or merchant configuration.",
        requiresHumanApproval: false,
        violations: [],
      };
    }

    if (violations.length > 0) {
      return {
        allowed: false,
        reason: `Policy check REJECTED: ${violations.join(" ")}`,
        requiresHumanApproval: true,
        violations,
      };
    }

    if (requiresHumanApproval) {
      return {
        allowed: true,
        reason: `Policy APPROVED with human sign-off requirement: Transaction value (₹${amount.toLocaleString("en-IN")}) exceeds automatic threshold of ₹${this.humanApprovalAmount.toLocaleString("en-IN")}.`,
        requiresHumanApproval: true,
        violations: [],
      };
    }

    return {
      allowed: true,
      reason: `Policy APPROVED: Action ${action} complies with all financial limits and retry caps.`,
      requiresHumanApproval: false,
      violations: [],
    };
  }
}

export const policyAgent = new PolicyAgent();
