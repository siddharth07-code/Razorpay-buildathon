import {
  Customer,
  Payment,
  Subscription,
  Invoice,
  RecoveryCase,
  RevenueRisk,
  AgentDecision,
  AuditEvent,
  RecoveryCaseStatus,
  RecoveryRiskLevel,
} from "../../types";
import { getInitialSeedData, SeedData } from "./seed-data";

export interface FunnelStage {
  id: string;
  label: string;
  description: string;
  count: number;
  amount: number; // in INR
  conversionRate: number; // percentage from previous step
}

export interface LeakageCategory {
  key: string;
  label: string;
  count: number;
  amount: number; // in INR
  percentage: number;
}

export interface DashboardMetrics {
  totalRevenueAtRisk: number; // in INR
  recoverableRevenue: number; // AI probability-weighted expected recovery in INR
  totalRevenueRecovered: number; // in INR
  autonomousRecoveryRate: number; // percentage (e.g. 88.5)
  activeCasesCount: number;
  totalCasesCount: number;
  avgRecoveryTimeHours: number;
  criticalCasesCount: number;
  atRiskCustomerCount: number;
  funnel: FunnelStage[];
  leakageByMethod: LeakageCategory[];
  leakageByReason: LeakageCategory[];
  leakageByTier: LeakageCategory[];
  trendHistory: Array<{
    date: string;
    atRisk: number;
    recovered: number;
  }>;
}

class InMemoryRepository {
  private data: SeedData;

  constructor() {
    this.data = getInitialSeedData();
  }

  public reset(): void {
    this.data = getInitialSeedData();
  }

  // --- Metrics ---
  public getMetrics(days?: number): DashboardMetrics {
    let allCases = this.data.recoveryCases;
    if (days && days > 0) {
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const filtered = allCases.filter((c) => (c.createdAt || c.updatedAt || "") >= threshold);
      if (filtered.length > 0) {
        allCases = filtered;
      }
    }
    const activeCases = allCases.filter(
      (c) => c.status === "OPEN" || c.status === "IN_PROGRESS" || c.status === "ANALYZING"
    );

    const recoveredCases = allCases.filter(
      (c) => c.status === "RECOVERED"
    );

    const totalAtRisk = activeCases.reduce((sum, c) => sum + c.amount, 0);
    const totalRecovered = allCases.reduce(
      (sum, c) => sum + (c.totalRecoveredAmount || (c.status === "RECOVERED" ? c.amount : 0)),
      0
    );

    // Calculate Recoverable Revenue using AI expected probability
    const recoverableRevenue = activeCases.reduce((sum, c) => {
      const prob = c.aiRecommendation?.expectedRecoveryProbability ?? 0.85;
      return sum + Math.round(c.amount * prob);
    }, 0);

    const totalCompleted = recoveredCases.length + allCases.filter(c => c.status === "FAILED").length;
    const rate = totalCompleted > 0
      ? (recoveredCases.length / totalCompleted) * 100
      : (allCases.length > 0 ? (recoveredCases.length / allCases.length) * 100 : 85.0);

    const criticalCount = activeCases.filter((c) => c.riskLevel === "CRITICAL").length;

    // --- Dynamic Funnel Calculations ---
    const totalFailedAmount = allCases.reduce((sum, c) => sum + c.amount, 0);
    const diagnosedCases = allCases.filter(
      (c) => c.aiRecommendation && c.aiRecommendation.confidence > 0
    );
    const diagnosedAmount = diagnosedCases.reduce((sum, c) => sum + c.amount, 0);

    const dispatchedCases = allCases.filter(
      (c) =>
        c.actionsTakenCount > 0 ||
        c.currentStep === "SMART_RETRY_SCHEDULED" ||
        c.currentStep === "INTERACTIVE_WHATSAPP_SENT" ||
        c.currentStep === "DYNAMIC_PAYMENT_LINK_SENT" ||
        c.currentStep === "MANDATE_RETRY_TRIGGERED" ||
        c.currentStep === "RECOVERY_RESOLVED" ||
        c.status === "RECOVERED"
    );
    const dispatchedAmount = dispatchedCases.reduce((sum, c) => sum + c.amount, 0);

    const engagedCases = allCases.filter(
      (c) =>
        c.currentStep === "INTERACTIVE_WHATSAPP_SENT" ||
        c.currentStep === "DYNAMIC_PAYMENT_LINK_SENT" ||
        c.currentStep === "RECOVERY_RESOLVED" ||
        c.status === "RECOVERED" ||
        c.timeline.some((t) => t.actor === "CUSTOMER" || t.actor === "RECOVER_AI_AGENT")
    );
    const engagedAmount = engagedCases.reduce((sum, c) => sum + c.amount, 0);

    const recoveredAmount = recoveredCases.reduce((sum, c) => sum + (c.totalRecoveredAmount || c.amount), 0);

    const funnel: FunnelStage[] = [
      {
        id: "failed",
        label: "Failures Ingested",
        description: "Razorpay payment.failed webhooks processed",
        count: allCases.length,
        amount: totalFailedAmount,
        conversionRate: 100,
      },
      {
        id: "diagnosed",
        label: "AI Root-Cause Diagnosed",
        description: "Autonomous error telemetry & bank heuristics evaluated",
        count: diagnosedCases.length,
        amount: diagnosedAmount,
        conversionRate: allCases.length > 0 ? Math.round((diagnosedCases.length / allCases.length) * 100) : 100,
      },
      {
        id: "dispatched",
        label: "Interventions Dispatched",
        description: "Smart retries queued & 1-click links generated",
        count: dispatchedCases.length,
        amount: dispatchedAmount,
        conversionRate: diagnosedCases.length > 0 ? Math.round((dispatchedCases.length / diagnosedCases.length) * 100) : 100,
      },
      {
        id: "engaged",
        label: "Customer Re-engaged",
        description: "WhatsApp read receipt / checkout page opened",
        count: engagedCases.length,
        amount: engagedAmount,
        conversionRate: dispatchedCases.length > 0 ? Math.round((engagedCases.length / dispatchedCases.length) * 100) : 80,
      },
      {
        id: "recovered",
        label: "Revenue Recovered",
        description: "Successful capture captured via Razorpay",
        count: recoveredCases.length,
        amount: recoveredAmount,
        conversionRate: engagedCases.length > 0 ? Math.round((recoveredCases.length / engagedCases.length) * 100) : 50,
      },
    ];

    // --- Dynamic Leakage by Payment Method ---
    const methodMap = new Map<string, { count: number; amount: number }>();
    allCases.forEach((c) => {
      const method = c.payment?.method?.toUpperCase() || "NACH";
      const current = methodMap.get(method) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += c.amount;
      methodMap.set(method, current);
    });

    const leakageByMethod: LeakageCategory[] = Array.from(methodMap.entries()).map(([key, data]) => ({
      key,
      label: key === "NACH" ? "NACH / e-Mandate" : key === "UPI" ? "UPI AutoPay" : key === "CARD" ? "Card Tokens" : key,
      count: data.count,
      amount: data.amount,
      percentage: totalFailedAmount > 0 ? Math.round((data.amount / totalFailedAmount) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // --- Dynamic Leakage by Failure Reason ---
    const reasonMap = new Map<string, { count: number; amount: number }>();
    allCases.forEach((c) => {
      const reason = c.payment?.errorCode || c.rootCause;
      const current = reasonMap.get(reason) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += c.amount;
      reasonMap.set(reason, current);
    });

    const leakageByReason: LeakageCategory[] = Array.from(reasonMap.entries()).map(([key, data]) => ({
      key,
      label: key.replace(/_/g, " "),
      count: data.count,
      amount: data.amount,
      percentage: totalFailedAmount > 0 ? Math.round((data.amount / totalFailedAmount) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // --- Dynamic Leakage by Customer Tier ---
    const tierMap = new Map<string, { count: number; amount: number }>();
    allCases.forEach((c) => {
      const tier = c.customer?.tier || "GROWTH";
      const current = tierMap.get(tier) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += c.amount;
      tierMap.set(tier, current);
    });

    const leakageByTier: LeakageCategory[] = Array.from(tierMap.entries()).map(([key, data]) => ({
      key,
      label: key,
      count: data.count,
      amount: data.amount,
      percentage: totalFailedAmount > 0 ? Math.round((data.amount / totalFailedAmount) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // 7-day trend simulation derived from real totals
    const trendHistory = [
      { date: "Day -6", atRisk: Math.round(totalAtRisk * 0.4), recovered: Math.round(totalRecovered * 0.2) },
      { date: "Day -5", atRisk: Math.round(totalAtRisk * 0.6), recovered: Math.round(totalRecovered * 0.35) },
      { date: "Day -4", atRisk: Math.round(totalAtRisk * 0.5), recovered: Math.round(totalRecovered * 0.5) },
      { date: "Day -3", atRisk: Math.round(totalAtRisk * 0.8), recovered: Math.round(totalRecovered * 0.65) },
      { date: "Day -2", atRisk: Math.round(totalAtRisk * 0.7), recovered: Math.round(totalRecovered * 0.8) },
      { date: "Yesterday", atRisk: Math.round(totalAtRisk * 0.9), recovered: Math.round(totalRecovered * 0.9) },
      { date: "Today", atRisk: totalAtRisk, recovered: totalRecovered },
    ];

    return {
      totalRevenueAtRisk: totalAtRisk,
      recoverableRevenue,
      totalRevenueRecovered: totalRecovered,
      autonomousRecoveryRate: Math.round(rate * 10) / 10,
      activeCasesCount: activeCases.length,
      totalCasesCount: allCases.length,
      avgRecoveryTimeHours: 4.2,
      criticalCasesCount: criticalCount,
      atRiskCustomerCount: this.data.revenueRisks.length,
      funnel,
      leakageByMethod,
      leakageByReason,
      leakageByTier,
      trendHistory,
    };
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return [...this.data.customers];
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  // --- Payments ---
  public getPayments(): Payment[] {
    return [...this.data.payments];
  }

  public getPaymentById(id: string): Payment | undefined {
    return this.data.payments.find((p) => p.id === id);
  }

  // --- Recovery Cases ---
  public getRecoveryCases(filters?: {
    status?: RecoveryCaseStatus | "ALL";
    riskLevel?: RecoveryRiskLevel | "ALL";
    search?: string;
  }): RecoveryCase[] {
    let cases = [...this.data.recoveryCases].map((c) => {
      const customer = c.customer || this.getCustomerById(c.customerId);
      const payment = c.payment || this.getPaymentById(c.paymentId);
      const subscription = c.subscriptionId
        ? this.data.subscriptions.find((s) => s.id === c.subscriptionId)
        : undefined;
      return { ...c, customer, payment, subscription };
    });

    if (filters?.status && filters.status !== "ALL") {
      cases = cases.filter((c) => c.status === filters.status);
    }

    if (filters?.riskLevel && filters.riskLevel !== "ALL") {
      cases = cases.filter((c) => c.riskLevel === filters.riskLevel);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      cases = cases.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.customer?.name.toLowerCase().includes(q) ||
          c.customer?.companyName?.toLowerCase().includes(q) ||
          c.customer?.email.toLowerCase().includes(q) ||
          c.rootCause.toLowerCase().includes(q) ||
          (c.payment?.errorCode && c.payment.errorCode.toLowerCase().includes(q))
      );
    }

    return cases.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getRecoveryCaseById(id: string): RecoveryCase | undefined {
    const item = this.data.recoveryCases.find((c) => c.id === id || c.caseNumber === id);
    if (!item) return undefined;

    const customer = item.customer || this.getCustomerById(item.customerId);
    const payment = item.payment || this.getPaymentById(item.paymentId);
    const subscription = item.subscriptionId
      ? this.data.subscriptions.find((s) => s.id === item.subscriptionId)
      : undefined;

    return {
      ...item,
      customer,
      payment,
      subscription,
    };
  }

  public createRecoveryCase(newCase: RecoveryCase): RecoveryCase {
    this.data.recoveryCases.unshift(newCase);
    this.logAuditEvent({
      entityType: "RECOVERY_CASE",
      entityId: newCase.id,
      eventType: "RECOVERY_CASE_OPENED",
      actor: "RECOVER_AI_AGENT",
      description: `Autonomous recovery case ${newCase.caseNumber} opened for ₹${newCase.amount.toLocaleString("en-IN")} (${newCase.customer?.name || "Customer"}).`,
      payload: {
        amount: newCase.amount,
        riskLevel: newCase.riskLevel,
        rootCause: newCase.rootCause,
      },
    });
    return newCase;
  }

  public updateRecoveryCase(
    id: string,
    updates: Partial<RecoveryCase>,
    timelineEvent?: { title: string; description: string; type: any; actor: any }
  ): RecoveryCase | undefined {
    const index = this.data.recoveryCases.findIndex((c) => c.id === id || c.caseNumber === id);
    if (index === -1) return undefined;

    const current = this.data.recoveryCases[index];
    const updated: RecoveryCase = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (timelineEvent) {
      updated.timeline = [
        ...updated.timeline,
        {
          id: `tl_${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: timelineEvent.title,
          description: timelineEvent.description,
          type: timelineEvent.type,
          actor: timelineEvent.actor,
        },
      ];
    }

    this.data.recoveryCases[index] = updated;

    this.logAuditEvent({
      entityType: "RECOVERY_CASE",
      entityId: id,
      eventType: "RECOVERY_CASE_UPDATED",
      actor: "RECOVER_AI_AGENT",
      description: `Case ${updated.caseNumber} updated: ${timelineEvent?.title || "Status changed"}`,
      payload: updates,
    });

    return updated;
  }

  public markCaseRecovered(id: string, amount: number): RecoveryCase | undefined {
    const c = this.getRecoveryCaseById(id);
    if (!c) return undefined;

    return this.updateRecoveryCase(
      id,
      {
        status: "RECOVERED",
        totalRecoveredAmount: amount,
        recoveredAt: new Date().toISOString(),
        currentStep: "RECOVERY_RESOLVED",
      },
      {
        title: "Payment Successfully Recovered",
        description: `Autonomous recovery workflow captured full payment of ₹${amount.toLocaleString("en-IN")} via Razorpay.`,
        type: "PAYMENT_RECOVERED",
        actor: "RECOVER_AI_AGENT",
      }
    );
  }

  // --- Revenue Risks ---
  public getRevenueRisks(): RevenueRisk[] {
    return [...this.data.revenueRisks];
  }

  // --- Agent Decisions ---
  public getAgentDecisions(): AgentDecision[] {
    return [...this.data.agentDecisions].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public addAgentDecision(decision: Omit<AgentDecision, "id" | "timestamp">): AgentDecision {
    const fullDecision: AgentDecision = {
      ...decision,
      id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    };

    this.data.agentDecisions.unshift(fullDecision);

    this.logAuditEvent({
      entityType: "AGENT_DECISION",
      entityId: fullDecision.id,
      eventType: "AGENT_DECISION_RECORDED",
      actor: "RECOVER_AI_AGENT",
      description: `Agent decision: ${fullDecision.decisionType} for ${fullDecision.customerName} (${Math.round(fullDecision.confidence * 100)}% confidence).`,
      payload: {
        caseNumber: fullDecision.caseNumber,
        rationale: fullDecision.rationale,
        channel: fullDecision.channel,
      },
    });

    return fullDecision;
  }

  // --- Audit Events ---
  public getAuditEvents(): AuditEvent[] {
    return [...this.data.auditEvents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public logAuditEvent(event: Omit<AuditEvent, "id" | "timestamp">): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    };
    this.data.auditEvents.unshift(fullEvent);
    return fullEvent;
  }

  // --- Sandbox Simulation Engine ---
  public injectSimulatedFailure(params: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    companyName?: string;
    amount: number;
    method: "upi" | "card" | "netbanking" | "nach";
    errorCode:
      | "INSUFFICIENT_FUNDS"
      | "PAYMENT_AUTHENTICATION_FAILED"
      | "UPI_COLLECT_TIMEOUT"
      | "CARD_EXPIRED"
      | "GATEWAY_ERROR"
      | "MANDATE_EXECUTION_FAILED";
  }): { caseId: string; caseNumber: string; paymentId: string } {
    const now = new Date();
    const isoNow = now.toISOString();

    const customerId = `cust_sim_${Date.now()}`;
    const customer: Customer = {
      id: customerId,
      name: params.customerName,
      email: params.customerEmail,
      phone: params.customerPhone,
      companyName: params.companyName || params.customerName,
      tier: params.amount >= 100000 ? "ENTERPRISE" : params.amount >= 20000 ? "GROWTH" : "STARTER",
      ltv: params.amount * 3,
      preferredPaymentMethod: params.method,
      failureCount: 1,
      recoveryCount: 0,
      createdAt: isoNow,
      updatedAt: isoNow,
    };
    this.data.customers.unshift(customer);

    const paymentId = `pay_sim_${Date.now()}`;
    const rzpPaymentId = `pay_rzp_sim_${Math.random().toString(36).substring(2, 8)}`;
    const payment: Payment = {
      id: paymentId,
      razorpayPaymentId: rzpPaymentId,
      customerId,
      amount: params.amount,
      currency: "INR",
      status: "failed",
      method: params.method,
      errorCode: params.errorCode as any,
      errorDescription: `Simulated Sandbox Failure: ${params.errorCode}`,
      errorSource: params.method === "card" ? "customer" : "bank",
      errorReason: params.errorCode.toLowerCase(),
      attempts: 1,
      lastAttemptAt: isoNow,
      createdAt: isoNow,
    };
    this.data.payments.unshift(payment);

    let rootCause: any = "INSUFFICIENT_FUNDS";
    let riskLevel: RecoveryRiskLevel = "MEDIUM";
    let decisionType: any = "SCHEDULE_SMART_RETRY";
    let channel: any = "RAZORPAY_RETRY";
    let confidence = 0.92;
    let rationale = "";
    let actionDescription = "";

    if (params.errorCode === "INSUFFICIENT_FUNDS") {
      rootCause = "INSUFFICIENT_FUNDS";
      riskLevel = params.amount > 50000 ? "CRITICAL" : "HIGH";
      decisionType = "SCHEDULE_SMART_RETRY";
      channel = "RAZORPAY_RETRY";
      confidence = 0.95;
      rationale = `Detected dawn clearing batch rejection for ₹${params.amount.toLocaleString("en-IN")}. Scheduled autonomous retry during 02:30 PM liquidity window.`;
      actionDescription = "Scheduled optimal Razorpay mandate retry for afternoon liquidity window.";
    } else if (params.errorCode === "PAYMENT_AUTHENTICATION_FAILED") {
      rootCause = "AUTHENTICATION_DROPOFF";
      riskLevel = "HIGH";
      decisionType = "SEND_WHATSAPP_INTERACTIVE_DUNNING";
      channel = "WHATSAPP";
      confidence = 0.89;
      rationale = "Customer abandoned 3DS 2.0 OTP screen. Switching channel to WhatsApp interactive link with 1-click Razorpay UPI Intent.";
      actionDescription = "Dispatched interactive WhatsApp dunning template with Razorpay deep link.";
    } else if (params.errorCode === "UPI_COLLECT_TIMEOUT") {
      rootCause = "UPI_APP_TIMEOUT";
      riskLevel = "MEDIUM";
      decisionType = "TRIGGER_UPI_COLLECT_INTENT";
      channel = "WHATSAPP";
      confidence = 0.91;
      rationale = "UPI collect request timed out. Dispatched immediate WhatsApp reminder with QR Code & UPI deep link.";
      actionDescription = "Generated instant UPI QR code & WhatsApp notification.";
    } else if (params.errorCode === "CARD_EXPIRED") {
      rootCause = "EXPIRED_CARD";
      riskLevel = "HIGH";
      decisionType = "GENERATE_DYNAMIC_PAYMENT_LINK";
      channel = "EMAIL";
      confidence = 0.93;
      rationale = "Card token expired. Sent secure card update portal link powered by Razorpay tokenization.";
      actionDescription = "Sent secure card update link with instant tokenization.";
    } else {
      rootCause = "TEMPORARY_GATEWAY_GLITCH";
      riskLevel = "MEDIUM";
      decisionType = "SCHEDULE_SMART_RETRY";
      channel = "RAZORPAY_RETRY";
      confidence = 0.88;
      rationale = "Transient gateway error detected. Immediate retry scheduled in 30 minutes.";
      actionDescription = "Queued automatic retry after downstream gateway health stabilization.";
    }

    const caseNumber = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const caseId = `case_sim_${Date.now()}`;
    const dynamicLink = `https://rzp.io/i/demo_sim_${caseNumber.toLowerCase()}`;
    const recoverabilityScore = Math.round(confidence * 100);
    const expectedRecoveryValue = Math.round(params.amount * (recoverabilityScore / 100));
    const requiresHumanApproval = params.amount >= 100000;

    const recoveryCase: RecoveryCase = {
      id: caseId,
      caseNumber,
      customerId,
      paymentId,
      razorpayPaymentId: rzpPaymentId,
      amount: params.amount,
      currency: "INR",
      status: "IN_PROGRESS",
      riskLevel,
      riskScore: riskLevel === "CRITICAL" ? 85 : riskLevel === "HIGH" ? 70 : 45,
      recoverabilityScore,
      expectedRecoveryValue,
      priority: params.amount >= 100000 ? "P0" : params.amount >= 25000 ? "P1" : "P2",
      rootCause,
      rootCauseDetails: rationale,
      selectedAction: decisionType,
      currentStep: "SMART_RETRY_SCHEDULED",
      actionsTakenCount: 1,
      recoveryAttempts: 1,
      recoveredAmount: 0,
      totalRecoveredAmount: 0,
      requiresHumanApproval,
      paymentLinkUrl: dynamicLink,
      scheduledRetries: [
        {
          id: `ret_${Date.now()}`,
          scheduledAt: new Date(now.getTime() + 4 * 3600 * 1000).toISOString(),
          channel: channel === "WHATSAPP" ? "WHATSAPP" : "AUTO_RETRY",
          status: "PENDING",
        },
      ],
      aiRecommendation: {
        action: actionDescription,
        actionType: "SMART_SCHEDULED_RETRY",
        confidence,
        reasoning: rationale,
        recommendedChannel: channel === "WHATSAPP" ? "WHATSAPP" : "AUTO_RETRY",
        expectedRecoveryProbability: confidence - 0.05,
      },
      customer,
      payment,
      timeline: [
        {
          id: `tl_sim_1_${Date.now()}`,
          timestamp: isoNow,
          title: "Razorpay Payment Failed",
          description: `Simulated transaction failed with ${params.errorCode} for ₹${params.amount.toLocaleString("en-IN")}.`,
          type: "PAYMENT_FAILED",
          actor: "RAZORPAY_WEBHOOK",
        },
        {
          id: `tl_sim_2_${Date.now()}`,
          timestamp: isoNow,
          title: "RecoverAI Autonomous Intervention",
          description: `Classified as ${rootCause}. Formulated action: ${decisionType} (Confidence: ${Math.round(confidence * 100)}%).`,
          type: "AGENT_ANALYSIS",
          actor: "RECOVER_AI_AGENT",
        },
      ],
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    this.createRecoveryCase(recoveryCase);

    this.addAgentDecision({
      caseId,
      caseNumber,
      customerId,
      customerName: customer.name,
      amount: params.amount,
      decisionType,
      confidence,
      rationale,
      signalsDetected: [
        `Error: ${params.errorCode}`,
        `Channel: ${params.method.toUpperCase()}`,
        `Customer Tier: ${customer.tier}`,
      ],
      proposedAction: actionDescription,
      executedAction: `${actionDescription} (Razorpay Link: ${dynamicLink})`,
      channel: channel === "WHATSAPP" ? "WHATSAPP" : "RAZORPAY_RETRY",
      executionStatus: "EXECUTED",
      humanReviewRequired: false,
    });

    return { caseId, caseNumber, paymentId };
  }
}

const globalForRepo = global as unknown as { recoverAiRepo?: InMemoryRepository };

export const repository = globalForRepo.recoverAiRepo || new InMemoryRepository();

if (process.env.NODE_ENV !== "production") {
  globalForRepo.recoverAiRepo = repository;
}
