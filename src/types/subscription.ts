export type SubscriptionStatus =
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "paused";

export type BillingInterval = "monthly" | "quarterly" | "annual";

export type RetryStrategy =
  | "AI_ADAPTIVE"
  | "STANDARD_DUNNING"
  | "AGGRESSIVE"
  | "MANUAL_ONLY";

export interface Subscription {
  id: string;
  razorpaySubscriptionId: string;
  customerId: string;
  planName: string;
  planCode: string;
  amount: number; // in INR
  currency: "INR";
  status: SubscriptionStatus;
  billingInterval: BillingInterval;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingAt: string;
  failureCount: number;
  retryStrategy: RetryStrategy;
  mandateId?: string;
  mandateStatus?: "active" | "paused" | "failed" | "expired";
  createdAt: string;
  updatedAt: string;
}
