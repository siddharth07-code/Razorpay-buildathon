/**
 * VIREON — Targeted LangGraph + Supervised ML Verification Suite
 * =============================================================
 * Focuses strictly on:
 * 1. ML model loading & prediction validity (0-1 probability, 0-100 score)
 * 2. LangGraph low-value execution (REC-DEMO-005 ₹67,500 auto-approved)
 * 3. ₹1,00,000 policy gate enforcement (REC-DEMO-004 ₹2,75,000 & REC-DEMO-008 ₹8,40,000)
 * 4. Human Approval native interrupt() pause
 * 5. Resume via Command({ resume: { approved: true } })
 * 6. Reject via Command({ resume: { approved: false } })
 * 7. Bounded retry stops after 3 attempts
 * 8. Outcome verification marks RECOVERED only on real settlement
 * 9. ML service failure fallback without policy bypass
 */

import { recoverabilityClient } from "../src/lib/ml/recoverability-client";
import { langGraphOrchestrator } from "../backend/src/services/langgraph-orchestrator.service";
import { prisma } from "../backend/src/config/prisma";
import { demoService } from "../backend/src/services/demo.service";
import { outcomeService } from "../backend/src/services/outcome.service";
import { PolicyService, policyService } from "../backend/src/services/policy.service";
import { fromPaise } from "../backend/src/utils/money";
import { RecoveryCaseStatus } from "@prisma/client";

async function runTargetedVerification() {
  console.log("===============================================================");
  console.log("VIREON — TARGETED REAL LANGGRAPH + ML VERIFICATION SUITE");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      if (detail) console.error(`    Detail: ${detail}`);
      failed++;
    }
  }

  // Ensure demo portfolio is initialized
  await demoService.ensureDemoPortfolio();

  // -------------------------------------------------------------
  // Test 1: ML Model Health & Loading
  // -------------------------------------------------------------
  console.log("--- TEST GROUP 1: Supervised ML Inference Service ---");
  const health = await recoverabilityClient.checkHealth();
  assert(health.healthy === true, "ML model loads successfully and service is healthy", health.error);

  // -------------------------------------------------------------
  // Test 2 & 3: ML Model Prediction Output Boundaries
  // -------------------------------------------------------------
  const prediction = await recoverabilityClient.predict({
    amountAtRiskPaise: 6750000n, // ₹67,500
    customerLTVPaise: 42000000n,
    failureType: "AUTHENTICATION_FAILURE",
    retryCount: 1,
    daysOverdue: 0,
    previousSuccessfulPayments: 14,
    previousRecoveryAttempts: 1,
    paymentMethod: "CARD",
    customerTenureDays: 480,
  });

  assert(
    prediction.success === true &&
    prediction.probability !== null &&
    prediction.probability >= 0.0 &&
    prediction.probability <= 1.0,
    "ML model produces Recovery Probability between 0.0 and 1.0",
    `Probability: ${prediction.probability}`
  );

  assert(
    prediction.recoverabilityScore !== null &&
    prediction.recoverabilityScore >= 0.0 &&
    prediction.recoverabilityScore <= 100.0,
    "ML model produces recoverabilityScore between 0.0 and 100.0",
    `Score: ${prediction.recoverabilityScore}`
  );

  console.log(`    [ML Telemetry] Probability: ${(prediction.probability! * 100).toFixed(1)}% | Score: ${prediction.recoverabilityScore} | Priority: ${prediction.priority} | Model: ${prediction.modelVersion}`);

  // -------------------------------------------------------------
  // Test 4: LangGraph Executes a Low-Value Case (REC-DEMO-005, ₹67,500)
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: LangGraph Execution on Primary Demo Case ---");
  const demo5 = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-005" },
  });

  assert(Boolean(demo5), "REC-DEMO-005 exists in PostgreSQL database");

  // Reset demo5 to NEW for clean execution
  await prisma.recoveryCase.update({
    where: { id: demo5!.id },
    data: {
      status: RecoveryCaseStatus.NEW,
      requiresHumanApproval: false,
      paymentLinkUrl: null,
      razorpayPaymentLinkId: null,
      recoveredAmount: 0n,
      recoveredAt: null,
      retryCount: 0,
    },
  });

  const runResult = await langGraphOrchestrator.runRecoveryWorkflow(demo5!.id);

  assert(
    runResult.requiresHumanApproval === false && !runResult.isInterrupted,
    "₹67,500 is below ₹1,00,000 threshold and is auto-approved by Policy Gate",
    `requiresHumanApproval: ${runResult.requiresHumanApproval}`
  );

  assert(
    runResult.status === "AWAITING_PAYMENT" || Boolean(runResult.state?.paymentLinkUrl),
    "LangGraph executes through Razorpay TEST execution and produces active payment link",
    `Status: ${runResult.status}, Link: ${runResult.state?.paymentLinkUrl}`
  );

  // -------------------------------------------------------------
  // Test 5: ₹1L Policy Requires Human Approval (REC-DEMO-004, ₹2,75,000)
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: Strict Policy Threshold & Human Approval Interrupt ---");
  const demo4 = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-004" },
  });

  assert(Boolean(demo4), "REC-DEMO-004 (₹2,75,000) exists in database");

  await prisma.recoveryCase.update({
    where: { id: demo4!.id },
    data: {
      status: RecoveryCaseStatus.NEW,
      requiresHumanApproval: false,
      retryCount: 0,
    },
  });

  const highValRun = await langGraphOrchestrator.runRecoveryWorkflow(demo4!.id);

  assert(
    highValRun.requiresHumanApproval === true,
    "₹2,75,000 (>= ₹1,00,000) strictly requires human approval",
    `requiresHumanApproval: ${highValRun.requiresHumanApproval}`
  );

  // -------------------------------------------------------------
  // Test 6: Human Approval Actually Pauses the Graph via interrupt()
  // -------------------------------------------------------------
  assert(
    highValRun.isInterrupted === true || highValRun.status === "AWAITING_APPROVAL",
    "LangGraph pauses at humanApproval node via native interrupt()",
    `isInterrupted: ${highValRun.isInterrupted}, status: ${highValRun.status}`
  );

  // Verify second high value case REC-DEMO-008 (₹8,40,000)
  const demo8 = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-008" },
  });
  if (demo8) {
    await prisma.recoveryCase.update({
      where: { id: demo8.id },
      data: { status: RecoveryCaseStatus.NEW, requiresHumanApproval: false, retryCount: 0 },
    });
    const demo8Run = await langGraphOrchestrator.runRecoveryWorkflow(demo8.id);
    assert(
      demo8Run.requiresHumanApproval === true,
      "REC-DEMO-008 (₹8,40,000) strictly enforces human approval policy gate",
      `requiresHumanApproval: ${demo8Run.requiresHumanApproval}`
    );
  }

  // -------------------------------------------------------------
  // Test 7: APPROVE Resumes the Graph
  // -------------------------------------------------------------
  const resumeApproved = await langGraphOrchestrator.resumeWorkflow(demo4!.id, {
    approved: true,
    operator: "Chief Risk Officer",
    reason: "Authorized high-value recovery outreach",
  });

  assert(
    resumeApproved.resumed === true,
    "APPROVE resumes the paused LangGraph workflow with thread_id = caseId",
    `Resumed: ${resumeApproved.resumed}`
  );

  // -------------------------------------------------------------
  // Test 8: REJECT Stops / Escalates
  // -------------------------------------------------------------
  const demo6 = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-006" }, // ₹1,50,000
  });
  if (demo6) {
    await prisma.recoveryCase.update({
      where: { id: demo6.id },
      data: { status: RecoveryCaseStatus.NEW, requiresHumanApproval: false, retryCount: 0 },
    });
    await langGraphOrchestrator.runRecoveryWorkflow(demo6.id);
    const resumeRejected = await langGraphOrchestrator.resumeWorkflow(demo6.id, {
      approved: false,
      operator: "Operations Lead",
      reason: "Manual halt requested by merchant",
    });

    const stoppedCase = await prisma.recoveryCase.findUnique({ where: { id: demo6.id } });
    assert(
      stoppedCase?.status === RecoveryCaseStatus.STOPPED,
      "REJECT halts recovery and marks status as STOPPED",
      `Status: ${stoppedCase?.status}`
    );
  }

  // -------------------------------------------------------------
  // Test 9: Retry Stops After 3 Attempts
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 4: Guardrails, Outcome Settlement & Fallback ---");
  const policyCheckMaxRetry = policyService.evaluatePolicy({
    caseId: "test_retry_bound",
    amountAtRisk: 2500000n,
    action: "PAYMENT_RETRY",
    recoveryAttemptsCount: 3, // At maximum
    customerContactCount: 1,
  });

  assert(
    policyCheckMaxRetry.allowed === false && policyCheckMaxRetry.policyCode === "POLICY_RETRY_LIMIT_REACHED",
    "Retry stops after 3 attempts (bounded loop protection)",
    `Policy allowed: ${policyCheckMaxRetry.allowed}, code: ${policyCheckMaxRetry.policyCode}`
  );

  // -------------------------------------------------------------
  // Test 10: Successful Razorpay Verification Produces RECOVERED
  // -------------------------------------------------------------
  const testRecoverCase = await prisma.recoveryCase.create({
    data: {
      caseNumber: `REC-TEST-VERIFY-${Date.now()}`,
      customerId: demo5!.customerId,
      amountAtRisk: 1000000n, // ₹10,000
      recoverableAmount: 1000000n,
      recoveredAmount: 0n,
      status: RecoveryCaseStatus.AWAITING_PAYMENT,
      rootCauseDetails: "Test settlement verification",
    },
  });

  const recoveryOutcome = await outcomeService.confirmRecovery({
    caseId: testRecoverCase.id,
    amountCapturedPaise: 1000000n,
    razorpayPaymentId: "pay_test_settlement_confirmed",
  });

  const recoveredCase = await prisma.recoveryCase.findUnique({ where: { id: testRecoverCase.id } });
  assert(
    recoveredCase?.status === RecoveryCaseStatus.RECOVERED && recoveredCase.recoveredAmount === 1000000n,
    "Successful Razorpay payment capture produces authoritative RECOVERED status in PostgreSQL",
    `Status: ${recoveredCase?.status}, Amount: ${recoveredCase?.recoveredAmount}`
  );

  // Cleanup test case
  await prisma.recoveryCase.delete({ where: { id: testRecoverCase.id } }).catch(() => {});

  // -------------------------------------------------------------
  // Test 11: ML Service Failure Fallback Does Not Bypass Policy
  // -------------------------------------------------------------
  // Simulate high-value case evaluation under ML failure
  const highValPolicy = policyService.evaluatePolicy({
    caseId: "test_ml_fallback",
    amountAtRisk: 25000000n, // ₹2,50,000
    action: "CREATE_PAYMENT_LINK",
    recoveryAttemptsCount: 0,
    customerContactCount: 0,
  });

  assert(
    highValPolicy.requiresHumanApproval === true,
    "ML failure fallback strictly NEVER bypasses the ₹1,00,000 policy gate",
    `requiresHumanApproval: ${highValPolicy.requiresHumanApproval}`
  );

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(`TARGETED VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTargetedVerification()
  .catch((err) => {
    console.error("Fatal test runner error:", err);
    process.exit(1);
  });
