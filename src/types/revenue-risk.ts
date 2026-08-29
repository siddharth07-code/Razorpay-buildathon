export type RiskTier = "CRITICAL" | "HIGH" | "MODERATE" | "LOW";

export type HealthTrend = "IMPROVING" | "STABLE" | "DETERIORATING";

export interface RevenueRisk {
  id: string;
  customerId: string;
  customerName: string;
  customerTier: string;
  riskScore: number; // 0 to 100
  churnProbability: number; // 0.00 to 1.00
  revenueAtRisk: number; // in INR
  riskTier: RiskTier;
  keyRiskFactors: string[];
  recommendedAction: string;
  lastPaymentHealth: "HEALTHY" | "DEGRADED" | "CRITICAL";
  healthTrend: HealthTrend;
  dunningSequenceName: string;
  consecutiveFailures: number;
  lastFailureDate: string;
  suggestedGracePeriodDays: number;
  createdAt: string;
}
