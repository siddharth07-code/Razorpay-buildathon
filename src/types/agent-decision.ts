export type DecisionType =
  | "SCHEDULE_SMART_RETRY"
  | "GENERATE_DYNAMIC_PAYMENT_LINK"
  | "SWITCH_PAYMENT_METHOD"
  | "SEND_WHATSAPP_INTERACTIVE_DUNNING"
  | "TRIGGER_UPI_COLLECT_INTENT"
  | "ESCALATE_TO_ACCOUNT_MANAGER"
  | "PAUSE_SUBSCRIPTION_GRACE_PERIOD";

export type ExecutionStatus =
  | "QUEUED"
  | "EXECUTED"
  | "WAITING_CUSTOMER_ACTION"
  | "COMPLETED"
  | "FAILED";

export interface AgentDecision {
  id: string;
  caseId: string;
  caseNumber: string;
  customerId: string;
  customerName: string;
  amount: number; // in INR
  decisionType: DecisionType;
  confidence: number; // 0.00 to 1.00
  rationale: string;
  signalsDetected: string[];
  proposedAction: string;
  executedAction: string;
  channel: "WHATSAPP" | "EMAIL" | "SMS" | "RAZORPAY_RETRY" | "UPI_INTENT" | "SLACK_ALERT";
  executionStatus: ExecutionStatus;
  outcome?: string;
  humanReviewRequired: boolean;
  timestamp: string;
}
