export interface RazorpayPaymentItem {
  id: string;
  entity: "payment";
  amount: number; // in paise
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  order_id?: string;
  invoice_id?: string;
  international: boolean;
  method: "card" | "netbanking" | "wallet" | "emi" | "upi" | "nach";
  amount_refunded: number;
  refund_status?: string | null;
  captured: boolean;
  description?: string;
  card_id?: string;
  bank?: string;
  wallet?: string;
  vpa?: string;
  email: string;
  contact: string;
  fee?: number;
  tax?: number;
  error_code?: string;
  error_description?: string;
  error_source?: string;
  error_step?: string;
  error_reason?: string;
  created_at: number;
}

export interface CreateOrderRequest {
  amount: number; // in INR
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
  payment_capture?: 1 | 0;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: "order";
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt?: string;
  status: "created" | "attempted" | "paid";
  attempts: number;
  notes?: Record<string, string>;
  created_at: number;
}

export interface CreatePaymentLinkRequest {
  amount: number; // in INR
  currency?: string;
  description: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  notify?: {
    sms?: boolean;
    email?: boolean;
    whatsapp?: boolean;
  };
  reminder_enable?: boolean;
  notes?: Record<string, string>;
  callback_url?: string;
  callback_method?: "get" | "post";
  expire_by?: number; // timestamp
}

export interface PaymentLinkResponse {
  id: string;
  short_url: string;
  amount: number; // paise
  amount_paid: number;
  currency: string;
  status: "created" | "partially_paid" | "paid" | "expired" | "cancelled";
  description: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  created_at: number;
}

export interface MandateRetryRequest {
  subscriptionId: string;
  mandateId: string;
  amount: number; // in INR
  scheduledSlot?: string;
}

export interface MandateRetryResponse {
  success: boolean;
  paymentId?: string;
  status: "initiated" | "captured" | "failed";
  retryAttemptNumber: number;
  message: string;
  errorCode?: string;
  errorDescription?: string;
}

export interface ConnectionTestResult {
  connected: boolean;
  environment: "test" | "live";
  mode: "mock" | "sandbox" | "live";
  maskedKeyId: string;
  keyId: string;
  message: string;
  merchantName: string;
  latencyMs: number;
  details?: Record<string, any>;
}

export interface RazorpaySubscriptionItem {
  id: string;
  entity: "subscription";
  plan_id: string;
  customer_id?: string;
  status: "created" | "authenticated" | "active" | "pending" | "halted" | "cancelled" | "completed" | "expired";
  current_start?: number;
  current_end?: number;
  ended_at?: number | null;
  quantity?: number;
  notes?: Record<string, string>;
  charge_at?: number;
  start_at?: number;
  end_at?: number;
  auth_attempts?: number;
  total_count?: number;
  paid_count?: number;
  customer_notify?: boolean;
  created_at: number;
  short_url?: string;
  has_scheduled_changes?: boolean;
  change_scheduled_at?: number | null;
}

export interface CreateSubscriptionLinkRequest {
  subscriptionId: string;
  amount: number; // in INR
  description?: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  notes?: Record<string, string>;
}

export interface SubscriptionLinkResponse {
  id: string;
  subscriptionId: string;
  short_url: string;
  amount: number; // in paise
  status: string;
  customer: {
    name: string;
    email: string;
    contact: string;
  };
  created_at: number;
}

export interface RazorpayWebhookPayload {
  entity: "event";
  account_id: string;
  event:
    | "payment.authorized"
    | "payment.failed"
    | "payment.captured"
    | "order.paid"
    | "subscription.authenticated"
    | "subscription.activated"
    | "subscription.charged"
    | "subscription.pending"
    | "subscription.halted"
    | "subscription.cancelled"
    | "subscription.resumed"
    | "subscription.paused"
    | "payment_link.created"
    | "payment_link.paid"
    | "payment_link.expired"
    | "payment_link.cancelled"
    | "invoice.paid"
    | "invoice.expired";
  contains: string[];
  payload: {
    payment?: {
      entity: RazorpayPaymentItem;
    };
    order?: {
      entity: RazorpayOrderResponse;
    };
    payment_link?: {
      entity: PaymentLinkResponse;
    };
    subscription?: {
      entity: RazorpaySubscriptionItem;
    };
    invoice?: {
      entity: any;
    };
  };
  created_at: number;
}

