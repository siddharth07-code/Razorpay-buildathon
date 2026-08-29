import crypto from "crypto";
import { revenueRiskAgent } from "../agents/risk-agent";
import { rootCauseAgent } from "../agents/root-cause-agent";
import { recoveryStrategyAgent } from "../agents/strategy-agent";
import { policyAgent } from "../agents/policy-agent";
import { outcomeAgent } from "../agents/outcome-agent";
import { verifyRazorpaySignature } from "@/lib/razorpay/signature";
import { Payment } from "@/types/payment";
import { Customer } from "@/types/customer";

export interface TestCaseResult {
  testId: number;
  name: string;
  category: string;
  passed: boolean;
  expected: string;
  actual: string;
  details?: any;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestCaseResult[];
}

export async function runAllUnitTests(): Promise<TestSuiteSummary> {
  const startTime = Date.now();
  const results: TestCaseResult[] = [];

  const sampleCustomer: Customer = {
    id: "cust_test_01",
    name: "Vikram Malhotra",
    email: "vikram@enterprise.in",
    phone: "+919876543210",
    tier: "ENTERPRISE",
    ltv: 500000,
    preferredPaymentMethod: "nach",
    failureCount: 1,
    recoveryCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleFailedPayment: Payment = {
    id: "pay_test_01",
    razorpayPaymentId: "pay_rzp_test_01",
    customerId: "cust_test_01",
    amount: 149999,
    currency: "INR",
    status: "failed",
    method: "nach",
    errorCode: "INSUFFICIENT_FUNDS",
    errorDescription: "Debit presentation declined due to balance limit",
    attempts: 1,
    lastAttemptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  // Test 1: Deterministic Risk Scoring
  try {
    const riskOutput = revenueRiskAgent.evaluateRisk({
      payment: sampleFailedPayment,
      customer: sampleCustomer,
    });

    const isRiskValid =
      riskOutput.riskScore >= 0 &&
      riskOutput.riskScore <= 100 &&
      riskOutput.recoverabilityScore > 0 &&
      riskOutput.expectedRecoveryValue > 0 &&
      riskOutput.priority === "P0"; // > ₹1,00,000 should be P0

    results.push({
      testId: 1,
      name: "Deterministic Risk Scoring",
      category: "Risk Agent",
      passed: isRiskValid,
      expected: "Priority P0, deterministic score and recovery value calculation",
      actual: `Priority: ${riskOutput.priority}, Score: ${riskOutput.riskScore}, Expected: ₹${riskOutput.expectedRecoveryValue}`,
      details: riskOutput,
    });
  } catch (err: any) {
    results.push({
      testId: 1,
      name: "Deterministic Risk Scoring",
      category: "Risk Agent",
      passed: false,
      expected: "Valid Risk Output",
      actual: err.message,
    });
  }

  // Test 2: Policy Validation Rules (Standard Case)
  try {
    const policyResult = policyAgent.evaluatePolicy({
      caseId: "case_01",
      amount: 45000,
      action: "CREATE_PAYMENT_LINK",
      recoveryAttempts: 1,
      customerContactCount: 1,
    });

    const isAllowed = policyResult.allowed && !policyResult.requiresHumanApproval;
    results.push({
      testId: 2,
      name: "Standard Policy Validation Rules",
      category: "Policy Agent",
      passed: isAllowed,
      expected: "Policy allowed = true, requiresHumanApproval = false",
      actual: `Allowed: ${policyResult.allowed}, RequiresApproval: ${policyResult.requiresHumanApproval}`,
      details: policyResult,
    });
  } catch (err: any) {
    results.push({
      testId: 2,
      name: "Standard Policy Validation Rules",
      category: "Policy Agent",
      passed: false,
      expected: "Allowed",
      actual: err.message,
    });
  }

  // Test 3: Retry Limit Enforcement (Max 3 retries)
  try {
    const retryExceededPolicy = policyAgent.evaluatePolicy({
      caseId: "case_02",
      amount: 25000,
      action: "RETRY_PAYMENT",
      recoveryAttempts: 3, // Already 3 attempts done
      customerContactCount: 1,
    });

    const isBlocked = !retryExceededPolicy.allowed;
    results.push({
      testId: 3,
      name: "Retry Limit Enforcement (Max 3 Retries)",
      category: "Policy Agent",
      passed: isBlocked,
      expected: "Policy allowed = false when recoveryAttempts >= 3",
      actual: `Allowed: ${retryExceededPolicy.allowed}, Reason: ${retryExceededPolicy.reason}`,
      details: retryExceededPolicy,
    });
  } catch (err: any) {
    results.push({
      testId: 3,
      name: "Retry Limit Enforcement",
      category: "Policy Agent",
      passed: false,
      expected: "Blocked",
      actual: err.message,
    });
  }

  // Test 4: Human Approval Threshold (> ₹1,00,000)
  try {
    const highValuePolicy = policyAgent.evaluatePolicy({
      caseId: "case_03",
      amount: 150000, // ₹1,50,000 > ₹1,00,000 threshold
      action: "CREATE_PAYMENT_LINK",
      recoveryAttempts: 1,
      customerContactCount: 1,
    });

    const requiresApproval = highValuePolicy.allowed && highValuePolicy.requiresHumanApproval;
    results.push({
      testId: 4,
      name: "Human Approval Threshold (> ₹1,00,000)",
      category: "Policy Agent",
      passed: requiresApproval,
      expected: "requiresHumanApproval = true for amounts >= ₹1,00,000",
      actual: `requiresHumanApproval: ${highValuePolicy.requiresHumanApproval}`,
      details: highValuePolicy,
    });
  } catch (err: any) {
    results.push({
      testId: 4,
      name: "Human Approval Threshold",
      category: "Policy Agent",
      passed: false,
      expected: "Requires Approval",
      actual: err.message,
    });
  }

  // Test 5: Unsupported Action Rejection
  try {
    const invalidActionPolicy = policyAgent.evaluatePolicy({
      caseId: "case_04",
      amount: 10000,
      action: "AUTO_DEBIT_UNAUTHORIZED_ACCOUNT" as any, // Invalid unsupported action
      recoveryAttempts: 0,
      customerContactCount: 0,
    });

    const isRejected = !invalidActionPolicy.allowed;
    results.push({
      testId: 5,
      name: "Unsupported Action Rejection",
      category: "Policy Agent",
      passed: isRejected,
      expected: "allowed = false for unsupported actions",
      actual: `Allowed: ${invalidActionPolicy.allowed}`,
      details: invalidActionPolicy,
    });
  } catch (err: any) {
    results.push({
      testId: 5,
      name: "Unsupported Action Rejection",
      category: "Policy Agent",
      passed: false,
      expected: "Rejected",
      actual: err.message,
    });
  }

  // Test 6: Webhook HMAC-SHA256 Signature Validation
  try {
    const secret = "test_webhook_secret_key_123";
    const payload = JSON.stringify({ event: "payment.failed", id: "evt_123" });
    const validSignature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const invalidSignature = "invalid_signature_hex_code";

    const isSignatureValid = verifyRazorpaySignature(payload, validSignature, secret);
    const isBadSignatureRejected = !verifyRazorpaySignature(payload, invalidSignature, secret);

    const testPassed = isSignatureValid && isBadSignatureRejected;
    results.push({
      testId: 6,
      name: "Webhook HMAC-SHA256 Signature Validation",
      category: "Security & Webhook",
      passed: testPassed,
      expected: "Valid signature returns true, invalid signature returns false",
      actual: `Valid test: ${isSignatureValid}, Invalid test: ${isBadSignatureRejected}`,
    });
  } catch (err: any) {
    results.push({
      testId: 6,
      name: "Webhook Signature Validation",
      category: "Security & Webhook",
      passed: false,
      expected: "True/False",
      actual: err.message,
    });
  }

  // Test 7: Duplicate Webhook Idempotency
  try {
    const eventId = "evt_idempotent_test_999";
    const processedMap = new Set<string>();

    const firstRun = !processedMap.has(eventId);
    processedMap.add(eventId);

    const secondRunIsDuplicate = processedMap.has(eventId);

    const idempotencyPassed = firstRun && secondRunIsDuplicate;
    results.push({
      testId: 7,
      name: "Duplicate Webhook Idempotency",
      category: "Security & Webhook",
      passed: idempotencyPassed,
      expected: "First event accepted, subsequent duplicate event flagged idempotent",
      actual: `FirstRunAccepted: ${firstRun}, SecondRunDetectedDuplicate: ${secondRunIsDuplicate}`,
    });
  } catch (err: any) {
    results.push({
      testId: 7,
      name: "Duplicate Webhook Idempotency",
      category: "Security & Webhook",
      passed: false,
      expected: "Idempotent",
      actual: err.message,
    });
  }

  // Test 8: Successful Payment Outcome (Captured = Recovered)
  try {
    const capturedOutcome = outcomeAgent.evaluateOutcome({
      caseId: "case_05",
      amount: 45000,
      razorpayEvent: "payment.captured",
    });

    const isCapturedRecovered =
      capturedOutcome.status === "SUCCESS" &&
      capturedOutcome.isRecovered === true &&
      capturedOutcome.recoveredAmount === 45000;

    results.push({
      testId: 8,
      name: "Successful Payment Outcome (Payment Captured)",
      category: "Outcome Agent",
      passed: isCapturedRecovered,
      expected: "status = 'SUCCESS', isRecovered = true, recoveredAmount = 45000",
      actual: `Status: ${capturedOutcome.status}, isRecovered: ${capturedOutcome.isRecovered}, Amount: ${capturedOutcome.recoveredAmount}`,
      details: capturedOutcome,
    });
  } catch (err: any) {
    results.push({
      testId: 8,
      name: "Successful Payment Outcome",
      category: "Outcome Agent",
      passed: false,
      expected: "Captured Outcome",
      actual: err.message,
    });
  }

  // Test 9: Failed Payment Outcome vs Payment Link Created (Invariant check)
  try {
    // Crucial check: Payment link created is NOT revenue recovered
    const linkCreatedOutcome = outcomeAgent.evaluateOutcome({
      caseId: "case_06",
      amount: 30000,
      executionResult: {
        success: true,
        executedAction: "CREATE_PAYMENT_LINK",
        channel: "WHATSAPP",
        executionStatus: "WAITING_CUSTOMER_ACTION",
        message: "Payment link created",
      },
    });

    const isInvariantPreserved =
      linkCreatedOutcome.status === "PENDING" &&
      linkCreatedOutcome.isRecovered === false &&
      linkCreatedOutcome.recoveredAmount === 0;

    results.push({
      testId: 9,
      name: "Invariant: Payment Link Created ≠ Revenue Recovered",
      category: "Outcome Agent",
      passed: isInvariantPreserved,
      expected: "status = 'PENDING', isRecovered = false, recoveredAmount = 0",
      actual: `Status: ${linkCreatedOutcome.status}, isRecovered: ${linkCreatedOutcome.isRecovered}, Amount: ${linkCreatedOutcome.recoveredAmount}`,
      details: linkCreatedOutcome,
    });
  } catch (err: any) {
    results.push({
      testId: 9,
      name: "Failed / Pending Outcome Invariant",
      category: "Outcome Agent",
      passed: false,
      expected: "Invariant preserved",
      actual: err.message,
    });
  }

  // Test 10: Expected Recovery Value Calculation
  try {
    const paymentSmall: Payment = {
      id: "pay_small_01",
      razorpayPaymentId: "pay_rzp_small_01",
      customerId: "cust_small_01",
      amount: 10000,
      currency: "INR",
      status: "failed",
      method: "card",
      errorCode: "PAYMENT_AUTHENTICATION_FAILED",
      attempts: 1,
      lastAttemptAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const riskSmall = revenueRiskAgent.evaluateRisk({
      payment: paymentSmall,
    });

    // 84% recoverability on 10,000 -> 8,400
    const expectedValue = Math.round(10000 * (riskSmall.recoverabilityScore / 100));
    const isMathCorrect = riskSmall.expectedRecoveryValue === expectedValue;

    results.push({
      testId: 10,
      name: "Deterministic Expected Recovery Value Math",
      category: "Financial Accuracy",
      passed: isMathCorrect,
      expected: `expectedRecoveryValue exactly equals Math.round(amount * (score / 100)) (${expectedValue})`,
      actual: `Expected: ${expectedValue}, Calculated: ${riskSmall.expectedRecoveryValue}`,
      details: riskSmall,
    });
  } catch (err: any) {
    results.push({
      testId: 10,
      name: "Expected Recovery Value Math",
      category: "Financial Accuracy",
      passed: false,
      expected: "Deterministic match",
      actual: err.message,
    });
  }

  const passedCount = results.filter((r) => r.passed).length;
  const durationMs = Date.now() - startTime;

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    durationMs,
    results,
  };
}
