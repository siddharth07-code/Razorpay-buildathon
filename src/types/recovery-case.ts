import { Customer } from "./customer";
import { Payment } from "./payment";
import { Subscription } from "./subscription";

export type RecoveryCaseStatus =
  | "NEW"
  | "OPEN"
  | "ANALYZING"
  | "DIAGNOSED"
  | "ACTION_SELECTED"
  | "AWAITING_APPROVAL"
  | "PENDING_APPROVAL"
  | "EXECUTING"
  | "IN_PROGRESS"
  | "AWAITING_PAYMENT"
  | "RECOVERED"
  | "FAILED"
  | "STOPPED"
  | "EXPIRED"
  | "ESCALATED";

export type RecoveryRiskLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type RootCauseCategory =
  | "temporary_payment_failure"
  | "insufficient_funds"
  | "authentication_failure"
  | "payment_method_issue"
  | "repeated_failure"
  | "checkout_abandonment"
  | "subscription_payment_failure"
  | "overdue_invoice"
  | "missed_promise_to_pay"
  | "unknown_other"
  | "INSUFFICIENT_FUNDS"
  | "AUTHENTICATION_DROPOFF"
  | "EXPIRED_CARD"
  | "MANDATE_BANK_FAILURE"
  | "UPI_APP_TIMEOUT"
  | "NETWORK_DOWNTIME"
  | "SUSPECTED_FRAUD"
  | "TEMPORARY_GATEWAY_GLITCH";

export type RecoveryStep =
  | "ROOT_CAUSE_ANALYSIS"
  | "SMART_RETRY_SCHEDULED"
  | "INTERACTIVE_WHATSAPP_SENT"
  | "DYNAMIC_PAYMENT_LINK_SENT"
  | "UPI_COLLECT_DISPATCHED"
  | "MANDATE_RETRY_TRIGGERED"
  | "ACCOUNT_MANAGER_ESCALATION"
  | "RECOVERY_RESOLVED"
  | "PENDING_HUMAN_APPROVAL"
  | "RECOVERY_STOPPED";

export interface ScheduledRetry {
  id: string;
  scheduledAt: string;
  channel: "AUTO_RETRY" | "WHATSAPP" | "EMAIL" | "SMS" | "UPI_COLLECT";
  status: "PENDING" | "EXECUTING" | "COMPLETED" | "FAILED" | "CANCELLED";
  resultNote?: string;
}

export interface AiRecommendation {
  action: string;
  actionType:
    | "SMART_SCHEDULED_RETRY"
    | "WHATSAPP_DUNNING"
    | "PAYMENT_LINK_EMAIL"
    | "UPI_AUTOPAY_PROMPT"
    | "HUMAN_ESCALATION"
    | "CREATE_PAYMENT_LINK"
    | "SEND_PAYMENT_LINK"
    | "RETRY_SUBSCRIPTION"
    | "REQUEST_PAYMENT_METHOD_UPDATE"
    | "STOP_RECOVERY";
  confidence: number; // 0.00 to 1.00
  reasoning: string;
  optimalRetryTime?: string;
  recommendedChannel: "WHATSAPP" | "EMAIL" | "SMS" | "AUTO_RETRY" | "UPI_COLLECT" | "ACCOUNT_MANAGER" | "RAZORPAY_RETRY";
  expectedRecoveryProbability: number; // 0.00 to 1.00
}

export interface RecoveryTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  type:
    | "PAYMENT_FAILED"
    | "AGENT_ANALYSIS"
    | "ACTION_EXECUTED"
    | "CUSTOMER_INTERACTION"
    | "WEBHOOK_EVENT"
    | "PAYMENT_RECOVERED"
    | "ESCALATION"
    | "POLICY_CHECK";
  actor: "SYSTEM" | "RECOVER_AI_AGENT" | "MERCHANT_ADMIN" | "RAZORPAY_WEBHOOK" | "CUSTOMER";
  metadata?: Record<string, any>;
}

export interface RecoveryCase {
  id: string;
  caseNumber: string;
  customerId: string;
  paymentId: string;
  subscriptionId?: string;
  orderId?: string;
  invoiceId?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpayPaymentLinkId?: string;
  razorpaySubscriptionId?: string;
  razorpayInvoiceId?: string;
  amount: number; // in INR
  currency: "INR";
  status: RecoveryCaseStatus;
  riskLevel: RecoveryRiskLevel;
  riskScore: number; // 0 to 100
  recoverabilityScore: number; // 0 to 100
  expectedRecoveryValue: number; // in INR
  priority?: "P0" | "P1" | "P2" | "P3";
  rootCause: RootCauseCategory;
  rootCauseDetails: string;
  selectedAction?: string;
  currentStep: RecoveryStep;
  actionsTakenCount: number;
  recoveryAttempts: number;
  recoveredAmount: number; // in INR
  totalRecoveredAmount: number; // in INR
  requiresHumanApproval: boolean;
  paymentLinkUrl?: string;
  scheduledRetries: ScheduledRetry[];
  aiRecommendation: AiRecommendation;
  customer?: Customer;
  payment?: Payment;
  subscription?: Subscription;
  timeline: RecoveryTimelineEvent[];
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  recoveredAt?: string;
}
