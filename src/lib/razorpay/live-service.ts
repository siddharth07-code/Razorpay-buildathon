import Razorpay from "razorpay";
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

export class RazorpayService implements IRazorpayService {
  private client: Razorpay;
  private keyId: string;

  constructor(keyId: string, keySecret: string) {
    this.keyId = keyId;
    this.client = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  public isMockMode(): boolean {
    return false;
  }

  public async fetchPayment(paymentId: string): Promise<RazorpayPaymentItem | null> {
    try {
      const payment: any = await this.client.payments.fetch(paymentId);
      return payment as RazorpayPaymentItem;
    } catch (error) {
      console.error("[RazorpayService] Failed to fetch payment:", error);
      return null;
    }
  }

  public async fetchSubscription(subscriptionId: string): Promise<RazorpaySubscriptionItem | null> {
    try {
      const sub: any = await (this.client as any).subscriptions.fetch(subscriptionId);
      return sub as RazorpaySubscriptionItem;
    } catch (error) {
      console.error("[RazorpayService] Failed to fetch subscription:", error);
      return null;
    }
  }

  public async createSubscriptionLink(params: CreateSubscriptionLinkRequest): Promise<SubscriptionLinkResponse> {
    const amountInPaise = rupeesToPaise(params.amount);
    const payload: any = {
      amount: amountInPaise,
      currency: "INR",
      accept_partial: false,
      description: params.description || `Subscription recovery for ${params.subscriptionId}`,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        contact: params.customer.contact,
      },
      notify: {
        sms: true,
        email: true,
        whatsapp: true,
      },
      reminder_enable: true,
      notes: {
        source: "VIREON_SubscriptionRecovery",
        subscription_id: params.subscriptionId,
        ...params.notes,
      },
    };

    const response: any = await this.client.paymentLink.create(payload);

    return {
      id: response.id,
      subscriptionId: params.subscriptionId,
      short_url: response.short_url,
      amount: response.amount,
      status: response.status,
      customer: {
        name: response.customer?.name || params.customer.name,
        email: response.customer?.email || params.customer.email,
        contact: response.customer?.contact || params.customer.contact,
      },
      created_at: response.created_at,
    };
  }

  public async cancelSubscription(subscriptionId: string, cancelAtCycleEnd: boolean = false): Promise<boolean> {
    try {
      await (this.client as any).subscriptions.cancel(subscriptionId, cancelAtCycleEnd);
      return true;
    } catch (error) {
      console.error("[RazorpayService] Failed to cancel subscription:", error);
      return false;
    }
  }

  public async createOrder(params: CreateOrderRequest): Promise<RazorpayOrderResponse> {
    const amountInPaise = rupeesToPaise(params.amount);
    const payload: any = {
      amount: amountInPaise,
      currency: params.currency || "INR",
      receipt: params.receipt || `rcpt_${Date.now()}`,
      notes: {
        source: "VIREON_Agent",
        ...params.notes,
      },
      payment_capture: params.payment_capture ?? 1,
    };

    const order: any = await this.client.orders.create(payload);
    return {
      id: order.id,
      entity: "order",
      amount: order.amount,
      amount_paid: order.amount_paid || 0,
      amount_due: order.amount_due || order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      attempts: order.attempts || 0,
      notes: order.notes,
      created_at: order.created_at,
    };
  }

  public async fetchOrder(orderId: string): Promise<RazorpayOrderResponse | null> {
    try {
      const order: any = await this.client.orders.fetch(orderId);
      return {
        id: order.id,
        entity: "order",
        amount: order.amount,
        amount_paid: order.amount_paid || 0,
        amount_due: order.amount_due || 0,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
        attempts: order.attempts || 0,
        notes: order.notes,
        created_at: order.created_at,
      };
    } catch (error) {
      console.error("[RazorpayService] Failed to fetch order:", error);
      return null;
    }
  }

  public async createPaymentLink(params: CreatePaymentLinkRequest): Promise<PaymentLinkResponse> {
    const amountInPaise = rupeesToPaise(params.amount);

    const payload: any = {
      amount: amountInPaise,
      currency: params.currency || "INR",
      accept_partial: false,
      description: params.description,
      customer: {
        name: params.customer.name,
        email: params.customer.email,
        contact: params.customer.contact,
      },
      notify: {
        sms: params.notify?.sms ?? true,
        email: params.notify?.email ?? true,
        whatsapp: params.notify?.whatsapp ?? true,
      },
      reminder_enable: params.reminder_enable ?? true,
      notes: {
        source: "VIREON_SmartDunning",
        ...params.notes,
      },
    };

    if (params.expire_by) {
      payload.expire_by = params.expire_by;
    }

    const response: any = await this.client.paymentLink.create(payload);

    return {
      id: response.id,
      short_url: response.short_url,
      amount: response.amount,
      amount_paid: response.amount_paid || 0,
      currency: response.currency,
      status: response.status,
      description: response.description,
      customer: {
        name: response.customer?.name || params.customer.name,
        email: response.customer?.email || params.customer.email,
        contact: response.customer?.contact || params.customer.contact,
      },
      created_at: response.created_at,
    };
  }

  public async cancelPaymentLink(linkId: string): Promise<boolean> {
    try {
      await this.client.paymentLink.cancel(linkId);
      return true;
    } catch (error) {
      console.error("[RazorpayService] Failed to cancel payment link:", error);
      return false;
    }
  }

  public async triggerMandateRetry(params: MandateRetryRequest): Promise<MandateRetryResponse> {
    try {
      const amountInPaise = rupeesToPaise(params.amount);
      const chargeResponse: any = await (this.client as any).subscriptions.charge({
        subscription_id: params.subscriptionId,
        amount: amountInPaise,
      });

      return {
        success: true,
        paymentId: chargeResponse.payment_id || chargeResponse.id,
        status: chargeResponse.status === "captured" ? "captured" : "initiated",
        retryAttemptNumber: 1,
        message: "Mandate retry triggered successfully via Razorpay API",
      };
    } catch (error: any) {
      console.error("[RazorpayService] Mandate retry error:", error);
      return {
        success: false,
        status: "failed",
        retryAttemptNumber: 1,
        errorCode: error?.error?.code || "MANDATE_EXECUTION_FAILED",
        errorDescription: error?.error?.description || error?.message || "Failed to execute recurring charge",
        message: `Razorpay Mandate presentation failed: ${error?.error?.description || error?.message}`,
      };
    }
  }

  public async verifyConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    try {
      // Execute a safe lightweight fetch to verify credentials
      await this.client.payments.all({ count: 1 });
      const latencyMs = Date.now() - startTime;
      const maskedKeyId = this.keyId.substring(0, 8) + "••••••••" + this.keyId.substring(this.keyId.length - 4);

      return {
        connected: true,
        environment: this.keyId.startsWith("rzp_live_") ? "live" : "test",
        mode: "sandbox",
        maskedKeyId,
        keyId: this.keyId,
        message: "Successfully connected to Razorpay Sandbox API (Authenticated).",
        merchantName: appConfig.merchant.name,
        latencyMs,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      const maskedKeyId = this.keyId.length > 8 ? this.keyId.substring(0, 8) + "••••••••" : "rzp_test_••••";

      return {
        connected: false,
        environment: "test",
        mode: "sandbox",
        maskedKeyId,
        keyId: this.keyId,
        message: `Razorpay API Authentication Failed: ${error?.error?.description || error?.message || "Invalid Key Secret"}`,
        merchantName: appConfig.merchant.name,
        latencyMs,
        details: error?.error,
      };
    }
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

    return { payment, simulated: true };
  }

  public async simulatePaymentRecovery(paymentId: string): Promise<{ payment: RazorpayPaymentItem; recovered: boolean }> {
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

    return { payment, recovered: true };
  }
}

