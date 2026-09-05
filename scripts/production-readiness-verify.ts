import crypto from "crypto";
import { recoverabilityClient } from "../src/lib/ml/recoverability-client";
import { langGraphOrchestrator } from "../backend/src/services/langgraph-orchestrator.service";
import { prisma } from "../backend/src/config/prisma";
import { demoService } from "../backend/src/services/demo.service";
import { policyService } from "../backend/src/services/policy.service";
import { webhookService } from "../backend/src/services/webhook.service";
import { config } from "../backend/src/config";
import { RecoveryCaseStatus } from "@prisma/client";

interface TestReport {
  name: string;
  passed: boolean;
  details: string;
}

const reports: TestReport[] = [];

function record(name: string, passed: boolean, details: string) {
  reports.push({ name, passed, details });
  const icon = passed ? "✓ PASS" : "✗ FAIL";
  console.log(`[${icon}] ${name}: ${details}`);
}

async function runProductionReadinessSuite() {
  console.log("================================================================================");
  console.log("VIREON — COMPREHENSIVE PRODUCTION-READINESS VERIFICATION SUITE");
  console.log("================================================================================\n");

  // Ensure baseline demo portfolio
  await demoService.ensureDemoPortfolio();

  // -------------------------------------------------------------------------
  // 1. PHASE 8: SUPERVISED ML SERVICE VERIFICATION
  // -------------------------------------------------------------------------
  console.log("\n--- [Phase 8: Supervised ML Service Verification] ---");
  try {
    const rawRes = await fetch("http://localhost:9000/health");
    const healthJson = await rawRes.json();
    const healthOk =
      healthJson.status === "healthy" &&
      healthJson.modelLoaded === true &&
      healthJson.modelVersion === "v1" &&
      healthJson.algorithm === "LogisticRegression";
    record(
      "ML Service /health",
      healthOk,
      `Status: ${healthJson.status}, Loaded: ${healthJson.modelLoaded}, Version: ${healthJson.modelVersion}, Algo: ${healthJson.algorithm}`
    );

    const clientHealth = await recoverabilityClient.checkHealth();
    record("RecoverabilityClient Connectivity", clientHealth.healthy === true, `Client healthy: ${clientHealth.healthy}`);

    const mlPred = await recoverabilityClient.predict({
      amountAtRiskPaise: 6750000n,
      customerLTVPaise: 27000000n,
      failureType: "INSUFFICIENT_FUNDS",
      retryCount: 0,
      daysOverdue: 0,
      previousSuccessfulPayments: 21,
      previousRecoveryAttempts: 0,
      paymentMethod: "CARD",
      customerTenureDays: 6,
    });

    const predOk =
      typeof mlPred.probability === "number" &&
      mlPred.probability >= 0.0 &&
      mlPred.probability <= 1.0 &&
      typeof mlPred.recoverabilityScore === "number" &&
      mlPred.recoverabilityScore >= 0.0 &&
      mlPred.recoverabilityScore <= 100.0 &&
      ["HIGH", "MEDIUM", "LOW"].includes(mlPred.priority) &&
      mlPred.modelVersion === "v1";

    record(
      "ML Service /predict Bounded Output",
      predOk,
      `Prob: ${mlPred.probability}, Score: ${mlPred.recoverabilityScore}, Priority: ${mlPred.priority}, Model: ${mlPred.modelVersion}`
    );
  } catch (err: any) {
    record("ML Service Verification", false, `Exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 2. PHASE 4: FULL END-TO-END RECOVERY (REC-DEMO-005: ₹67,500 AUTO-APPROVAL)
  // -------------------------------------------------------------------------
  console.log("\n--- [Phase 4: Auto-Approval End-to-End Recovery (REC-DEMO-005)] ---");
  try {
    const c5 = await prisma.recoveryCase.findUnique({
      where: { caseNumber: "REC-DEMO-005" },
      include: { customer: true, payment: true },
    });
    if (!c5) throw new Error("REC-DEMO-005 not found in database");

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

    // Run LangGraph workflow: should auto-approve (< ₹1,00,000 threshold)
    const runResult = await langGraphOrchestrator.runRecoveryWorkflow(c5.id);
    const autoApproved =
      runResult.requiresHumanApproval === false &&
      runResult.isInterrupted === false &&
      runResult.status === RecoveryCaseStatus.AWAITING_PAYMENT;

    record(
      "Autonomous Policy Approval (< ₹1,00,000)",
      autoApproved,
      `Amount: ₹67,500, RequiresApproval: ${runResult.requiresHumanApproval}, Status: ${runResult.status}`
    );

    const c5DbAfterRun = await prisma.recoveryCase.findUnique({ where: { id: c5.id } });
    const linkGenerated =
      Boolean(c5DbAfterRun?.paymentLinkUrl) &&
      Boolean(c5DbAfterRun?.razorpayPaymentLinkId);

    record(
      "Razorpay Payment Link Generation",
      linkGenerated,
      `LinkId: ${c5DbAfterRun?.razorpayPaymentLinkId}, Url: ${c5DbAfterRun?.paymentLinkUrl}`
    );

    // Signature-Verified Settlement: Simulate Razorpay payment.captured webhook with HMAC-SHA256
    const webhookPayload = {
      entity: "event",
      account_id: "acc_demo_vireon_001",
      event: "payment_link.paid",
      contains: ["payment_link", "payment"],
      payload: {
        payment_link: {
          entity: {
            id: c5DbAfterRun?.razorpayPaymentLinkId || "plink_demo_005",
            amount: 6750000,
            amount_paid: 6750000,
            status: "paid",
            notes: { caseId: c5.id },
          },
        },
        payment: {
          entity: {
            id: `pay_live_test_${Date.now()}`,
            amount: 6750000,
            currency: "INR",
            status: "captured",
            order_id: null,
            invoice_id: null,
            international: false,
            method: "card",
            amount_refunded: 0,
            refund_status: null,
            captured: true,
            description: "VIREON Recovery for Case #REC-DEMO-005",
            notes: { caseId: c5.id },
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const rawBody = JSON.stringify(webhookPayload);
    const secret = config.razorpay.webhookSecret;
    const signature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

    const webhookResult = await webhookService.handleWebhook(rawBody, signature);
    const c5Settled = await prisma.recoveryCase.findUnique({ where: { id: c5.id } });

    const settledOk =
      webhookResult.received === true &&
      (webhookResult as any).revenueRecovered === true &&
      c5Settled?.status === RecoveryCaseStatus.RECOVERED &&
      c5Settled?.recoveredAmount === 6750000n &&
      c5Settled?.recoveredAt !== null;

    record(
      "HMAC-SHA256 Webhook Settlement & State Transition to RECOVERED",
      settledOk,
      `Status: ${c5Settled?.status}, RecoveredAmount: ₹${Number(c5Settled?.recoveredAmount || 0n) / 100}`
    );
  } catch (err: any) {
    record("Phase 4 Verification", false, `Exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 3. PHASE 5: HIGH-VALUE APPROVAL INTERRUPT & RESUME (REC-DEMO-004: ₹2,75,000)
  // -------------------------------------------------------------------------
  console.log("\n--- [Phase 5: High-Value Approval Interrupt & Resume (REC-DEMO-004)] ---");
  try {
    const c4 = await prisma.recoveryCase.findUnique({
      where: { caseNumber: "REC-DEMO-004" },
    });
    if (!c4) throw new Error("REC-DEMO-004 not found");

    // Reset c4 to NEW
    await prisma.recoveryCase.update({
      where: { id: c4.id },
      data: {
        status: RecoveryCaseStatus.NEW,
        requiresHumanApproval: false,
        paymentLinkUrl: null,
        razorpayPaymentLinkId: null,
        recoveredAmount: 0n,
        retryCount: 0,
      },
    });

    const c4Run = await langGraphOrchestrator.runRecoveryWorkflow(c4.id);
    const paused =
      c4Run.isInterrupted === true &&
      c4Run.requiresHumanApproval === true &&
      c4Run.status === RecoveryCaseStatus.AWAITING_APPROVAL;

    record(
      "High-Value Policy Interrupt (₹2,75,000 >= ₹1,00,000)",
      paused,
      `isInterrupted: ${c4Run.isInterrupted}, Status: ${c4Run.status}, ApprovalRequired: ${c4Run.requiresHumanApproval}`
    );

    // Verify PostgreSQL checkpoint
    const checkpoints: any[] = await prisma.$queryRawUnsafe(
      "SELECT thread_id, checkpoint_id, created_at FROM langgraph_checkpoints WHERE thread_id = $1 ORDER BY created_at DESC LIMIT 1",
      c4.id
    );
    const checkpointOk = checkpoints.length > 0 && checkpoints[0].thread_id === c4.id;

    record(
      "LangGraph State Checkpointed in PostgreSQL",
      checkpointOk,
      `Thread: ${checkpoints[0]?.thread_id}, CheckpointId: ${checkpoints[0]?.checkpoint_id}`
    );

    // Verify no payment link created during interrupt
    const c4Mid = await prisma.recoveryCase.findUnique({ where: { id: c4.id } });
    record(
      "Zero Pre-Approval Action Dispatch",
      c4Mid?.paymentLinkUrl === null,
      `paymentLinkUrl is null during approval wait`
    );

    // Resume with Operator Approval
    const c4Resume = await langGraphOrchestrator.resumeWorkflow(c4.id, {
      approved: true,
      operator: "Chief Risk Officer",
      reason: "High-value enterprise authorization granted",
    });

    const c4DbAfterResume = await prisma.recoveryCase.findUnique({ where: { id: c4.id } });
    const resumedOk =
      c4Resume.resumed === true &&
      c4DbAfterResume?.status === RecoveryCaseStatus.AWAITING_PAYMENT &&
      Boolean(c4DbAfterResume?.paymentLinkUrl);

    record(
      "Operator Approval Resumption & Link Creation",
      resumedOk,
      `Status: ${c4DbAfterResume?.status}, LinkUrl: ${c4DbAfterResume?.paymentLinkUrl}`
    );
  } catch (err: any) {
    record("Phase 5 Verification", false, `Exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 4. PHASE 6: HIGH-VALUE REJECTION & ZERO-EXECUTION (REC-DEMO-008: ₹8,40,000)
  // -------------------------------------------------------------------------
  console.log("\n--- [Phase 6: High-Value Rejection & Zero Execution (REC-DEMO-008)] ---");
  try {
    const c8 = await prisma.recoveryCase.findUnique({
      where: { caseNumber: "REC-DEMO-008" },
    });
    if (!c8) throw new Error("REC-DEMO-008 not found");

    // Reset c8 to NEW
    await prisma.recoveryCase.update({
      where: { id: c8.id },
      data: {
        status: RecoveryCaseStatus.NEW,
        requiresHumanApproval: false,
        paymentLinkUrl: null,
        razorpayPaymentLinkId: null,
        recoveredAmount: 0n,
        retryCount: 0,
      },
    });

    const c8Run = await langGraphOrchestrator.runRecoveryWorkflow(c8.id);
    record(
      "High-Value Case Pause (₹8,40,000)",
      c8Run.isInterrupted === true && c8Run.requiresHumanApproval === true,
      `Status: ${c8Run.status}`
    );

    // Operator Rejects Recovery
    const c8Reject = await langGraphOrchestrator.resumeWorkflow(c8.id, {
      approved: false,
      operator: "Chief Financial Officer",
      reason: "Customer under formal restructuring / litigation",
    });

    const c8AfterReject = await prisma.recoveryCase.findUnique({ where: { id: c8.id } });
    const rejectOk =
      c8Reject.resumed === true &&
      c8AfterReject?.status === RecoveryCaseStatus.STOPPED &&
      c8AfterReject?.paymentLinkUrl === null &&
      c8AfterReject?.razorpayPaymentLinkId === null;

    record(
      "Operator Rejection -> STOPPED with ZERO Action Execution",
      rejectOk,
      `Status: ${c8AfterReject?.status}, PaymentLink: ${c8AfterReject?.paymentLinkUrl || "NONE"}`
    );
  } catch (err: any) {
    record("Phase 6 Verification", false, `Exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 5. PHASE 7: RETRY BOUNDS & POLICY GUARD
  // -------------------------------------------------------------------------
  console.log("\n--- [Phase 7: Retry Limit & Frequency Bounded Guard] ---");
  try {
    const r0 = policyService.evaluatePolicy({
      caseId: "probe_r0",
      amountAtRisk: 5000000n,
      action: "PAYMENT_RETRY",
      recoveryAttemptsCount: 0,
      customerContactCount: 0,
    });
    const r1 = policyService.evaluatePolicy({
      caseId: "probe_r1",
      amountAtRisk: 5000000n,
      action: "PAYMENT_RETRY",
      recoveryAttemptsCount: 1,
      customerContactCount: 0,
    });
    const r2 = policyService.evaluatePolicy({
      caseId: "probe_r2",
      amountAtRisk: 5000000n,
      action: "PAYMENT_RETRY",
      recoveryAttemptsCount: 2,
      customerContactCount: 0,
    });
    const r3 = policyService.evaluatePolicy({
      caseId: "probe_r3",
      amountAtRisk: 5000000n,
      action: "PAYMENT_RETRY",
      recoveryAttemptsCount: 3,
      customerContactCount: 0,
    });

    const boundsOk =
      r0.allowed === true &&
      r1.allowed === true &&
      r2.allowed === true &&
      r3.allowed === false &&
      r3.policyCode === "POLICY_RETRY_LIMIT_REACHED";

    record(
      "Retry Count Policy Guard (0-2 Allowed, 3 Blocked)",
      boundsOk,
      `r0: ${r0.allowed}, r1: ${r1.allowed}, r2: ${r2.allowed}, r3: ${r3.allowed} (${r3.policyCode})`
    );
  } catch (err: any) {
    record("Phase 7 Verification", false, `Exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // 6. PRISTINE DEMO PORTFOLIO RESET
  // -------------------------------------------------------------------------
  console.log("\n--- [Pristine Demo Portfolio Reset] ---");
  try {
    await demoService.ensureDemoPortfolio();
    const allCases = await prisma.recoveryCase.findMany({
      orderBy: { caseNumber: "asc" },
      select: {
        id: true,
        caseNumber: true,
        status: true,
        amountAtRisk: true,
        requiresHumanApproval: true,
      },
    });

    const countOk = allCases.length === 8;
    const allPresent = [
      "REC-DEMO-001",
      "REC-DEMO-002",
      "REC-DEMO-003",
      "REC-DEMO-004",
      "REC-DEMO-005",
      "REC-DEMO-006",
      "REC-DEMO-007",
      "REC-DEMO-008",
    ].every((num) => allCases.some((c) => c.caseNumber === num));

    record(
      "Pristine Demo Portfolio Reset (8 Canonical Cases)",
      countOk && allPresent,
      `Found ${allCases.length} canonical cases. Cases: ${allCases.map((c) => `${c.caseNumber} (${c.status})`).join(", ")}`
    );
  } catch (err: any) {
    record("Demo Portfolio Reset", false, `Exception: ${err.message}`);
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("FINAL PRODUCTION-READINESS VERIFICATION SUMMARY");
  console.log("================================================================================");

  const allPassed = reports.every((r) => r.passed);
  const total = reports.length;
  const passedCount = reports.filter((r) => r.passed).length;

  console.log(`Results: ${passedCount}/${total} Passed (${Math.round((passedCount / total) * 100)}%)`);

  if (!allPassed) {
    console.error("FAILURES DETECTED in production-readiness suite!");
    process.exit(1);
  } else {
    console.log("ALL PRODUCTION-READINESS CRITERIA VERIFIED SUCCESSFULLY ✓");
  }
}

runProductionReadinessSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[Fatal Suite Failure]:", err);
    process.exit(1);
  });
