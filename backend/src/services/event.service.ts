import { Response } from "express";
import { prisma } from "../config/prisma";

export type RecoveryEventType =
  | "RECOVERY_STARTED"
  | "CASE_CREATED"
  | "RISK_ANALYSIS_STARTED"
  | "RISK_ANALYSIS_COMPLETED"
  | "DIAGNOSIS_STARTED"
  | "DIAGNOSIS_COMPLETED"
  | "STRATEGY_STARTED"
  | "STRATEGY_SELECTED"
  | "POLICY_CHECK_STARTED"
  | "POLICY_APPROVED"
  | "POLICY_BLOCKED"
  | "HUMAN_APPROVAL_REQUIRED"
  | "HUMAN_APPROVAL_RECEIVED"
  | "RAZORPAY_ACTION_STARTED"
  | "RAZORPAY_ACTION_COMPLETED"
  | "PAYMENT_LINK_CREATED"
  | "PAYMENT_AWAITING"
  | "RAZORPAY_WEBHOOK_RECEIVED"
  | "WEBHOOK_SIGNATURE_VERIFIED"
  | "PAYMENT_CONFIRMED"
  | "RECOVERY_COMPLETED"
  | "REVENUE_RECOVERED"
  | "RECOVERY_FAILED"
  | "RECOVERY_ESCALATED"
  | "RECOVERY_STOPPED"
  | "OUTCOME_NODE_STARTED"
  | "OUTCOME_NODE_COMPLETED"
  | "GRAPH_RETRY"
  | "GRAPH_COMPLETED"
  | "GRAPH_FAILED"
  | "SUBSCRIPTION_FAILURE_DETECTED"
  | "SUBSCRIPTION_RISK_EVALUATED"
  | "SUBSCRIPTION_DIAGNOSED"
  | "SUBSCRIPTION_STRATEGY_SELECTED"
  | "SUBSCRIPTION_POLICY_EVALUATED"
  | "SUBSCRIPTION_LINK_GENERATED"
  | "SUBSCRIPTION_CUSTOMER_ENGAGED"
  | "SUBSCRIPTION_PAYMENT_CAPTURED"
  | "SUBSCRIPTION_RECOVERED"
  | "SUBSCRIPTION_HALTED"
  | "SUBSCRIPTION_ESCALATED"
  | "CHECKOUT_CREATED"
  | "CHECKOUT_ABANDONMENT_SCAN_STARTED"
  | "CHECKOUT_ABANDONED"
  | "CHECKOUT_RECOVERY_STARTED"
  | "CHECKOUT_DIAGNOSIS_COMPLETED"
  | "CHECKOUT_STRATEGY_SELECTED"
  | "CHECKOUT_POLICY_APPROVED"
  | "CHECKOUT_HUMAN_APPROVAL_REQUIRED"
  | "CHECKOUT_RECOVERY_LINK_CREATED"
  | "CHECKOUT_PAYMENT_AWAITING"
  | "CHECKOUT_RECOVERED"
  | "CHECKOUT_RECOVERY_FAILED"
  | "RECEIVABLES_SCAN_STARTED"
  | "INVOICE_OVERDUE_DETECTED"
  | "INVOICE_RECOVERY_STARTED"
  | "PROMISE_TO_PAY_RECORDED"
  | "PROMISE_TO_PAY_FULFILLED"
  | "PROMISE_TO_PAY_BROKEN"
  | "INVOICE_ESCALATED"
  | "INVOICE_RECOVERED"
  | "HEARTBEAT";

export interface RecoveryEvent {
  id: string;
  caseId?: string;
  caseNumber?: string;
  type: RecoveryEventType;
  actor: string;
  timestamp: string;
  status: "success" | "running" | "waiting" | "blocked" | "failed";
  description?: string;
  metadata?: any;
}

interface SSEClient {
  id: string;
  caseId?: string;
  res: Response;
}

export class EventService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Keep-alive heartbeat every 15 seconds
    this.heartbeatTimer = setInterval(() => {
      this.broadcastHeartbeat();
    }, 15000);
  }

  /**
   * Register a new SSE subscriber
   */
  public addClient(clientId: string, res: Response, caseId?: string) {
    this.clients.set(clientId, { id: clientId, res, caseId });

    // Send initial connection acknowledgement
    const initEvent: RecoveryEvent = {
      id: `evt_init_${Date.now()}`,
      type: "HEARTBEAT",
      actor: "EVENT_SERVICE",
      timestamp: new Date().toISOString(),
      status: "success",
      description: "SSE connection established with VIREON Operations Console",
      metadata: { clientId, subscribedCaseId: caseId || "GLOBAL" },
    };

    this.sendToClient(res, initEvent);
  }

  /**
   * Remove a disconnected SSE subscriber
   */
  public removeClient(clientId: string) {
    this.clients.delete(clientId);
  }

  /**
   * Publish, persist in PostgreSQL, and broadcast an event to active SSE clients
   */
  public async publishEvent(params: {
    caseId?: string;
    caseNumber?: string;
    type: RecoveryEventType;
    actor: string;
    status?: "success" | "running" | "waiting" | "blocked" | "failed";
    description?: string;
    metadata?: any;
  }): Promise<RecoveryEvent> {
    const event: RecoveryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      caseId: params.caseId,
      caseNumber: params.caseNumber,
      type: params.type,
      actor: params.actor,
      timestamp: new Date().toISOString(),
      status: params.status || "success",
      description: params.description,
      metadata: params.metadata || {},
    };

    // 1. Persist in PostgreSQL AuditEvent (if not a heartbeat)
    if (params.type !== "HEARTBEAT") {
      try {
        await prisma.auditEvent.create({
          data: {
            caseId: params.caseId,
            actor: params.actor,
            eventType: params.type,
            description: params.description || `Event ${params.type} recorded.`,
            metadata: { ...params.metadata, status: event.status },
          },
        });
      } catch (err: any) {
        // If foreign key constraint failed (e.g. transient/orphaned caseId), retry safely with caseId: null
        if (params.caseId && (err?.code === "P2003" || err?.message?.includes("foreign key") || err?.message?.includes("fkey"))) {
          try {
            await prisma.auditEvent.create({
              data: {
                caseId: null,
                actor: params.actor,
                eventType: params.type,
                description: `[CaseRef: ${params.caseId}] ${params.description || `Event ${params.type} recorded.`}`,
                metadata: { ...params.metadata, requestedCaseId: params.caseId, status: event.status },
              },
            });
          } catch (retryErr) {
            console.warn("[EventService] Failed to persist fallback event:", retryErr);
          }
        } else {
          console.warn("[EventService] Failed to persist event to PostgreSQL:", err);
        }
      }
    }

    // 2. Broadcast to SSE subscribers
    this.broadcastEvent(event);

    return event;
  }

  /**
   * Broadcast an event to matching SSE subscribers
   */
  private broadcastEvent(event: RecoveryEvent) {
    const data = `data: ${JSON.stringify(event)}\n\n`;

    this.clients.forEach((client) => {
      // If client filtered by caseId, only send if matches
      if (!client.caseId || client.caseId === event.caseId || client.caseId === event.caseNumber) {
        try {
          client.res.write(data);
        } catch (err) {
          console.error(`[EventService] Error sending to client ${client.id}:`, err);
          this.clients.delete(client.id);
        }
      }
    });
  }

  /**
   * Send heartbeat to keep SSE connection alive through proxies/load balancers
   */
  private broadcastHeartbeat() {
    const heartbeat: RecoveryEvent = {
      id: `hb_${Date.now()}`,
      type: "HEARTBEAT",
      actor: "SYSTEM",
      timestamp: new Date().toISOString(),
      status: "success",
      description: "Keep-alive ping",
    };

    const data = `data: ${JSON.stringify(heartbeat)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.res.write(data);
      } catch {
        this.clients.delete(client.id);
      }
    });
  }

  private sendToClient(res: Response, event: RecoveryEvent) {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (err) {
      console.error("[EventService] Failed to send to client:", err);
    }
  }

  public getSubscriberCount(): number {
    return this.clients.size;
  }
}

export const eventService = new EventService();
