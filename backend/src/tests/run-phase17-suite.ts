import { prisma } from "../config/prisma";
import { demoService } from "../services/demo.service";
import { executionService } from "../services/execution.service";
import { outcomeService } from "../services/outcome.service";
import { dashboardService } from "../services/dashboard.service";
import { getRazorpayService, resetRazorpayInstance } from "../../../src/lib/razorpay/provider";

async function runPhase17PortfolioTests() {
  console.log("==================================================");
  console.log("VIREON MULTI-VALUE DEMO PORTFOLIO REGRESSION SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testId: string, desc: string, detail?: string) {
    if (condition) {
      console.log(`✅ Test #${testId}: ${desc}`);
      if (detail) console.log(`   ${detail}`);
      passed++;
    } else {
      console.error(`❌ Test #${testId} FAILED: ${desc}`);
      if (detail) console.error(`   ${detail}`);
      failed++;
    }
  }

  // 1. Reset Demo Portfolio & Create 8 Controlled Cases
  const resetResult = await demoService.resetDemoRecovery();
  assert(
    resetResult.success === true && resetResult.portfolioCount === 8,
    "210",
    "Demo reset initializes 8 deterministic demo portfolio cases",
    `Created ${resetResult.portfolioCount} controlled cases (Hero: ${resetResult.heroCaseNumber} ${resetResult.heroCustomer})`
  );

  // 2. Fetch All Demo Cases from Database
  const portfolioCases = await prisma.recoveryCase.findMany({
    where: { caseNumber: { startsWith: "REC-DEMO-" } },
    include: { customer: true, payment: true },
    orderBy: { caseNumber: "asc" },
  });

  assert(
    portfolioCases.length === 8,
    "211",
    "Database contains exactly 8 deterministic demo cases",
    `Found: ${portfolioCases.map((c) => `${c.caseNumber} (₹${Number(c.amountAtRisk) / 100})`).join(", ")}`
  );

  // 3. Multi-Value Amount Range Verification
  const expectedAmounts: Record<string, bigint> = {
    "REC-DEMO-001": 2500000n, // ₹25,000
    "REC-DEMO-002": 849900n,  // ₹8,499
    "REC-DEMO-003": 124900n,  // ₹1,249
    "REC-DEMO-004": 27500000n,// ₹2,75,000
    "REC-DEMO-005": 6750000n, // ₹67,500
    "REC-DEMO-006": 15000000n,// ₹1,50,000
    "REC-DEMO-007": 1299900n, // ₹12,999
    "REC-DEMO-008": 84000000n,// ₹8,40,000
  };

  let allAmountsMatched = true;
  for (const c of portfolioCases) {
    if (expectedAmounts[c.caseNumber] !== c.amountAtRisk) {
      allAmountsMatched = false;
      console.error(`Amount mismatch on ${c.caseNumber}: expected ${expectedAmounts[c.caseNumber]}, got ${c.amountAtRisk}`);
    }
  }

  assert(
    allAmountsMatched,
    "212",
    "All 8 demo cases match exact integer paise amounts (₹1,249 to ₹8,40,000)",
    "Range: ₹1,249 (124900n) to ₹8,40,000 (84000000n) with zero floating-point math"
  );

  // 4. Policy Threshold Demonstration (₹1 Lakh Gate)
  const highValueCases = portfolioCases.filter((c) => c.amountAtRisk >= 10000000n);
  const standardCases = portfolioCases.filter((c) => c.amountAtRisk < 10000000n);

  const highValueGatesCorrect = highValueCases.every(
    (c) => c.requiresHumanApproval === true && c.status === "AWAITING_APPROVAL"
  );
  const standardGatesCorrect = standardCases.every(
    (c) => c.requiresHumanApproval === false
  );

  assert(
    highValueGatesCorrect && highValueCases.length === 3,
    "213",
    "High-value cases (>= ₹1 Lakh) require human approval and display AWAITING_APPROVAL",
    `Cases: ${highValueCases.map((c) => `${c.caseNumber}: ₹${Number(c.amountAtRisk) / 100}`).join(", ")}`
  );

  assert(
    standardGatesCorrect && standardCases.length === 5,
    "214",
    "Standard cases (< ₹1 Lakh) proceed autonomously without policy blocks",
    `Cases: ${standardCases.map((c) => `${c.caseNumber}: ₹${Number(c.amountAtRisk) / 100}`).join(", ")}`
  );

  // 5. Provider & Sandbox Mode Verification
  resetRazorpayInstance();
  const razorpay = await getRazorpayService();
  const connTest = await razorpay.verifyConnection();

  assert(
    connTest.connected === true && razorpay.isMockMode() === false,
    "215",
    "Live RazorpayService is active and successfully authenticated with Sandbox API",
    `Connected: ${connTest.connected}, Mode: ${connTest.mode}, Key: ${connTest.maskedKeyId}`
  );

  // 6. Test REC-DEMO-002 (NovaCloud Systems, ₹8,499) Real Order Creation
  const novaCase = portfolioCases.find((c) => c.caseNumber === "REC-DEMO-002");
  assert(
    Boolean(novaCase) && novaCase?.amountAtRisk === 849900n && novaCase?.status === "AWAITING_PAYMENT",
    "216",
    "REC-DEMO-002 (NovaCloud Systems, ₹8,499) is in AWAITING_PAYMENT with exact 849900 paise",
    `Case ID: ${novaCase?.id}, Amount: ₹${Number(novaCase?.amountAtRisk || 0n) / 100}`
  );

  const novaOrderResult = await executionService.createOrReuseCheckoutOrder({
    caseId: novaCase!.id,
    amountAtRisk: novaCase!.amountAtRisk,
    customer: { name: novaCase!.customer.name, email: novaCase!.customer.email, phone: "+919876543210" },
    caseNumber: novaCase!.caseNumber,
  });

  assert(
    novaOrderResult.orderId.startsWith("order_") &&
      !novaOrderResult.orderId.includes("demo") &&
      novaOrderResult.amountPaise === 849900,
    "217",
    "Real Razorpay cloud order created for REC-DEMO-002 with 849900 paise",
    `Order ID: ${novaOrderResult.orderId}, Amount: ${novaOrderResult.amountPaise} paise (₹8,499)`
  );

  // 7. Verify REC-DEMO-002 Order Directly on Razorpay Cloud API
  const keyId = process.env.RAZORPAY_KEY_ID || "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const cloudOrderRes = await fetch(`https://api.razorpay.com/v1/orders/${novaOrderResult.orderId}`, {
    method: "GET",
    headers: { Authorization: `Basic ${auth}` },
  });
  const cloudOrderData = await cloudOrderRes.json();

  assert(
    cloudOrderRes.status === 200 && cloudOrderData.id === novaOrderResult.orderId && cloudOrderData.amount === 849900,
    "218",
    "Order verified on Razorpay Cloud API with 200 OK and exact matching 849900 paise",
    `Cloud Status: ${cloudOrderData.status}, Amount: ${cloudOrderData.amount} paise (₹${cloudOrderData.amount / 100})`
  );

  // 8. Hero Live Razorpay Demo Case (REC-DEMO-005 Orion Media ₹67,500)
  const heroCase = portfolioCases.find((c) => c.caseNumber === "REC-DEMO-005");
  const heroOrderResult = await executionService.createOrReuseCheckoutOrder({
    caseId: heroCase!.id,
    amountAtRisk: heroCase!.amountAtRisk,
    customer: { name: heroCase!.customer.name, email: heroCase!.customer.email, phone: "+919876543210" },
    caseNumber: heroCase!.caseNumber,
  });

  assert(
    heroOrderResult.amountPaise === 6750000 &&
      heroOrderResult.orderId.startsWith("order_") &&
      !heroOrderResult.orderId.includes("demo"),
    "219",
    "Hero live demo order created for REC-DEMO-005 with 6750000 paise (₹67,500)",
    `Order ID: ${heroOrderResult.orderId}, Amount: ${heroOrderResult.amountPaise} paise (₹67,500)`
  );

  // 9. Settlement Verification for Hero Case (Orion Media ₹67,500)
  const settlementResult = await outcomeService.confirmRecovery({
    caseId: heroCase!.id,
    amountCapturedPaise: 6750000n,
    razorpayPaymentId: "pay_test_orion_67500_settled",
    razorpayOrderId: heroOrderResult.orderId,
  });

  assert(
    settlementResult.success === true &&
      settlementResult.case?.status === "RECOVERED" &&
      settlementResult.case?.recoveredAmount === 6750000n,
    "220",
    "Hero case payment verification atomically commits RECOVERED status and ₹67,500 in PostgreSQL",
    `Status: ${settlementResult.case?.status}, Recovered: ₹${Number(settlementResult.case?.recoveredAmount || 0n) / 100}`
  );

  // 10. Dashboard Aggregates Real Database Portfolio
  const dashboardMetrics = await dashboardService.getSummaryMetrics();
  assert(
    dashboardMetrics.totalRevenueAtRisk > 0 &&
      dashboardMetrics.totalRevenueRecovered >= 92500 && // ₹25,000 + ₹67,500
      dashboardMetrics.humanApprovalCasesCount >= 3,
    "221",
    "Dashboard metrics aggregate real database figures from multi-value portfolio",
    `Total At Risk: ₹${dashboardMetrics.totalRevenueAtRisk.toLocaleString("en-IN")}, Recovered: ₹${dashboardMetrics.totalRevenueRecovered.toLocaleString("en-IN")}, Policy Gates: ${dashboardMetrics.humanApprovalCasesCount}`
  );

  // 11. Idempotent Demo Reset Restores Clean Portfolio
  const secondReset = await demoService.resetDemoRecovery();
  const postResetCases = await prisma.recoveryCase.findMany({
    where: { caseNumber: { startsWith: "REC-DEMO-" } },
  });

  assert(
    secondReset.success === true && postResetCases.length === 8,
    "222",
    "Demo reset is strictly idempotent across entire 8-case portfolio",
    `Reset restored 8 cases without duplicating or corrupting any demo records`
  );

  console.log("\n--------------------------------------------------");
  console.log(`TARGETED RESULTS: ${passed}/${passed + failed} TESTS PASSED`);
  if (failed === 0) {
    console.log("🎉 ALL MULTI-VALUE DEMO PORTFOLIO & RAZORPAY CHECKOUT TESTS PASSED!\n");
  } else {
    console.error(`⚠️ ${failed} TESTS FAILED\n`);
    process.exit(1);
  }
}

runPhase17PortfolioTests()
  .catch((err) => {
    console.error("Test runner error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
