export const appConfig = {
  appEnv: process.env.RAZORPAY_ENVIRONMENT || process.env.NEXT_PUBLIC_APP_ENV || "test",
  isSandbox: (process.env.RAZORPAY_ENVIRONMENT || "test") === "test",
  isMock: (process.env.RAZORPAY_MODE || "mock").toLowerCase() === "mock",
  razorpayMode: (process.env.RAZORPAY_MODE || "mock").toLowerCase() as "mock" | "sandbox" | "live",
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "recoverai_webhook_secret_demo",
  },
  merchant: {
    name: process.env.NEXT_PUBLIC_MERCHANT_NAME || "VIREON Technologies Pvt Ltd",
    currency: process.env.NEXT_PUBLIC_CURRENCY || "INR",
    timezone: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE || "Asia/Kolkata",
  },
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  },
  policy: {
    maxPaymentRetries: 3,
    maxCustomerContacts: 3,
    minimumRetryIntervalHours: 12,
    humanApprovalAmount: 100000, // ₹1,00,000 threshold
    maxEscalationLevel: 3,
    checkoutAbandonmentWindowMinutes: parseInt(process.env.CHECKOUT_ABANDONMENT_WINDOW_MINUTES || "30", 10),
  },
};

