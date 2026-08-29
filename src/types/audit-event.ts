export type AuditEntityType =
  | "PAYMENT"
  | "RECOVERY_CASE"
  | "AGENT_DECISION"
  | "SUBSCRIPTION"
  | "INVOICE"
  | "SANDBOX_SIMULATION"
  | "SYSTEM";

export type AuditActor =
  | "SYSTEM"
  | "RECOVER_AI_AGENT"
  | "MERCHANT_ADMIN"
  | "RAZORPAY_WEBHOOK"
  | "CUSTOMER";

export interface AuditEvent {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  eventType: string;
  actor: AuditActor;
  description: string;
  payload: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}
