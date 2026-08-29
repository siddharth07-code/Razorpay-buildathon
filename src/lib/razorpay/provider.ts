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

export interface IRazorpayService {
  /**
   * Fetch payment details by ID
   */
  fetchPayment(paymentId: string): Promise<RazorpayPaymentItem | null>;

  /**
   * Create an official Razorpay Order
   */
  createOrder(params: CreateOrderRequest): Promise<RazorpayOrderResponse>;

  /**
   * Fetch an official Razorpay Order by ID
   */
  fetchOrder(orderId: string): Promise<RazorpayOrderResponse | null>;

  /**
   * Create a dynamic payment link with intelligent expiration and channels
   */
  createPaymentLink(params: CreatePaymentLinkRequest): Promise<PaymentLinkResponse>;

  /**
   * Cancel an existing payment link
   */
  cancelPaymentLink(linkId: string): Promise<boolean>;

  /**
   * Trigger an automated or scheduled mandate/subscription retry
   */
  triggerMandateRetry(params: MandateRetryRequest): Promise<MandateRetryResponse>;

  /**
   * Verify credentials against Razorpay API
   */
  verifyConnection(): Promise<ConnectionTestResult>;

  /**
   * Simulate a failed payment event for Sandbox testing
   */
  simulatePaymentFailure(params: {
    amount: number;
    method: "upi" | "card" | "netbanking" | "nach";
    errorCode: string;
    customerEmail: string;
    customerPhone: string;
  }): Promise<{ payment: RazorpayPaymentItem; simulated: boolean }>;

  /**
   * Simulate a recovered payment event for Sandbox testing
   */
  simulatePaymentRecovery(paymentId: string): Promise<{ payment: RazorpayPaymentItem; recovered: boolean }>;

  /**
   * Fetch subscription details by ID
   */
  fetchSubscription(subscriptionId: string): Promise<RazorpaySubscriptionItem | null>;

  /**
   * Create a 1-click subscription recovery link
   */
  createSubscriptionLink(params: CreateSubscriptionLinkRequest): Promise<SubscriptionLinkResponse>;

  /**
   * Cancel an existing subscription
   */
  cancelSubscription(subscriptionId: string, cancelAtCycleEnd?: boolean): Promise<boolean>;

  /**
   * Check if service is running in mock/demo mode
   */
  isMockMode(): boolean;
}

// Lazy provider resolution
let razorpayInstance: IRazorpayService | null = null;

export function resetRazorpayInstance() {
  razorpayInstance = null;
}

export async function getRazorpayService(): Promise<IRazorpayService> {
  if (razorpayInstance) {
    return razorpayInstance;
  }

  const { appConfig } = await import("../config");

  // In sandbox or live mode with valid key ID, instantiate live RazorpayService
  if (appConfig.razorpay.keyId && appConfig.razorpay.keyId.startsWith("rzp_") && !appConfig.isMock) {
    const { RazorpayService } = await import("./live-service");
    razorpayInstance = new RazorpayService(
      appConfig.razorpay.keyId,
      appConfig.razorpay.keySecret
    );
    console.log("[RAZORPAY PROVIDER]", {
      mode: "sandbox",
      provider: "RazorpayService",
      keyPrefix: appConfig.razorpay.keyId.substring(0, 9),
    });
  } else {
    const { MockRazorpayService } = await import("./mock-service");
    razorpayInstance = new MockRazorpayService();
    console.log("[RAZORPAY PROVIDER]", {
      mode: "mock",
      provider: "MockRazorpayService",
    });
  }

  return razorpayInstance;
}
