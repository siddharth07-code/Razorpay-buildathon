export type CustomerTier = "ENTERPRISE" | "GROWTH" | "STARTER" | "D2C";

export type PreferredPaymentMethod = "upi" | "card" | "netbanking" | "nach";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  gstNumber?: string;
  tier: CustomerTier;
  ltv: number; // in INR
  preferredPaymentMethod: PreferredPaymentMethod;
  failureCount: number;
  activeSubscriptionId?: string;
  recoveryCount: number;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}
