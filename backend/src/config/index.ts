import dotenv from "dotenv";
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "5001", 10),
  isDev: (process.env.NODE_ENV || "development") === "development",
  db: {
    url: process.env.DATABASE_URL || "",
    directUrl: process.env.DIRECT_URL || "",
  },
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "recoverai_webhook_secret",
    environment: process.env.RAZORPAY_ENVIRONMENT || "test",
    mode: (process.env.RAZORPAY_MODE || "mock").toLowerCase() as "mock" | "sandbox" | "live",
  },
  merchant: {
    name: process.env.NEXT_PUBLIC_MERCHANT_NAME || "SaaSify Technologies India Pvt Ltd",
    currency: process.env.NEXT_PUBLIC_CURRENCY || "INR",
    timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata",
  },
  policy: {
    maxPaymentRetries: 3,
    maxCustomerContacts: 3,
    minimumRetryIntervalHours: 12,
    humanApprovalAmountPaise: 10000000n, // ₹1,00,000 in paise (1,00,000 * 100)
    humanApprovalAmountRupees: 100000,
    maxEscalationLevel: 3,
    checkoutAbandonmentWindowMinutes: parseInt(process.env.CHECKOUT_ABANDONMENT_WINDOW_MINUTES || "30", 10),
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  },
};
