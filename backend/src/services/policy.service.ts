import { z } from "zod";
import { RecoveryAction } from "./strategy.service";
import { fromPaise } from "../utils/money";

export const PolicyCodeEnum = z.enum([
  "POLICY_APPROVED",
  "POLICY_HUMAN_APPROVAL_REQUIRED",
  "POLICY_RETRY_LIMIT_REACHED",
  "POLICY_CONTACT_LIMIT_REACHED",
  "POLICY_RETRY_INTERVAL_NOT_MET",
  "POLICY_ALREADY_RECOVERED",
  "POLICY_SUBSCRIPTION_ALREADY_ACTIVE",
  "POLICY_INVOICE_ALREADY_PAID",
  "POLICY_ORDER_ALREADY_PAID",
  "POLICY_UNSUPPORTED_ACTION",
  "POLICY_DISPUTED",
  "POLICY_EXPIRED",
  "POLICY_LOW_RECOVERABILITY",
]);

export type PolicyCode = z.infer<typeof PolicyCodeEnum>;

export const PolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  requiresHumanApproval: z.boolean(),
  reason: z.string(),
  policyCode: PolicyCodeEnum,
  violations: z.array(z.string()),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
export type PolicyEvaluation = PolicyDecision;

export interface PolicyInput {
  caseId: string;
  amountAtRisk: bigint;
  action: RecoveryAction | string;
  recoveryAttemptsCount: number;
  customerContactCount: number;
  lastAttemptTimestamp?: Date | string | null;
  isDisputed?: boolean;
  isRecovered?: boolean;
  isExpired?: boolean;
  isSubscriptionActive?: boolean;
  isInvoicePaid?: boolean;
  isOrderPaid?: boolean;
  isAbandonmentWindowElapsed?: boolean;
  isSubscriptionHalted?: boolean;
  recoverabilityScore?: number;
}

export class PolicyService {
  // Hardcoded immutable policy constants
  public static readonly MAX_PAYMENT_RETRIES = 3;
  public static readonly MAX_CUSTOMER_CONTACTS = 3;
  public static readonly MINIMUM_RETRY_INTERVAL_HOURS = 12;
  public static readonly HUMAN_APPROVAL_AMOUNT = 10000000n; // ₹1,00,000 in paise (1,00,000 * 100)

  // Supported Razorpay execution actions
  private static readonly SUPPORTED_ACTIONS: Set<string> = new Set([
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

  /**
   * Deterministic Policy Engine
   * AI cannot override this engine under any circumstances.
   */
  public evaluatePolicy(input: PolicyInput): PolicyDecision {
    const amountRupees = fromPaise(input.amountAtRisk);
    const violations: string[] = [];

    // 1. Check if case is already recovered
    if (input.isRecovered) {
      return {
        allowed: false,
        requiresHumanApproval: false,
        reason: "Policy violation: Transaction is already marked as RECOVERED.",
        policyCode: "POLICY_ALREADY_RECOVERED",
        violations: ["Payment already recovered."],
      };
    }

    // 1b. Check if subscription is already active
    if (input.isSubscriptionActive) {
      return {
        allowed: false,
        requiresHumanApproval: false,
        reason: "Policy HALT: Razorpay subscription is already in ACTIVE status.",
        policyCode: "POLICY_SUBSCRIPTION_ALREADY_ACTIVE",
        violations: ["Subscription already active. Recovery cancelled."],
      };
    }

    // 1c. Check if invoice is already paid
    if (input.isInvoicePaid) {
      return {
        allowed: false,
        requiresHumanApproval: false,
        reason: "Policy HALT: Associated invoice is already marked as PAID.",
        policyCode: "POLICY_INVOICE_ALREADY_PAID",
        violations: ["Invoice already paid."],
      };
    }

    // 1d. Check if order is already paid
    if (input.isOrderPaid) {
      return {
        allowed: false,
        requiresHumanApproval: false,
        reason: "Policy HALT: Checkout order is already marked as PAID.",
        policyCode: "POLICY_ORDER_ALREADY_PAID",
        violations: ["Order already paid."],
      };
    }

    // 1e. Check abandonment window expiration
    if (input.isAbandonmentWindowElapsed === false) {
      return {
        allowed: false,
        requiresHumanApproval: false,
        reason: "Policy BLOCKED: Abandonment window has not elapsed yet.",
        policyCode: "POLICY_RETRY_INTERVAL_NOT_MET",
        violations: ["Abandonment window not elapsed."],
      };
    }



    // 2. Check if case is expired
    if (input.isExpired) {
      return {
        allowed: false,
        requiresHumanApproval: false,
        reason: "Policy violation: Recovery case has EXPIRED.",
        policyCode: "POLICY_EXPIRED",
        violations: ["Recovery case expired."],
      };
    }

    // 3. Check for disputed payments
    if (input.isDisputed) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: "Disputed payment requires mandatory human investigation.",
        policyCode: "POLICY_DISPUTED",
        violations: ["Disputed payment requires manual review."],
      };
    }

    // 4. Check for unsupported actions
    if (!PolicyService.SUPPORTED_ACTIONS.has(input.action)) {
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: `Action '${input.action}' is not supported by the payment infrastructure.`,
        policyCode: "POLICY_UNSUPPORTED_ACTION",
        violations: [`Unsupported action: ${input.action}`],
      };
    }

    // 5. Check retry limit (Max 3 retries)
    if (
      (input.action === "PAYMENT_RETRY" || input.action === "SUBSCRIPTION_RECOVERY") &&
      input.recoveryAttemptsCount >= PolicyService.MAX_PAYMENT_RETRIES
    ) {
      violations.push(`Maximum payment retry limit of ${PolicyService.MAX_PAYMENT_RETRIES} attempts reached.`);
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: `Policy REJECTED: Maximum retry limit (${PolicyService.MAX_PAYMENT_RETRIES}) reached.`,
        policyCode: "POLICY_RETRY_LIMIT_REACHED",
        violations,
      };
    }

    // 6. Check contact frequency limit (Max 3 contacts)
    if (
      (input.action === "SEND_PAYMENT_LINK" || input.action === "SEND_REMINDER") &&
      input.customerContactCount >= PolicyService.MAX_CUSTOMER_CONTACTS
    ) {
      violations.push(`Maximum customer contact limit of ${PolicyService.MAX_CUSTOMER_CONTACTS} reached.`);
      return {
        allowed: false,
        requiresHumanApproval: true,
        reason: `Policy REJECTED: Customer contact frequency limit (${PolicyService.MAX_CUSTOMER_CONTACTS}) exceeded.`,
        policyCode: "POLICY_CONTACT_LIMIT_REACHED",
        violations,
      };
    }

    // 7. Check minimum retry interval (12 Hours)
    if (input.lastAttemptTimestamp && input.action === "PAYMENT_RETRY") {
      const lastAttempt = new Date(input.lastAttemptTimestamp).getTime();
      const hoursSinceLastAttempt = (Date.now() - lastAttempt) / (1000 * 60 * 60);

      if (hoursSinceLastAttempt < PolicyService.MINIMUM_RETRY_INTERVAL_HOURS) {
        const remainingHours = Math.ceil(PolicyService.MINIMUM_RETRY_INTERVAL_HOURS - hoursSinceLastAttempt);
        violations.push(`Minimum retry interval of ${PolicyService.MINIMUM_RETRY_INTERVAL_HOURS} hours not met (${remainingHours}h remaining).`);
        return {
          allowed: false,
          requiresHumanApproval: false,
          reason: `Policy BLOCKED: Retry interval not satisfied. Wait ${remainingHours} more hours.`,
          policyCode: "POLICY_RETRY_INTERVAL_NOT_MET",
          violations,
        };
      }
    }

    // 8. Check human approval threshold (≥ ₹1,00,000 / 10000000 paise)
    if (input.amountAtRisk >= PolicyService.HUMAN_APPROVAL_AMOUNT) {
      return {
        allowed: true,
        requiresHumanApproval: true,
        reason: `Policy APPROVED with mandatory human sign-off: Amount ₹${amountRupees.toLocaleString("en-IN")} exceeds the ₹1,00,000 threshold.`,
        policyCode: "POLICY_HUMAN_APPROVAL_REQUIRED",
        violations: [],
      };
    }

    // 9. Standard policy approval
    return {
      allowed: true,
      requiresHumanApproval: false,
      reason: `Policy APPROVED: Action '${input.action}' complies with all risk caps and retry constraints.`,
      policyCode: "POLICY_APPROVED",
      violations: [],
    };
  }
}

export const policyService = new PolicyService();
