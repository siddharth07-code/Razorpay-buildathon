import { Customer } from "@/types/customer";
import { Payment } from "@/types/payment";
import { Subscription } from "@/types/subscription";
import { RecoveryCase } from "@/types/recovery-case";

export type RecoveryAction =
  | "RETRY_PAYMENT"
  | "CREATE_PAYMENT_LINK"
  | "SEND_PAYMENT_LINK"
  | "REQUEST_PAYMENT_METHOD_UPDATE"
  | "RETRY_SUBSCRIPTION"
  | "SEND_NOTIFICATION"
  | "CREATE_PROMISE_TO_PAY"
  | "ESCALATE_TO_HUMAN"
  | "STOP_RECOVERY";

export type RootCauseType =
  | "temporary_payment_failure"
  | "insufficient_funds"
  | "authentication_failure"
  | "payment_method_issue"
  | "repeated_failure"
  | "checkout_abandonment"
  | "subscription_payment_failure"
  | "overdue_invoice"
  | "missed_promise_to_pay"
  | "unknown_other";

export type CasePriority = "P0" | "P1" | "P2" | "P3";

// 1. Risk Agent
export interface RiskAgentInput {
  caseId?: string;
  payment: Payment;
  customer?: Customer;
  subscription?: Subscription;
  previousFailuresCount?: number;
  previousRecoveriesCount?: number;
}

export interface RiskAgentOutput {
  caseId: string;
  riskScore: number; // 0 to 100
  recoverabilityScore: number; // 0 to 100
  expectedRecoveryValue: number; // in INR (deterministic calculation)
  priority: CasePriority;
  reason: string;
}

// 2. Root Cause Agent
export interface RootCauseAgentInput {
  payment: Payment;
  customer?: Customer;
  subscription?: Subscription;
  riskOutput?: RiskAgentOutput;
}

export interface RootCauseAgentOutput {
  rootCause: RootCauseType;
  confidence: number; // 0.00 to 1.00
  explanation: string;
  signalsDetected: string[];
}

// 3. Recovery Strategy Agent
export interface StrategyAgentInput {
  payment: Payment;
  customer?: Customer;
  subscription?: Subscription;
  risk: RiskAgentOutput;
  diagnosis: RootCauseAgentOutput;
  recoveryAttemptsCount: number;
}

export interface StrategyAgentOutput {
  action: RecoveryAction;
  confidence: number; // 0.00 to 1.00
  expectedRecoveryValue: number; // in INR
  reason: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS" | "RAZORPAY_RETRY" | "UPI_COLLECT" | "ACCOUNT_MANAGER";
  suggestedSchedule?: string;
  parameters?: Record<string, any>;
}

// 4. Policy Agent
export interface PolicyAgentInput {
  caseId: string;
  amount: number; // in INR
  action: RecoveryAction;
  recoveryAttempts: number;
  customerContactCount: number;
  lastAttemptAt?: string;
  isDisputedInvoice?: boolean;
  hasCustomerConsent?: boolean;
  environment?: string;
}

export interface PolicyAgentOutput {
  allowed: boolean;
  reason: string;
  requiresHumanApproval: boolean;
  violations: string[];
}

// 5. Execution Agent
export interface ExecutionAgentInput {
  caseId: string;
  strategy: StrategyAgentOutput;
  policy: PolicyAgentOutput;
  payment: Payment;
  customer?: Customer;
  subscription?: Subscription;
}

export interface ExecutionAgentOutput {
  success: boolean;
  executedAction: string;
  channel: string;
  razorpayPaymentLinkId?: string;
  razorpayPaymentId?: string;
  paymentLinkUrl?: string;
  executionStatus: "EXECUTED" | "QUEUED_FOR_APPROVAL" | "WAITING_CUSTOMER_ACTION" | "REJECTED_BY_POLICY" | "FAILED";
  message: string;
  error?: string;
  details?: Record<string, any>;
}

// 6. Outcome Agent
export interface OutcomeAgentInput {
  caseId: string;
  amount: number;
  razorpayEvent?: string;
  razorpayPaymentStatus?: string;
  executionResult?: ExecutionAgentOutput;
}

export interface OutcomeAgentOutput {
  status: "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "ESCALATED" | "STOPPED";
  isRecovered: boolean;
  recoveredAmount: number; // in INR (MUST be > 0 ONLY IF confirmed captured)
  summary: string;
}
