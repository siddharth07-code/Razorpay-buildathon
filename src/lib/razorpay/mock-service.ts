import { IRazorpayService } from "./provider";
import {
  CreatePaymentLinkRequest,
  PaymentLinkResponse,
  RazorpayPaymentItem,
  MandateRetryRequest,
  MandateRetryResponse,
  CreateOrderRequest,
  RazorpayOrderResponse,
  ConnectionTestResult,
  RazorpaySubscriptionItem,
  CreateSubscriptionLinkRequest,
  SubscriptionLinkResponse,
} from "./types";
import { rupeesToPaise, paiseToRupees } from "../utils";
import { appConfig } from "../config";

export class MockRazorpayService implements IRazorpayService {
  private paymentLinks: Map<string, PaymentLinkResponse> = new Map();
  private subscriptionLinks: Map<string, SubscriptionLinkResponse> = new Map();
  private subscriptions: Map<string, RazorpaySubscriptionItem> = new Map();
  private orders: Map<string, RazorpayOrderResponse> = new Map();
  private payments: Map<string, RazorpayPaymentItem> = new Map();

  public isMockMode(): boolean {
    return true;
  }

  public async fetchSubscription(subscriptionId: string): Promise<RazorpaySubscriptionItem | null> {
    if (this.subscriptions.has(subscriptionId)) {
      return this.subscriptions.get(subscriptionId)!;
    }
    return {
      id: subscriptionId,
      entity: "subscription",
      plan_id: "plan_demo_saas_annual",
      status: "pending",
      current_start: Math.floor(Date.now() / 1000) - 86400 * 30,
      current_end: Math.floor(Date.now() / 1000),
      charge_at: Math.floor(Date.now() / 1000),
      auth_attempts: 1,
      total_count: 12,
      paid_count: 5,
      created_at: Math.floor(Date.now() / 1000) - 86400 * 150,
    };
  }

  public async createSubscriptionLink(params: CreateSubscriptionLinkRequest): Promise<SubscriptionLinkResponse> {
    const linkId = `sub_link_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const shortUrl = `https://rzp.io/i/demo_sub_${linkId.substring(14)}`;
    const amountInPaise = rupeesToPaise(params.amount);

    const response: SubscriptionLinkResponse = {
      id: linkId,
      subscriptionId: params.subscriptionId,
      short_url: shortUrl,
      amount: amountInPaise,
      status: "created",
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        contact: params.customer.contact,
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    this.subscriptionLinks.set(linkId, response);
    return response;
  }

  public async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false): Promise<boolean> {
    const sub = await this.fetchSubscription(subscriptionId);
    if (sub) {
      sub.status = "cancelled";
      this.subscriptions.set(subscriptionId, sub);
    }
    return true;
  }

  public async createOrder(params: CreateOrderRequest): Promise<RazorpayOrderResponse> {
    const orderId = `order_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const amountInPaise = rupeesToPaise(params.amount);

    const order: RazorpayOrderResponse = {
      id: orderId,
      entity: "order",
      amount: amountInPaise,
      amount_paid: 0,
      amount_due: amountInPaise,
      currency: params.currency || "INR",
      receipt: params.receipt || `rcpt_${Date.now()}`,
      status: "created",
      attempts: 0,
      notes: params.notes,
      created_at: Math.floor(Date.now() / 1000),
    };

    this.orders.set(orderId, order);
    return order;
  }

  public async fetchOrder(orderId: string): Promise<RazorpayOrderResponse | null> {
    return this.orders.get(orderId) || null;
  }

  public async fetchPayment(paymentId: string): Promise<RazorpayPaymentItem | null> {
    return this.payments.get(paymentId) || null;
  }

  public async createPaymentLink(params: CreatePaymentLinkRequest): Promise<PaymentLinkResponse> {
    const linkId = `plink_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const shortUrl = `https://rzp.io/i/demo_${linkId.substring(6)}`;
    const amountInPaise = rupeesToPaise(params.amount);

    const response: PaymentLinkResponse = {
      id: linkId,
      short_url: shortUrl,
      amount: amountInPaise,
      amount_paid: 0,
      currency: params.currency || "INR",
      status: "created",
      description: params.description,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        contact: params.customer.contact,
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    this.paymentLinks.set(linkId, response);
    return response;
  }

  public async cancelPaymentLink(linkId: string): Promise<boolean> {
    const existing = this.paymentLinks.get(linkId);
    if (!existing) return false;
    existing.status = "cancelled";
    this.paymentLinks.set(linkId, existing);
    return true;
  }

  public async triggerMandateRetry(params: MandateRetryRequest): Promise<MandateRetryResponse> {
    // Simulate smart bank routing logic
    const paymentId = `pay_retry_${Date.now()}`;
    const amountInPaise = rupeesToPaise(params.amount);

    // Save payment
    this.payments.set(paymentId, {
      id: paymentId,
      entity: "payment",
      amount: amountInPaise,
      currency: "INR",
      status: "captured",
      international: false,
      method: "nach",
      amount_refunded: 0,
      captured: true,
      email: "finance@client.in",
      contact: "+919876543210",
      created_at: Math.floor(Date.now() / 1000),
    });

    return {
      success: true,
      paymentId,
      status: "captured",
      retryAttemptNumber: 1,
      message: `Mandate retry executed successfully via Razorpay NACH clearing (${paymentId}).`,
    };
  }

  public async verifyConnection(): Promise<ConnectionTestResult> {
    const keyId = appConfig.razorpay.keyId || "rzp_test_recoverai_demo";
    const maskedKeyId = keyId.length > 8 ? keyId.substring(0, 8) + "••••••••" : "rzp_test_••••";

    return {
      connected: true,
      environment: "test",
      mode: "mock",
      maskedKeyId,
      keyId,
      message: "Connected to Razorpay Local Sandbox Simulator (Zero Latency Mock Provider).",
      merchantName: appConfig.merchant.name,
      latencyMs: 1,
    };
  }

  public async simulatePaymentFailure(params: {
    amount: number;
    method: "upi" | "card" | "netbanking" | "nach";
    errorCode: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<{ payment: RazorpayPaymentItem; simulated: boolean }> {
    const paymentId = `pay_sim_${Date.now()}`;
    const payment: RazorpayPaymentItem = {
      id: paymentId,
      entity: "payment",
      amount: rupeesToPaise(params.amount),
      currency: "INR",
      status: "failed",
      international: false,
      method: params.method,
      amount_refunded: 0,
      captured: false,
      email: params.customerEmail,
      contact: params.customerPhone,
      error_code: params.errorCode,
      error_description: `Simulated Sandbox Failure: ${params.errorCode}`,
      error_source: "bank",
      error_step: "payment_authentication",
      error_reason: params.errorCode.toLowerCase(),
      created_at: Math.floor(Date.now() / 1000),
    };

    this.payments.set(paymentId, payment);
    return { payment, simulated: true };
  }

  public async simulatePaymentRecovery(paymentId: string): Promise<{ payment: RazorpayPaymentItem; recovered: boolean }> {
    const existing = this.payments.get(paymentId);
    if (existing) {
      existing.status = "captured";
      existing.captured = true;
      this.payments.set(paymentId, existing);
      return { payment: existing, recovered: true };
    }

    const payment: RazorpayPaymentItem = {
      id: paymentId,
      entity: "payment",
      amount: 14999900,
      currency: "INR",
      status: "captured",
      international: false,
      method: "nach",
      amount_refunded: 0,
      captured: true,
      email: "recovered@customer.in",
      contact: "+919876543210",
      created_at: Math.floor(Date.now() / 1000),
    };

    this.payments.set(paymentId, payment);
    return { payment, recovered: true };
  }
}
