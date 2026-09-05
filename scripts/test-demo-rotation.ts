import { prisma } from "../backend/src/config/prisma";
import { demoService } from "../backend/src/services/demo.service";
import { executionService } from "../backend/src/services/execution.service";
import { outcomeService } from "../backend/src/services/outcome.service";
import { RecoveryCaseStatus } from "@prisma/client";

async function testDemoRotationLifecycle() {
  console.log("\n=======================================================");
  console.log("TESTING VIREON DEMO PORTFOLIO LIFECYCLE ROTATION");
  console.log("=======================================================\n");

  // 1. Initial State Inspection & Seed
  await demoService.ensureDemoPortfolio();
  console.log("1. Ensured 8-case canonical portfolio exists.");

  // 2. Rotate all existing expired demo cases
  console.log("2. Running rotateDemoPortfolioLifecycle(force: true)...");
  const rotateResult = await demoService.rotateDemoPortfolioLifecycle({ force: true });
  console.log("   Rotation Result:", rotateResult);

  // 3. Verify all 8 cases match their canonical baseline states
  const cases = await prisma.recoveryCase.findMany({
    where: { caseNumber: { startsWith: "REC-DEMO-" } },
    orderBy: { caseNumber: "asc" },
    include: { customer: true },
  });

  console.log(`\n3. Verifying all ${cases.length} cases after baseline rotation:`);
  for (const c of cases) {
    console.log(
      `   [${c.caseNumber}] ${c.customer.name.padEnd(30)} | ₹${(Number(c.amountAtRisk) / 100).toLocaleString("en-IN").padStart(8)} | Status: ${c.status.padEnd(17)} | HumanGate: ${c.requiresHumanApproval ? "YES" : "NO "}`
    );

    // Validate transient fields are cleared
    if (c.recoveredAmount !== 0n) throw new Error(`${c.caseNumber} has non-zero recoveredAmount!`);
    if (c.recoveredAt !== null) throw new Error(`${c.caseNumber} has non-null recoveredAt!`);
    if (c.razorpayOrderId !== null) throw new Error(`${c.caseNumber} has non-null razorpayOrderId!`);
    if (c.razorpayPaymentId !== null) throw new Error(`${c.caseNumber} has non-null razorpayPaymentId!`);

    // Validate policy gates preserved
    if (c.amountAtRisk >= 10000000n) {
      if (!c.requiresHumanApproval || c.status !== RecoveryCaseStatus.AWAITING_APPROVAL) {
        throw new Error(`${c.caseNumber} >= ₹1L must require human approval and be in AWAITING_APPROVAL!`);
      }
    }
  }

  // 4. Test Active Hero Case Selection
  console.log("\n4. Testing getActiveDemoRecoveryCase()...");
  const activeCase = await demoService.getActiveDemoRecoveryCase();
  console.log(`   Active Case: ${activeCase.caseNumber} (${activeCase.customer.name}, Status: ${activeCase.status})`);
  if (activeCase.caseNumber !== "REC-DEMO-005") {
    throw new Error(`Expected active case to be REC-DEMO-005 when actionable, got ${activeCase.caseNumber}`);
  }

  // 5. Simulate Recovery of REC-DEMO-005 (Hero Case ₹67,500)
  console.log("\n5. Simulating Recovery of REC-DEMO-005 with fresh Razorpay Order...");
  const orderResult = await executionService.createOrReuseCheckoutOrder({
    caseId: activeCase.id,
    amountAtRisk: activeCase.amountAtRisk,
    customer: {
      name: activeCase.customer.name,
      email: activeCase.customer.email,
      phone: "+919876543210",
    },
    caseNumber: activeCase.caseNumber,
  });
  console.log(`   Created Real Razorpay Test Order: ${orderResult.orderId} (₹${orderResult.amountPaise / 100})`);

  // Confirm recovery via outcome service
  const confirmResult = await outcomeService.confirmRecovery({
    caseId: activeCase.id,
    amountCapturedPaise: activeCase.amountAtRisk,
    razorpayPaymentId: `pay_test_${Date.now()}`,
    razorpayOrderId: orderResult.orderId,
  });
  console.log(`   Outcome Service Confirmed Recovery: status = ${confirmResult.case?.status}`);

  // 6. Test Retention Window (Cooldown)
  console.log("\n6. Testing Retention Window (Cooldown preservation)...");
  const rotationDuringCooldown = await demoService.rotateDemoPortfolioLifecycle();
  console.log("   Rotation check during active retention window:", rotationDuringCooldown);

  const heroDuringCooldown = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-005" },
  });
  console.log(`   REC-DEMO-005 status during cooldown: ${heroDuringCooldown?.status} (Expected: RECOVERED)`);
  if (heroDuringCooldown?.status !== RecoveryCaseStatus.RECOVERED) {
    throw new Error("Case should remain RECOVERED during retention cooldown!");
  }

  // 7. Test Active Case Rotation during REC-DEMO-005 Cooldown
  console.log("\n7. Testing Active Case Rotation during REC-DEMO-005 Cooldown...");
  const nextActiveCase = await demoService.getActiveDemoRecoveryCase();
  console.log(`   Next Active Demo Case: ${nextActiveCase.caseNumber} (${nextActiveCase.customer.name}, Status: ${nextActiveCase.status})`);
  if (nextActiveCase.caseNumber === "REC-DEMO-005") {
    throw new Error("Active case should rotate to another actionable case while REC-DEMO-005 is RECOVERED!");
  }

  // 8. Test Expiration of Cooldown and Automatic Reset
  console.log("\n8. Testing Cooldown Expiration and Automatic Reset...");
  // Artificially backdate recoveredAt to simulate 4 minutes elapsed (cooldown = 3 mins)
  await prisma.recoveryCase.update({
    where: { caseNumber: "REC-DEMO-005" },
    data: {
      recoveredAt: new Date(Date.now() - 240 * 1000), // 4 minutes ago
    },
  });

  const rotationAfterCooldown = await demoService.rotateDemoPortfolioLifecycle();
  console.log("   Rotation after cooldown expiration:", rotationAfterCooldown);

  const heroAfterReset = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-005" },
  });
  console.log(`   REC-DEMO-005 status after cooldown expired: ${heroAfterReset?.status} (Expected: AWAITING_PAYMENT)`);
  console.log(`   razorpayOrderId cleared: ${heroAfterReset?.razorpayOrderId === null}`);
  console.log(`   recoveredAmount cleared: ${heroAfterReset?.recoveredAmount === 0n}`);

  if (heroAfterReset?.status !== RecoveryCaseStatus.AWAITING_PAYMENT) {
    throw new Error("REC-DEMO-005 should have rotated back to AWAITING_PAYMENT!");
  }
  if (heroAfterReset?.razorpayOrderId !== null) {
    throw new Error("razorpayOrderId should be null so a fresh Razorpay order can be created!");
  }

  // 9. Verify Fresh Razorpay Order can be created for REC-DEMO-005 after reset
  console.log("\n9. Verifying fresh Razorpay order creation on reset REC-DEMO-005...");
  const freshOrder = await executionService.createOrReuseCheckoutOrder({
    caseId: heroAfterReset.id,
    amountAtRisk: heroAfterReset.amountAtRisk,
    customer: {
      name: heroAfterReset.customerId,
      email: "finance@orionmedia.demo",
      phone: "+919876543210",
    },
    caseNumber: heroAfterReset.caseNumber,
  });
  console.log(`   Fresh Order ID created: ${freshOrder.orderId}`);
  if (freshOrder.orderId === orderResult.orderId) {
    throw new Error("Fresh order must NOT reuse the previously settled order ID!");
  }

  console.log("\n🎉 ALL DEMO ROTATION LIFECYCLE TESTS PASSED PERFECTLY!\n");
}

testDemoRotationLifecycle()
  .catch((err) => {
    console.error("Test failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
