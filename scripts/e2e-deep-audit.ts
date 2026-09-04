import { recoverabilityClient } from "../src/lib/ml/recoverability-client";
import { langGraphOrchestrator } from "../backend/src/services/langgraph-orchestrator.service";
import { prisma } from "../backend/src/config/prisma";
import { demoService } from "../backend/src/services/demo.service";
import { outcomeService } from "../backend/src/services/outcome.service";
import { policyService, PolicyService } from "../backend/src/services/policy.service";
import { diagnosisService } from "../backend/src/services/diagnosis.service";
import { strategyService } from "../backend/src/services/strategy.service";
import { fromPaise } from "../backend/src/utils/money";
import { RecoveryCaseStatus } from "@prisma/client";

async function runDeepAudit() {
  console.log("=== VIREON PHASE 2 DEEP AUDIT & END-TO-END VERIFICATION ===");

  await demoService.ensureDemoPortfolio();

  // 1. ML Service Health
  const health = await recoverabilityClient.checkHealth();
  console.log("\n[1. ML HEALTH]", JSON.stringify(health));

  // 2. ML Direct Predict
  const mlPredict = await recoverabilityClient.predict({
    amountAtRiskPaise: 6750000n,
    customerLTVPaise: 42000000n,
    failureType: "AUTHENTICATION_FAILURE",
    retryCount: 1,
    daysOverdue: 0,
    previousSuccessfulPayments: 14,
    previousRecoveryAttempts: 1,
    paymentMethod: "CARD",
    customerTenureDays: 480,
  });
  console.log("\n[2. ML PREDICT FOR REC-DEMO-005]", JSON.stringify(mlPredict));

  // 3. REC-DEMO-005 Execution
  const c5 = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-005" },
    include: { customer: true, payment: true },
  });
  if (!c5) throw new Error("REC-DEMO-005 not found");

  // Reset c5 to NEW
  await prisma.recoveryCase.update({
    where: { id: c5.id },
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

  console.log("\n[3. EXECUTING REC-DEMO-005]");
  const c5Result = await langGraphOrchestrator.runRecoveryWorkflow(c5.id);
  console.log("c5Result:", JSON.stringify(c5Result, null, 2));

  // 4. Inspect Diagnosis on REC-DEMO-005
  const diag = await diagnosisService.diagnose({
    errorCode: c5.payment?.errorCode || "BAD_REQUEST_AUTHENTICATION_TIMEOUT",
    errorDescription: "Authentication / 3DS challenge timeout during authorization",
    paymentMethod: "CARD",
    isSubscription: false,
    isInvoice: false,
    attempts: 0,
  });
  console.log("\n[4. DIAGNOSIS ON REC-DEMO-005]", JSON.stringify(diag));

  // 5. Inspect Strategy on REC-DEMO-005
  const strat = strategyService.selectStrategy({
    rootCause: diag.rootCause as any,
    amountAtRisk: c5.amountAtRisk,
    risk: {
      riskScore: 12,
      recoverabilityScore: 88,
      expectedRecoveryValue: c5.amountAtRisk,
      priority: "P1" as any,
      riskLevel: "LOW" as any,
      explanation: "Supervised ML prediction",
    },
    recoveryAttemptsCount: 0,
    customerContactCount: 0,
  });
  console.log("\n[5. STRATEGY ON REC-DEMO-005]", JSON.stringify(strat));

  // 6. Policy Check on 3 Cases
  const p5 = policyService.evaluatePolicy({
    caseId: c5.id,
    action: strat.action as any,
    amountAtRisk: 6750000n, // ₹67,500
    recoveryAttemptsCount: 0,
    customerContactCount: 0,
  });
  console.log("\n[6. POLICY REC-DEMO-005 (₹67,500)]", JSON.stringify(p5));

  const p4 = policyService.evaluatePolicy({
    caseId: "demo-4",
    action: "CREATE_PAYMENT_LINK" as any,
    amountAtRisk: 27500000n, // ₹2,75,000
    recoveryAttemptsCount: 0,
    customerContactCount: 0,
  });
  console.log("[6. POLICY REC-DEMO-004 (₹2,75,000)]", JSON.stringify(p4));

  const p8 = policyService.evaluatePolicy({
    caseId: "demo-8",
    action: "CREATE_PAYMENT_LINK" as any,
    amountAtRisk: 84000000n, // ₹8,40,000
    recoveryAttemptsCount: 0,
    customerContactCount: 0,
  });
  console.log("[6. POLICY REC-DEMO-008 (₹8,40,000)]", JSON.stringify(p8));

  // 7. REC-DEMO-004 Pauses via interrupt() & Checkpoint in PostgreSQL
  const c4 = await prisma.recoveryCase.findUnique({ where: { caseNumber: "REC-DEMO-004" } });
  if (!c4) throw new Error("REC-DEMO-004 not found");

  await prisma.recoveryCase.update({
    where: { id: c4.id },
    data: { status: RecoveryCaseStatus.NEW, requiresHumanApproval: false, retryCount: 0 },
  });

  console.log("\n[7. EXECUTING REC-DEMO-004 (HIGH-VALUE)]");
  const c4Run = await langGraphOrchestrator.runRecoveryWorkflow(c4.id);
  console.log("c4Run isInterrupted:", c4Run.isInterrupted, "requiresApproval:", c4Run.requiresHumanApproval, "status:", c4Run.status);

  // Check PostgreSQL checkpoint for c4.id
  const checkpoints: any[] = await prisma.$queryRawUnsafe(
    "SELECT thread_id, checkpoint_id, created_at FROM langgraph_checkpoints WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 3",
    c4.id
  );
  console.log("Checkpoints in PostgreSQL for REC-DEMO-004:", JSON.stringify(checkpoints));

  // 8. Resume REC-DEMO-004 with Approval
  console.log("\n[8. RESUMING REC-DEMO-004 WITH APPROVAL]");
  const c4Resume = await langGraphOrchestrator.resumeWorkflow(c4.id, {
    approved: true,
    operator: "Chief Risk Officer",
    reason: "Authorized high-value recovery outreach",
  });
  console.log("c4Resume:", JSON.stringify(c4Resume));

  // 9. REC-DEMO-008 Pauses & Rejection Stops Recovery
  const c8 = await prisma.recoveryCase.findUnique({ where: { caseNumber: "REC-DEMO-008" } });
  if (!c8) throw new Error("REC-DEMO-008 not found");

  await prisma.recoveryCase.update({
    where: { id: c8.id },
    data: { status: RecoveryCaseStatus.NEW, requiresHumanApproval: false, retryCount: 0 },
  });

  console.log("\n[9. EXECUTING REC-DEMO-008 (₹8,40,000) THEN REJECTING]");
  const c8Run = await langGraphOrchestrator.runRecoveryWorkflow(c8.id);
  console.log("c8Run status:", c8Run.status, "isInterrupted:", c8Run.isInterrupted);

  const c8Reject = await langGraphOrchestrator.resumeWorkflow(c8.id, {
    approved: false,
    operator: "Chief Financial Officer",
    reason: "Client in active insolvency proceeding",
  });
  console.log("c8Reject:", JSON.stringify(c8Reject));

  const c8AfterReject = await prisma.recoveryCase.findUnique({ where: { id: c8.id } });
  console.log("c8 status in DB after rejection:", c8AfterReject?.status, "(Payment Link:", c8AfterReject?.paymentLinkUrl, ")");

  // 10 & 11. Payment Outcome: RECOVERED only upon verification
  console.log("\n[10 & 11. VERIFYING SETTLEMENT / RECOVERED IN POSTGRESQL]");
  const testCase = await prisma.recoveryCase.create({
    data: {
      caseNumber: `REC-E2E-TEST-${Date.now()}`,
      customerId: c5.customerId,
      amountAtRisk: 5000000n, // ₹50,000
      recoverableAmount: 5000000n,
      recoveredAmount: 0n,
      status: RecoveryCaseStatus.AWAITING_PAYMENT,
      rootCauseDetails: "Settlement verification test",
    },
  });

  const settleResult = await outcomeService.confirmRecovery({
    caseId: testCase.id,
    amountCapturedPaise: 5000000n,
    razorpayPaymentId: "pay_test_live_verify_123",
  });

  const settledCase = await prisma.recoveryCase.findUnique({ where: { id: testCase.id } });
  console.log("Settled case in DB:", {
    id: settledCase?.id,
    status: settledCase?.status,
    recoveredAmount: settledCase?.recoveredAmount?.toString(),
    razorpayPaymentId: settledCase?.razorpayPaymentId,
  });

  await prisma.recoveryCase.delete({ where: { id: testCase.id } }).catch(() => {});

  // 12. Retry Limit
  console.log("\n[12. RETRY LIMIT BOUNDED GUARD]");
  const retryAt0 = policyService.evaluatePolicy({
    caseId: "test_retry",
    amountAtRisk: 1000000n,
    action: "PAYMENT_RETRY",
    recoveryAttemptsCount: 0,
    customerContactCount: 0,
  });
  const retryAt1 = policyService.evaluatePolicy({
    caseId: "test_retry",
    amountAtRisk: 1000000n,
    action: "PAYMENT_RETRY",
    recoveryAttemptsCount: 1,
    customerContactCount: 0,
  });
  const retryAt2 = policyService.evaluatePolicy({
    caseId: "test_retry",
    amountAtRisk: 1000000n,
    action: "PAYMENT_RETRY",
    recoveryAttemptsCount: 2,
    customerContactCount: 0,
  });
  const retryAt3 = policyService.evaluatePolicy({
    caseId: "test_retry",
    amountAtRisk: 1000000n,
    action: "PAYMENT_RETRY",
    recoveryAttemptsCount: 3,
    customerContactCount: 0,
  });
  console.log("Retry at 0 allowed:", retryAt0.allowed);
  console.log("Retry at 1 allowed:", retryAt1.allowed);
  console.log("Retry at 2 allowed:", retryAt2.allowed);
  console.log("Retry at 3 allowed:", retryAt3.allowed, "Code:", retryAt3.policyCode);

  console.log("\n=== DEEP AUDIT RUN COMPLETE ===");
}

runDeepAudit()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("Deep audit failure:", e);
    process.exit(1);
  });
