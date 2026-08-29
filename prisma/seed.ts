import { PrismaClient, CustomerTier, PaymentMethod, PaymentStatus, RecoveryCaseStatus, RecoveryRiskLevel, CasePriority, RootCauseType, RecoveryAction, RecoveryStep, AttemptStatus } from "@prisma/client";
import { toPaise } from "../backend/src/utils/money";

const prisma = new PrismaClient();

async function main() {
  console.log("[Seed] Starting RecoverAI Database Seed (DEMO / TEST DATA)...");

  // Clear existing records safely if any
  try {
    await prisma.notification.deleteMany();
    await prisma.humanApproval.deleteMany();
    await prisma.promiseToPay.deleteMany();
    await prisma.agentDecision.deleteMany();
    await prisma.auditEvent.deleteMany();
    await prisma.recoveryAttempt.deleteMany();
    await prisma.recoveryCase.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.order.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.razorpayEvent.deleteMany();
  } catch (err) {
    console.log("[Seed] Table wipe skipped or tables fresh.");
  }

  // 1. Create 50 Realistic Indian Enterprise / SME Customers
  const customerNames = [
    { name: "Aakash Verma", email: "finance@zenithedutech.in", phone: "+919876543210", company: "Zenith Edutech Pvt Ltd", tier: CustomerTier.ENTERPRISE, ltv: 1450000 },
    { name: "Priya Sharma", email: "priya@hyperlocalbazaar.in", phone: "+919823456789", company: "Hyperlocal Quick Commerce Ltd", tier: CustomerTier.GROWTH, ltv: 750000 },
    { name: "Rohit Sharma", email: "rohit@chaicrafters.in", phone: "+919765432109", company: "ChaiCrafters Retail Ventures", tier: CustomerTier.D2C, ltv: 85000 },
    { name: "Dr. Ananya Sen", email: "accounts@medivault.co", phone: "+919811223344", company: "MediVault Health Networks", tier: CustomerTier.ENTERPRISE, ltv: 2200000 },
    { name: "Vikram Malhotra", email: "vikram@finscale.io", phone: "+919833445566", company: "FinScale Cloud Infra Pvt Ltd", tier: CustomerTier.ENTERPRISE, ltv: 3100000 },
    { name: "Sneha Reddy", email: "sneha@agritechindia.com", phone: "+919844556677", company: "AgriTech Harvest Solutions", tier: CustomerTier.GROWTH, ltv: 450000 },
    { name: "Manish Joshi", email: "manish@logiway.in", phone: "+919855667788", company: "LogiWay Freight Systems", tier: CustomerTier.ENTERPRISE, ltv: 1800000 },
    { name: "Kavita Nair", email: "kavita@creativestudios.in", phone: "+919866778899", company: "Creative Studios Media", tier: CustomerTier.STARTER, ltv: 120000 },
    { name: "Arjun Das", email: "arjun@omnistore.in", phone: "+919877889900", company: "OmniStore Retail India", tier: CustomerTier.GROWTH, ltv: 620000 },
    { name: "Deepak Patel", email: "deepak@solarvolt.co.in", phone: "+919888990011", company: "SolarVolt Energy Pvt Ltd", tier: CustomerTier.ENTERPRISE, ltv: 2900000 },
  ];

  // Fill up to 50
  for (let i = 11; i <= 50; i++) {
    const tier = i % 4 === 0 ? CustomerTier.ENTERPRISE : i % 3 === 0 ? CustomerTier.GROWTH : i % 2 === 0 ? CustomerTier.STARTER : CustomerTier.D2C;
    customerNames.push({
      name: `Demo Customer ${i}`,
      email: `client_${i}@indiabusiness.demo`,
      phone: `+9198${(10000000 + i * 137).toString().substring(0, 8)}`,
      company: `Enterprise Solution Corp ${i}`,
      tier,
      ltv: (tier === CustomerTier.ENTERPRISE ? 1500000 : tier === CustomerTier.GROWTH ? 600000 : 150000) + i * 10000,
    });
  }

  const createdCustomers = [];
  for (const c of customerNames) {
    const cust = await prisma.customer.create({
      data: {
        name: c.name,
        email: c.email,
        phone: c.phone,
        companyName: c.company,
        tier: c.tier,
        lifetimeValue: toPaise(c.ltv),
        successfulPayments: Math.floor(Math.random() * 8) + 2,
        failedPayments: Math.floor(Math.random() * 2) + 1,
        recoveryAttempts: 1,
        recoveredAmount: toPaise(Math.floor(c.ltv * 0.4)),
        preferredPaymentMethod: c.tier === CustomerTier.ENTERPRISE ? PaymentMethod.nach : PaymentMethod.upi,
      },
    });
    createdCustomers.push(cust);
  }
  console.log(`[Seed] Created ${createdCustomers.length} customers.`);

  // 2. Create 100 Payments
  const paymentMethods: PaymentMethod[] = [PaymentMethod.nach, PaymentMethod.upi, PaymentMethod.card, PaymentMethod.netbanking];
  const errorCodes = [
    { code: "INSUFFICIENT_FUNDS", reason: "insufficient_funds", step: "mandate_execution", source: "bank" },
    { code: "PAYMENT_AUTHENTICATION_FAILED", reason: "3ds_auth_drop", step: "payment_authentication", source: "customer" },
    { code: "UPI_COLLECT_TIMEOUT", reason: "timeout", step: "payment_authorization", source: "customer" },
    { code: "CARD_EXPIRED", reason: "expired_instrument", step: "payment_authorization", source: "bank" },
    { code: "GATEWAY_ERROR", reason: "bank_down", step: "payment_authorization", source: "gateway" },
  ];

  const createdPayments = [];
  for (let i = 1; i <= 100; i++) {
    const cust = createdCustomers[i % createdCustomers.length];
    const isFailed = i <= 35; // 35 failed, 65 captured
    const err = errorCodes[i % errorCodes.length];
    const amount = (i % 5 === 0 ? 149999 : i % 3 === 0 ? 85000 : i % 2 === 0 ? 24999 : 4999) + (i * 100);

    const payment = await prisma.payment.create({
      data: {
        customerId: cust.id,
        razorpayPaymentId: `pay_rzp_demo_${i}_${Date.now().toString(36)}`,
        amount: toPaise(amount),
        currency: "INR",
        status: isFailed ? PaymentStatus.failed : PaymentStatus.captured,
        method: paymentMethods[i % paymentMethods.length],
        bank: "HDFC Bank",
        errorCode: isFailed ? err.code : null,
        errorDescription: isFailed ? `Simulated Razorpay Failure: ${err.code}` : null,
        errorSource: isFailed ? err.source : null,
        errorStep: isFailed ? err.step : null,
        errorReason: isFailed ? err.reason : null,
        attempts: isFailed ? 1 : 2,
        createdAt: new Date(Date.now() - i * 3600000 * 2),
      },
    });
    createdPayments.push(payment);
  }
  console.log(`[Seed] Created ${createdPayments.length} payments.`);

  // 3. Create Subscriptions and Invoices
  for (let i = 0; i < 5; i++) {
    const cust = createdCustomers[i];
    await prisma.subscription.create({
      data: {
        customerId: cust.id,
        razorpaySubscriptionId: `sub_rzp_${i}_${Date.now().toString(36)}`,
        planId: `plan_enterprise_annual_${i}`,
        amount: toPaise(149999),
        status: "active",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 86400000),
      },
    });

    await prisma.invoice.create({
      data: {
        customerId: cust.id,
        razorpayInvoiceId: `inv_rzp_${i}_${Date.now().toString(36)}`,
        amount: toPaise(85000),
        currency: "INR",
        status: i % 2 === 0 ? "paid" : "issued",
        dueDate: new Date(Date.now() + 15 * 86400000),
      },
    });

    await prisma.promiseToPay.create({
      data: {
        customerId: cust.id,
        amount: toPaise(85000),
        promiseDate: new Date(Date.now() + 5 * 86400000),
        status: "PENDING",
        notes: "Finance manager confirmed disbursement on 5th of month.",
      },
    });
  }
  console.log("[Seed] Created Subscriptions, Invoices, and Promise-to-Pay records.");

  // 4. Create 20 Recovery Cases with Attempts & Decisions
  const failedPayments = createdPayments.filter((p) => p.status === PaymentStatus.failed);
  for (let i = 0; i < Math.min(20, failedPayments.length); i++) {
    const payment = failedPayments[i];
    const isRecovered = i >= 12; // 8 in progress, 12 recovered
    const amountPaise = payment.amount;
    const amountRupees = Number(amountPaise) / 100;
    const isCritical = amountRupees >= 100000;
    const caseNumber = `REC-2026-${1000 + i}`;

    const recCase = await prisma.recoveryCase.create({
      data: {
        caseNumber,
        customerId: payment.customerId,
        paymentId: payment.id,
        razorpayPaymentId: payment.razorpayPaymentId,
        amountAtRisk: amountPaise,
        recoverableAmount: toPaise(Math.round(amountRupees * 0.88)),
        recoveredAmount: isRecovered ? amountPaise : 0n,
        currency: "INR",
        status: isRecovered ? RecoveryCaseStatus.RECOVERED : isCritical ? RecoveryCaseStatus.PENDING_APPROVAL : RecoveryCaseStatus.IN_PROGRESS,
        riskLevel: isCritical ? RecoveryRiskLevel.CRITICAL : amountRupees >= 25000 ? RecoveryRiskLevel.HIGH : RecoveryRiskLevel.MEDIUM,
        riskScore: isCritical ? 85 : 65,
        recoverabilityScore: 88,
        expectedRecoveryValue: toPaise(Math.round(amountRupees * 0.88)),
        priority: isCritical ? CasePriority.P0 : CasePriority.P1,
        rootCause: payment.errorCode === "INSUFFICIENT_FUNDS" ? RootCauseType.insufficient_funds : RootCauseType.authentication_failure,
        rootCauseDetails: `Classified as ${payment.errorCode || "debit failure"}. Optimized smart recovery flow formulated.`,
        recommendedAction: payment.method === PaymentMethod.nach ? RecoveryAction.RETRY_SUBSCRIPTION : RecoveryAction.CREATE_PAYMENT_LINK,
        selectedAction: payment.method === PaymentMethod.nach ? RecoveryAction.RETRY_SUBSCRIPTION : RecoveryAction.CREATE_PAYMENT_LINK,
        currentStep: isRecovered ? RecoveryStep.RECOVERY_RESOLVED : isCritical ? RecoveryStep.PENDING_HUMAN_APPROVAL : RecoveryStep.SMART_RETRY_SCHEDULED,
        retryCount: 1,
        contactCount: 1,
        actionsTakenCount: 2,
        requiresHumanApproval: isCritical,
        paymentLinkUrl: `https://rzp.io/i/demo_${caseNumber.toLowerCase()}`,
        recoveredAt: isRecovered ? new Date() : null,
      },
    });

    // Create Recovery Attempt
    await prisma.recoveryAttempt.create({
      data: {
        recoveryCaseId: recCase.id,
        paymentId: payment.id,
        attemptNumber: 1,
        action: recCase.recommendedAction,
        status: isRecovered ? AttemptStatus.SUCCESS : AttemptStatus.INITIATED,
        amount: amountPaise,
        channel: "WHATSAPP",
        notes: "Autonomous dynamic payment link dispatched to customer.",
      },
    });

    // Create Agent Decision
    await prisma.agentDecision.create({
      data: {
        recoveryCaseId: recCase.id,
        agent: "StrategyAgent",
        decision: recCase.recommendedAction,
        confidence: 0.92,
        explanation: `Formulated ${recCase.recommendedAction} due to ${payment.errorCode} on ${payment.method.toUpperCase()} presentation.`,
        inputSnapshot: {
          amount: amountRupees,
          method: payment.method,
          errorCode: payment.errorCode,
        },
      },
    });

    // Create Audit Event
    await prisma.auditEvent.create({
      data: {
        caseId: recCase.id,
        actor: "RECOVER_AI_AGENT",
        eventType: isRecovered ? "PAYMENT_CONFIRMED" : "ACTION_EXECUTED",
        description: isRecovered ? `Payment of ₹${amountRupees.toLocaleString("en-IN")} confirmed captured.` : `Action ${recCase.recommendedAction} executed.`,
      },
    });
  }
  console.log("[Seed] Created 20 Recovery Cases with Attempts, Decisions, and Audit Events.");

  console.log("[Seed] ✓ Database Seed Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("[Seed Error]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
