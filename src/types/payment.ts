export type PaymentStatus =
  | "created"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded";

export type PaymentMethod =
  | "upi"
  | "card"
  | "netbanking"
  | "nach"
  | "wallet"
  | "emi";

export type RazorpayErrorCode =
  | "BAD_REQUEST_ERROR"
  | "GATEWAY_ERROR"
  | "PAYMENT_AUTHENTICATION_FAILED"
  | "INSUFFICIENT_FUNDS"
  | "CARD_EXPIRED"
  | "MANDATE_EXECUTION_FAILED"
  | "UPI_COLLECT_TIMEOUT"
  | "NETWORK_FAILURE"
  | "BANK_SERVER_DOWN"
  | "AUTHENTICATION_TIMED_OUT";

export interface Payment {
  id: string;
  razorpayPaymentId: string;
  razorpayOrderId?: string;
  customerId: string;
  amount: number; // in INR (stored in whole INR, represented in paise when interacting with Razorpay)
  currency: "INR";
  status: PaymentStatus;
  method: PaymentMethod;
  vpa?: string; // for UPI payments, e.g., user@okhdfcbank
  bank?: string; // e.g., HDFC, ICICI, SBIN, AXIS
  cardNetwork?: "VISA" | "MASTERCARD" | "RUPAY" | "AMEX";
  cardLast4?: string;
  errorCode?: RazorpayErrorCode;
  errorDescription?: string;
  errorSource?: "customer" | "bank" | "gateway" | "business";
  errorReason?: string;
  errorStep?: "payment_authentication" | "payment_authorization" | "mandate_execution";
  attempts: number;
  lastAttemptAt: string;
  createdAt: string;
  metadata?: Record<string, any>;
}
