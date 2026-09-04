/**
 * VIREON — Supervised ML Recoverability Client
 * ============================================
 * Strongly typed client for the Python FastAPI ML inference service.
 * Handles timeouts, network retries, failure detection, and controlled fallback.
 *
 * CRITICAL INVARIANT:
 * If the ML service is unreachable or errors out, this client NEVER fabricates
 * a fake score. It returns a controlled fallback state with `success: false`.
 * ML failures must NEVER bypass the VIREON policy engine.
 */

export interface MLPredictionFeatures {
  amountAtRiskPaise: bigint | number;
  customerLTVPaise?: bigint | number;
  failureType: string;
  retryCount?: number;
  daysOverdue?: number;
  previousSuccessfulPayments?: number;
  previousRecoveryAttempts?: number;
  paymentMethod?: string;
  customerTenureDays?: number;
}

export interface MLPredictionResult {
  success: boolean;
  probability: number | null;        // Statistical probability 0.0 to 1.0 (Recovery Probability)
  recoverabilityScore: number | null;// 0.0 to 100.0
  priority: "HIGH" | "MEDIUM" | "LOW";
  modelVersion: string;
  isFallback: boolean;
  error?: string;
}

export class RecoverabilityClient {
  private serviceUrl: string;
  private timeoutMs: number;

  constructor() {
    this.serviceUrl = process.env.ML_SERVICE_URL || "http://localhost:9000";
    this.timeoutMs = parseInt(process.env.ML_TIMEOUT_MS || "3000", 10);
  }

  /**
   * Predict recovery probability and recoverability score for a case
   */
  public async predict(features: MLPredictionFeatures): Promise<MLPredictionResult> {
    const amountRupees = typeof features.amountAtRiskPaise === "bigint"
      ? Number(features.amountAtRiskPaise) / 100
      : Number(features.amountAtRiskPaise || 0) / 100;

    const ltvRupees = typeof features.customerLTVPaise === "bigint"
      ? Number(features.customerLTVPaise) / 100
      : Number(features.customerLTVPaise || 0) / 100;

    const payload = {
      amount_at_risk: Math.max(0, amountRupees),
      customer_ltv: Math.max(0, ltvRupees),
      failure_type: (features.failureType || "AUTHENTICATION_FAILURE").toUpperCase(),
      retry_count: Math.max(0, features.retryCount || 0),
      days_overdue: Math.max(0, features.daysOverdue || 0),
      previous_successful_payments: Math.max(0, features.previousSuccessfulPayments || 0),
      previous_recovery_attempts: Math.max(0, features.previousRecoveryAttempts || 0),
      payment_method: (features.paymentMethod || "CARD").toUpperCase(),
      customer_tenure_days: Math.max(1, features.customerTenureDays || 30),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.serviceUrl}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown server error");
        console.warn(`[ML Client] Server responded with HTTP ${response.status}: ${errorText}`);
        return this.createFallbackResult(`ML Service Error HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (typeof data.probability !== "number" || typeof data.recoverabilityScore !== "number") {
        console.warn("[ML Client] Invalid response format from ML service:", data);
        return this.createFallbackResult("Invalid response schema from ML inference service");
      }

      const probability = Math.max(0.0, Math.min(1.0, data.probability));
      const recoverabilityScore = Math.max(0.0, Math.min(100.0, data.recoverabilityScore));

      let priority: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
      if (recoverabilityScore >= 80.0) priority = "HIGH";
      else if (recoverabilityScore < 60.0) priority = "LOW";

      return {
        success: true,
        probability,
        recoverabilityScore,
        priority,
        modelVersion: data.modelVersion || "v1",
        isFallback: false,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isTimeout = err.name === "AbortError";
      const errorMsg = isTimeout
        ? `ML Service request timed out after ${this.timeoutMs}ms`
        : `Failed to connect to ML service at ${this.serviceUrl}: ${err.message}`;

      console.warn(`[ML Client] ${errorMsg}. Employing controlled fallback.`);
      return this.createFallbackResult(errorMsg);
    }
  }

  /**
   * Health check for inference service
   */
  public async checkHealth(): Promise<{ healthy: boolean; version?: string; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`${this.serviceUrl}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return { healthy: true, version: data.modelVersion };
      }
      return { healthy: false, error: `HTTP ${res.status}` };
    } catch (err: any) {
      return { healthy: false, error: err.message };
    }
  }

  /**
   * Controlled failure state — NEVER fabricate false scores
   */
  private createFallbackResult(reason: string): MLPredictionResult {
    return {
      success: false,
      probability: null,
      recoverabilityScore: null,
      priority: "MEDIUM",
      modelVersion: "v1-fallback",
      isFallback: true,
      error: reason,
    };
  }
}

export const recoverabilityClient = new RecoverabilityClient();
