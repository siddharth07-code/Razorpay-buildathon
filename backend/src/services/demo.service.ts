import { prisma } from "../config/prisma";
import { recoveryOrchestrator } from "./orchestrator.service";
import { langGraphOrchestrator } from "./langgraph-orchestrator.service";
import { toPaise, fromPaise, serializeBigInt } from "../utils/money";
import {
  PaymentStatus,
  CustomerTier,
  PaymentMethod,
  CasePriority,
  RootCauseType,
  RecoveryRiskLevel,
  RecoveryCaseStatus,
  RecoveryAction,
  RecoveryStep,
} from "@prisma/client";

export class DemoService {
  /**
   * Controlled 8-case Demo Portfolio Configurations
   */
  private static readonly DEMO_PORTFOLIO_CONFIGS = [
    {
      caseNumber: "REC-DEMO-001",
      customerName: "Acme Technologies India Pvt Ltd",
      email: "finance@acmetech.demo",
      amountPaise: 2500000n, // ₹25,000
      recoveredAmountPaise: 2500000n,
      status: RecoveryCaseStatus.RECOVERED,
      currentStep: RecoveryStep.RECOVERY_RESOLVED,
      riskScore: 45,
      recoverabilityScore: 91,
      expectedRecoveryPaise: 2275000n,
      riskLevel: RecoveryRiskLevel.MEDIUM,
      priority: CasePriority.P1,
      rootCause: RootCauseType.authentication_failure,
      rootCauseDetails: "Authentication / 3DS Timeout",
      recommendedAction: RecoveryAction.CREATE_PAYMENT_LINK,
      selectedAction: RecoveryAction.CREATE_PAYMENT_LINK,
      requiresHumanApproval: false,
      paymentId: "pay_demo_rec_001",
      razorpayPaymentId: "pay_demo_rec_001_settled",
      paymentLinkUrl: null,
    },
    {
      caseNumber: "REC-DEMO-002",
      customerName: "NovaCloud Systems",
      email: "billing@novacloud.demo",
      amountPaise: 849900n, // ₹8,499
      recoveredAmountPaise: 0n,
      status: RecoveryCaseStatus.AWAITING_PAYMENT,
      currentStep: RecoveryStep.DYNAMIC_PAYMENT_LINK_SENT,
      riskScore: 38,
      recoverabilityScore: 94,
      expectedRecoveryPaise: 798900n,
      riskLevel: RecoveryRiskLevel.LOW,
      priority: CasePriority.P2,
      rootCause: RootCauseType.insufficient_funds,
      rootCauseDetails: "Recurring Card Failure",
      recommendedAction: RecoveryAction.RETRY_SUBSCRIPTION,
      selectedAction: RecoveryAction.RETRY_SUBSCRIPTION,
      requiresHumanApproval: false,
      paymentId: "pay_demo_rec_002",
      razorpayPaymentId: null,
      paymentLinkUrl: "https://rzp.io/i/novacloud_vireon",
    },
    {
      caseNumber: "REC-DEMO-003",
      customerName: "Meridian Retail",
      email: "checkout@meridianretail.demo",
      amountPaise: 124900n, // ₹1,249
      recoveredAmountPaise: 0n,
      status: RecoveryCaseStatus.ACTION_SELECTED,
      currentStep: RecoveryStep.ROOT_CAUSE_ANALYSIS,
      riskScore: 25,
      recoverabilityScore: 88,
      expectedRecoveryPaise: 109900n,
      riskLevel: RecoveryRiskLevel.LOW,
      priority: CasePriority.P3,
      rootCause: RootCauseType.temporary_payment_failure,
      rootCauseDetails: "Cart Abandonment",
      recommendedAction: RecoveryAction.SEND_PAYMENT_LINK,
      selectedAction: RecoveryAction.SEND_PAYMENT_LINK,
      requiresHumanApproval: false,
      paymentId: "pay_demo_rec_003",
      razorpayPaymentId: null,
      paymentLinkUrl: null,
    },
    {
      caseNumber: "REC-DEMO-004",
      customerName: "Vertex Industries",
      email: "accounts@vertexind.demo",
      amountPaise: 27500000n, // ₹2,75,000 (Above ₹1 Lakh)
      recoveredAmountPaise: 0n,
      status: RecoveryCaseStatus.AWAITING_APPROVAL,
      currentStep: RecoveryStep.PENDING_HUMAN_APPROVAL,
      riskScore: 72,
      recoverabilityScore: 82,
      expectedRecoveryPaise: 22550000n,
      riskLevel: RecoveryRiskLevel.HIGH,
      priority: CasePriority.P1,
      rootCause: RootCauseType.temporary_payment_failure,
      rootCauseDetails: "Overdue Corporate Invoice",
      recommendedAction: RecoveryAction.ESCALATE_TO_HUMAN,
      selectedAction: RecoveryAction.ESCALATE_TO_HUMAN,
      requiresHumanApproval: true,
      paymentId: "pay_demo_rec_004",
      razorpayPaymentId: null,
      paymentLinkUrl: null,
    },
    {
      caseNumber: "REC-DEMO-005",
      customerName: "Orion Media",
      email: "finance@orionmedia.demo",
      amountPaise: 6750000n, // ₹67,500 (Hero Live Razorpay Demo Case)
      recoveredAmountPaise: 0n,
      status: RecoveryCaseStatus.AWAITING_PAYMENT,
      currentStep: RecoveryStep.DYNAMIC_PAYMENT_LINK_SENT,
      riskScore: 42,
      recoverabilityScore: 93,
      expectedRecoveryPaise: 6277500n,
      riskLevel: RecoveryRiskLevel.MEDIUM,
      priority: CasePriority.P1,
      rootCause: RootCauseType.authentication_failure,
      rootCauseDetails: "Card Authentication Failure",
      recommendedAction: RecoveryAction.CREATE_PAYMENT_LINK,
      selectedAction: RecoveryAction.CREATE_PAYMENT_LINK,
      requiresHumanApproval: false,
      paymentId: "pay_demo_rec_005",
      razorpayPaymentId: null,
      paymentLinkUrl: null,
    },
    {
      caseNumber: "REC-DEMO-006",
      customerName: "BluePeak Logistics",
      email: "ops@bluepeaklogistics.demo",
      amountPaise: 15000000n, // ₹1,50,000 (Above ₹1 Lakh)
      recoveredAmountPaise: 0n,
      status: RecoveryCaseStatus.AWAITING_APPROVAL,
      currentStep: RecoveryStep.PENDING_HUMAN_APPROVAL,
      riskScore: 65,
      recoverabilityScore: 85,
      expectedRecoveryPaise: 12750000n,
      riskLevel: RecoveryRiskLevel.HIGH,
      priority: CasePriority.P1,
      rootCause: RootCauseType.insufficient_funds,
      rootCauseDetails: "Broken Payment Commitment",
      recommendedAction: RecoveryAction.CREATE_PROMISE_TO_PAY,
      selectedAction: RecoveryAction.CREATE_PROMISE_TO_PAY,
      requiresHumanApproval: true,
      paymentId: "pay_demo_rec_006",
      razorpayPaymentId: null,
      paymentLinkUrl: null,
    },
    {
      caseNumber: "REC-DEMO-007",
      customerName: "Atlas Software",
      email: "accounts@atlassoft.demo",
      amountPaise: 1299900n, // ₹12,999
      recoveredAmountPaise: 0n,
      status: RecoveryCaseStatus.DIAGNOSED,
      currentStep: RecoveryStep.ROOT_CAUSE_ANALYSIS,
      riskScore: 30,
      recoverabilityScore: 96,
      expectedRecoveryPaise: 1247900n,
      riskLevel: RecoveryRiskLevel.LOW,
      priority: CasePriority.P2,
      rootCause: RootCauseType.payment_method_issue,
      rootCauseDetails: "Recurring Payment Failure",
      recommendedAction: RecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE,
      selectedAction: RecoveryAction.REQUEST_PAYMENT_METHOD_UPDATE,
      requiresHumanApproval: false,
      paymentId: "pay_demo_rec_007",
      razorpayPaymentId: null,
      paymentLinkUrl: null,
    },
    {
      caseNumber: "REC-DEMO-008",
      customerName: "Zenith Manufacturing",
      email: "cfo@zenithmfg.demo",
      amountPaise: 84000000n, // ₹8,40,000 (Above ₹1 Lakh)
      recoveredAmountPaise: 0n,
      status: RecoveryCaseStatus.AWAITING_APPROVAL,
      currentStep: RecoveryStep.PENDING_HUMAN_APPROVAL,
      riskScore: 78,
      recoverabilityScore: 75,
      expectedRecoveryPaise: 63000000n,
      riskLevel: RecoveryRiskLevel.CRITICAL,
      priority: CasePriority.P0,
      rootCause: RootCauseType.temporary_payment_failure,
      rootCauseDetails: "High-Value Corporate Invoice",
      recommendedAction: RecoveryAction.ESCALATE_TO_HUMAN,
      selectedAction: RecoveryAction.ESCALATE_TO_HUMAN,
      requiresHumanApproval: true,
      paymentId: "pay_demo_rec_008",
      razorpayPaymentId: null,
      paymentLinkUrl: null,
    },
  ];

  /**
   * Ensure the controlled 8-case Demo Portfolio exists deterministically
   */
  public async ensureDemoPortfolio() {
    const results = [];

    for (const cfg of DemoService.DEMO_PORTFOLIO_CONFIGS) {
      // 1. Upsert Customer
      const customer = await prisma.customer.upsert({
        where: { email: cfg.email },
        update: {
          name: cfg.customerName,
          phone: "+919876543210",
          companyName: cfg.customerName,
          tier: cfg.amountPaise > 10000000n ? CustomerTier.ENTERPRISE : CustomerTier.GROWTH,
        },
        create: {
          name: cfg.customerName,
          email: cfg.email,
          phone: "+919876543210",
          companyName: cfg.customerName,
          tier: cfg.amountPaise > 10000000n ? CustomerTier.ENTERPRISE : CustomerTier.GROWTH,
          lifetimeValue: cfg.amountPaise * 4n,
          successfulPayments: cfg.status === "RECOVERED" ? 12 : 6,
          failedPayments: 1,
          preferredPaymentMethod: PaymentMethod.card,
        },
      });

      // 2. Upsert Payment
      const payment = await prisma.payment.upsert({
        where: { razorpayPaymentId: cfg.paymentId },
        update: {
          amount: cfg.amountPaise,
          currency: "INR",
          status: cfg.status === "RECOVERED" ? PaymentStatus.captured : PaymentStatus.failed,
          errorCode: cfg.rootCause === "authentication_failure" ? "PAYMENT_AUTHENTICATION_FAILED" : "PAYMENT_FAILED",
          errorDescription: cfg.rootCauseDetails,
          errorSource: "customer",
          errorStep: "payment_authentication",
          errorReason: "payment_failure",
        },
        create: {
          customerId: customer.id,
          razorpayPaymentId: cfg.paymentId,
          amount: cfg.amountPaise,
          currency: "INR",
          status: cfg.status === "RECOVERED" ? PaymentStatus.captured : PaymentStatus.failed,
          method: PaymentMethod.card,
          errorCode: cfg.rootCause === "authentication_failure" ? "PAYMENT_AUTHENTICATION_FAILED" : "PAYMENT_FAILED",
          errorDescription: cfg.rootCauseDetails,
          errorSource: "customer",
          errorStep: "payment_authentication",
          errorReason: "payment_failure",
        },
      });

      // 3. Upsert Recovery Case
      let recCase = await prisma.recoveryCase.findUnique({
        where: { caseNumber: cfg.caseNumber },
      });

      if (recCase) {
        recCase = await prisma.recoveryCase.update({
          where: { caseNumber: cfg.caseNumber },
          data: {
            customerId: customer.id,
            paymentId: payment.id,
            razorpayPaymentId: cfg.razorpayPaymentId,
            amountAtRisk: cfg.amountPaise,
            recoverableAmount: cfg.expectedRecoveryPaise,
            recoveredAmount: cfg.recoveredAmountPaise,
            status: cfg.status,
            currentStep: cfg.currentStep,
            riskScore: cfg.riskScore,
            recoverabilityScore: cfg.recoverabilityScore,
            expectedRecoveryValue: cfg.expectedRecoveryPaise,
            riskLevel: cfg.riskLevel,
            priority: cfg.priority,
            rootCause: cfg.rootCause,
            rootCauseDetails: cfg.rootCauseDetails,
            recommendedAction: cfg.recommendedAction,
            selectedAction: cfg.selectedAction,
            requiresHumanApproval: cfg.requiresHumanApproval,
            paymentLinkUrl: cfg.paymentLinkUrl,
            razorpayPaymentLinkId: cfg.paymentLinkUrl ? `plink_${cfg.caseNumber.toLowerCase()}` : null,
            razorpayOrderId: null,
            recoveredAt: cfg.status === "RECOVERED" ? new Date() : null,
            retryCount: 0,
            contactCount: 0,
          },
        });
      } else {
        recCase = await prisma.recoveryCase.create({
          data: {
            caseNumber: cfg.caseNumber,
            customerId: customer.id,
            paymentId: payment.id,
            razorpayPaymentId: cfg.razorpayPaymentId,
            amountAtRisk: cfg.amountPaise,
            recoverableAmount: cfg.expectedRecoveryPaise,
            recoveredAmount: cfg.recoveredAmountPaise,
            status: cfg.status,
            currentStep: cfg.currentStep,
            riskScore: cfg.riskScore,
            recoverabilityScore: cfg.recoverabilityScore,
            expectedRecoveryValue: cfg.expectedRecoveryPaise,
            riskLevel: cfg.riskLevel,
            priority: cfg.priority,
            rootCause: cfg.rootCause,
            rootCauseDetails: cfg.rootCauseDetails,
            recommendedAction: cfg.recommendedAction,
            selectedAction: cfg.selectedAction,
            requiresHumanApproval: cfg.requiresHumanApproval,
            paymentLinkUrl: cfg.paymentLinkUrl,
            razorpayPaymentLinkId: cfg.paymentLinkUrl ? `plink_${cfg.caseNumber.toLowerCase()}` : null,
            recoveredAt: cfg.status === "RECOVERED" ? new Date() : null,
          },
        });
      }

      results.push(recCase);
    }

    return results;
  }

  /**
   * Ensure Canonical Demo Case (returns Hero Case REC-DEMO-005 for live Razorpay testing)
   */
  public async ensureCanonicalDemoCase() {
    await this.ensureDemoPortfolio();
    const heroCase = await prisma.recoveryCase.findUnique({
      where: { caseNumber: "REC-DEMO-005" },
      include: { customer: true, payment: true },
    });
    return heroCase || (await prisma.recoveryCase.findFirstOrThrow({ include: { customer: true, payment: true } }));
  }

  /**
   * Start a controlled real Razorpay Sandbox recovery scenario on the Hero demo case (REC-DEMO-005 Orion Media ₹67,500)
   */
  public async startDemoRecovery(options?: { amountRupees?: number; customerName?: string; caseNumber?: string }) {
    try {
      const targetCaseNumber = options?.caseNumber || "REC-DEMO-005";

      // 1. Ensure portfolio is initialized
      await this.ensureDemoPortfolio();

      let targetCase = await prisma.recoveryCase.findUnique({
        where: { caseNumber: targetCaseNumber },
        include: { customer: true, payment: true },
      });

      if (!targetCase) {
        targetCase = await this.ensureCanonicalDemoCase();
      }

      const amountRupees = options?.amountRupees || (targetCase?.amountAtRisk ? Number(targetCase.amountAtRisk) / 100 : 67500);
      const customerName = options?.customerName || targetCase?.customer?.name || "Orion Media";
      const amountPaise = toPaise(amountRupees);

      // Inspect target case state: if already progressed (AWAITING_PAYMENT, RECOVERED, etc.),
      // safely reset ONLY this case into NEW starting state to run the autonomous recovery loop safely
      if (targetCase.status !== RecoveryCaseStatus.NEW && targetCase.status !== RecoveryCaseStatus.OPEN) {
        await prisma.$transaction(async (tx) => {
          await tx.recoveryAttempt.deleteMany({ where: { recoveryCaseId: targetCase!.id } });
          await tx.agentDecision.deleteMany({ where: { recoveryCaseId: targetCase!.id } });
          await tx.auditEvent.deleteMany({ where: { caseId: targetCase!.id } });
          await tx.humanApproval.deleteMany({ where: { recoveryCaseId: targetCase!.id } });

          await tx.recoveryCase.update({
            where: { id: targetCase!.id },
            data: {
              status: RecoveryCaseStatus.NEW,
              currentStep: RecoveryStep.ROOT_CAUSE_ANALYSIS,
              recoveredAmount: 0n,
              recoveredAt: null,
              paymentLinkUrl: null,
              razorpayPaymentLinkId: null,
              razorpayOrderId: null,
              razorpayPaymentId: null,
              retryCount: 0,
              contactCount: 0,
              actionsTakenCount: 0,
              requiresHumanApproval: false,
            },
          });

          if (targetCase!.paymentId) {
            await tx.payment.update({
              where: { id: targetCase!.paymentId },
              data: {
                status: PaymentStatus.failed,
                errorCode: "PAYMENT_AUTHENTICATION_FAILED",
                errorDescription: "Card Authentication Failure / 3DS dropoff",
              },
            });
          }
        });

        targetCase = (await prisma.recoveryCase.findUnique({
          where: { id: targetCase.id },
          include: { customer: true, payment: true },
        }))!;
      }

      // Execute REAL LangGraph StateGraph Workflow with Supervised ML & Policy Gate
      const graphResult = await langGraphOrchestrator.runRecoveryWorkflow(targetCase.id);

      // Fetch updated case state from PostgreSQL
      const finalCase = await prisma.recoveryCase.findUnique({
        where: { id: targetCase.id },
        include: { customer: true, payment: true, recoveryAttempts: { take: 1, orderBy: { createdAt: "desc" } } },
      });

      return serializeBigInt({
        success: true,
        mode: "RAZORPAY_SANDBOX",
        orchestrationEngine: "LANGGRAPH_STATEGRAPH_V1",
        demoScenario: `${customerName} ₹${amountRupees.toLocaleString("en-IN")} Live Recovery Flow`,
        caseId: finalCase!.id,
        caseNumber: finalCase!.caseNumber,
        amountAtRiskRupees: amountRupees,
        amountAtRiskPaise: amountPaise,
        status: finalCase!.status,
        currentStep: finalCase!.currentStep,
        paymentLinkUrl: finalCase!.paymentLinkUrl,
        razorpayPaymentLinkId: finalCase!.razorpayPaymentLinkId,
        graphResult,
        risk: {
          riskScore: finalCase!.riskScore,
          recoverabilityScore: finalCase!.recoverabilityScore,
          priority: finalCase!.priority,
          recoveryProbability: graphResult.state?.recoveryProbability,
        },
        diagnosis: {
          rootCause: finalCase!.rootCause,
          explanation: finalCase!.rootCauseDetails,
        },
        strategy: {
          action: finalCase!.selectedAction || finalCase!.recommendedAction,
        },
        policy: {
          allowed: !graphResult.requiresHumanApproval,
          requiresHumanApproval: graphResult.requiresHumanApproval || false,
          reason: graphResult.state?.policyReason || "Automated policy evaluation",
        },
        execution: {
          success: graphResult.state?.executionStatus === "SUCCESS",
          paymentLinkUrl: finalCase!.paymentLinkUrl,
          razorpayReference: finalCase!.razorpayPaymentLinkId,
        },
        instructions: "To complete the test recovery, open Razorpay Checkout in Test Mode and complete checkout.",
      });
    } catch (err: any) {
      console.error("[DemoService.startDemoRecovery Error]:", err);
      return serializeBigInt({
        success: false,
        error: err?.message || "Failed to execute autonomous demo recovery",
      });
    }
  }

  /**
   * Start a controlled Subscription Recovery Demo scenario (e.g. ₹25,000 SaaS annual plan)
   */
  public async startSubscriptionDemoRecovery(options?: { amountRupees?: number; customerName?: string; subId?: string }) {
    const amountRupees = options?.amountRupees || 25000;
    const customerName = options?.customerName || "Acme SaaS India Pvt Ltd";
    const subId = options?.subId || `sub_demo_${Date.now()}`;
    const amountPaise = toPaise(amountRupees);

    const demoCustomerEmail = "billing@acmesaas.demo";
    const customer = await prisma.customer.upsert({
      where: { email: demoCustomerEmail },
      update: {
        name: customerName,
        phone: "+919876543210",
        companyName: customerName,
        tier: CustomerTier.GROWTH,
        successfulPayments: 11,
        failedPayments: 1,
      },
      create: {
        name: customerName,
        email: demoCustomerEmail,
        phone: "+919876543210",
        companyName: customerName,
        tier: CustomerTier.GROWTH,
        lifetimeValue: toPaise(300000),
        successfulPayments: 11,
        failedPayments: 1,
        preferredPaymentMethod: PaymentMethod.card,
      },
    });

    const subscription = await prisma.subscription.upsert({
      where: { razorpaySubscriptionId: subId },
      update: { status: "pending", amount: amountPaise },
      create: {
        razorpaySubscriptionId: subId,
        customerId: customer.id,
        planId: "plan_annual_growth_saas",
        amount: amountPaise,
        status: "pending",
      },
    });

    const caseObj = await recoveryOrchestrator.createRecoveryCase({
      customerId: customer.id,
      amountAtRisk: amountPaise,
      errorCode: "SUBSCRIPTION_PAYMENT_FAILED",
      errorDescription: "Recurring subscription card debit failed",
      paymentMethod: PaymentMethod.card,
    });

    const demoCaseNumber = `REC-SUB-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    await prisma.recoveryCase.update({
      where: { id: caseObj.id },
      data: {
        caseNumber: demoCaseNumber,
        subscriptionId: subscription.id,
        razorpaySubscriptionId: subId,
      },
    });

    const analysis = await recoveryOrchestrator.analyzeCase(caseObj.id);
    const strategy = await recoveryOrchestrator.selectRecoveryAction(caseObj.id);
    const policy = await recoveryOrchestrator.validatePolicy(caseObj.id);

    let execution: any = null;
    if (!policy.requiresHumanApproval && policy.allowed) {
      execution = await recoveryOrchestrator.executeRecoveryAction(caseObj.id);
    }

    const finalCase = await prisma.recoveryCase.findUnique({
      where: { id: caseObj.id },
      include: { customer: true, subscription: true },
    });

    return serializeBigInt({
      success: true,
      mode: "RAZORPAY_SANDBOX_SUBSCRIPTION",
      demoScenario: `${customerName} ₹${amountRupees.toLocaleString("en-IN")} Subscription Recovery Flow`,
      caseId: finalCase!.id,
      caseNumber: finalCase!.caseNumber,
      subscriptionId: subId,
      amountAtRiskRupees: amountRupees,
      amountAtRiskPaise: amountPaise,
      status: finalCase!.status,
      paymentLinkUrl: finalCase!.paymentLinkUrl,
      risk: analysis.risk,
      diagnosis: analysis.diagnosis,
      strategy,
      policy,
      execution,
    });
  }

  /**
   * Start a controlled Halted Subscription Scenario (₹1,50,000 High-Value Enterprise)
   */
  public async startSubscriptionHaltedDemoRecovery() {
    const amountRupees = 150000;
    const customerName = "Enterprise Global Cloud Pvt Ltd";
    const subId = `sub_halted_${Date.now()}`;
    const amountPaise = toPaise(amountRupees);

    const demoCustomerEmail = "cfo@enterprisecloud.demo";
    const customer = await prisma.customer.upsert({
      where: { email: demoCustomerEmail },
      update: {
        name: customerName,
        phone: "+919876543210",
        companyName: customerName,
        tier: CustomerTier.ENTERPRISE,
        successfulPayments: 24,
        failedPayments: 3,
      },
      create: {
        name: customerName,
        email: demoCustomerEmail,
        phone: "+919876543210",
        companyName: customerName,
        tier: CustomerTier.ENTERPRISE,
        lifetimeValue: toPaise(1800000),
        successfulPayments: 24,
        failedPayments: 3,
        preferredPaymentMethod: PaymentMethod.nach,
      },
    });

    const subscription = await prisma.subscription.upsert({
      where: { razorpaySubscriptionId: subId },
      update: { status: "halted", amount: amountPaise },
      create: {
        razorpaySubscriptionId: subId,
        customerId: customer.id,
        planId: "plan_enterprise_cloud_tier3",
        amount: amountPaise,
        status: "halted",
      },
    });

    const caseObj = await recoveryOrchestrator.createRecoveryCase({
      customerId: customer.id,
      amountAtRisk: amountPaise,
      errorCode: "SUBSCRIPTION_HALTED",
      errorDescription: "Subscription reached terminal halted state due to consecutive presentation rejections",
      paymentMethod: PaymentMethod.nach,
    });

    const demoCaseNumber = `REC-SUB-HALTED-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    await prisma.recoveryCase.update({
      where: { id: caseObj.id },
      data: {
        caseNumber: demoCaseNumber,
        subscriptionId: subscription.id,
        razorpaySubscriptionId: subId,
        riskLevel: "CRITICAL",
        requiresHumanApproval: true,
      },
    });

    const analysis = await recoveryOrchestrator.analyzeCase(caseObj.id);
    const strategy = await recoveryOrchestrator.selectRecoveryAction(caseObj.id);
    const policy = await recoveryOrchestrator.validatePolicy(caseObj.id);

    const finalCase = await prisma.recoveryCase.findUnique({
      where: { id: caseObj.id },
      include: { customer: true, subscription: true },
    });

    return serializeBigInt({
      success: true,
      mode: "RAZORPAY_SANDBOX_SUBSCRIPTION_HALTED",
      demoScenario: `${customerName} ₹${amountRupees.toLocaleString("en-IN")} Halted Subscription Review`,
      caseId: finalCase!.id,
      caseNumber: finalCase!.caseNumber,
      subscriptionId: subId,
      amountAtRiskRupees: amountRupees,
      amountAtRiskPaise: amountPaise,
      status: finalCase!.status,
      requiresHumanApproval: true,
      risk: analysis.risk,
      diagnosis: analysis.diagnosis,
      strategy,
      policy,
    });
  }

  /**
   * Controlled fixture generator for checkout abandonment testing/demos.
   * Advances order age safely without manipulating real financial history.
   */
  public async createAbandonedCheckoutFixture(options: {
    ageMinutes?: number;
    amountPaise?: bigint;
    customerName?: string;
    customerEmail?: string;
  }) {
    const ageMinutes = options.ageMinutes ?? 35;
    const amountPaise = options.amountPaise ?? 5000000n; // ₹50,000 default
    const customerEmail = options.customerEmail || `checkout.demo.${Date.now()}@acmetech.demo`;
    const customerName = options.customerName || "Acme Technologies India Pvt Ltd";

    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: { name: customerName, companyName: customerName },
      create: {
        name: customerName,
        email: customerEmail,
        phone: "+919876543210",
        companyName: customerName,
        tier: amountPaise >= 10000000n ? CustomerTier.ENTERPRISE : CustomerTier.GROWTH,
        lifetimeValue: 25000000n,
        successfulPayments: 5,
        failedPayments: 1,
      },
    });

    const pastDate = new Date(Date.now() - ageMinutes * 60 * 1000);
    const razorpayOrderId = `order_chk_fix_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const order = await prisma.order.create({
      data: {
        razorpayOrderId,
        customerId: customer.id,
        amount: amountPaise,
        currency: "INR",
        status: "created",
        receipt: `rcpt_chk_${Date.now()}`,
        createdAt: pastDate,
        updatedAt: pastDate,
      },
    });

    return { customer, order };
  }

  /**
   * Start a standard ₹50,000 checkout abandonment recovery demo
   */
  public async startCheckoutAbandonmentDemoRecovery(options?: { amountRupees?: number; customerName?: string }) {
    const amountRupees = options?.amountRupees || 50000;
    const amountPaise = toPaise(amountRupees);
    const customerName = options?.customerName || "Acme Technologies India Pvt Ltd";

    const { customer, order } = await this.createAbandonedCheckoutFixture({
      ageMinutes: 35,
      amountPaise,
      customerName,
    });

    // Run authoritative abandonment scanner
    const { abandonmentService } = await import("./abandonment.service");
    const scanResult = await abandonmentService.scanAndRecoverAbandonedCheckouts({
      windowMinutes: 30,
      limit: 10,
    });

    const matchingCase = await prisma.recoveryCase.findFirst({
      where: { orderId: order.id },
      include: { customer: true, order: true },
    });

    return serializeBigInt({
      success: true,
      mode: "RAZORPAY_SANDBOX_CHECKOUT_ABANDONMENT",
      demoScenario: `${customerName} ₹${amountRupees.toLocaleString("en-IN")} Checkout Abandonment Recovery`,
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      caseId: matchingCase?.id,
      caseNumber: matchingCase?.caseNumber,
      amountAtRiskRupees: amountRupees,
      amountAtRiskPaise: amountPaise,
      status: matchingCase?.status,
      paymentLinkUrl: matchingCase?.paymentLinkUrl,
      scanResult,
    });
  }

  /**
   * Start a high-value ₹2,50,000 checkout abandonment demo requiring operator sign-off
   */
  public async startHighValueCheckoutDemoRecovery() {
    const amountRupees = 250000;
    const amountPaise = toPaise(amountRupees);
    const customerName = "Enterprise Global Cloud Pvt Ltd";

    const { customer, order } = await this.createAbandonedCheckoutFixture({
      ageMinutes: 35,
      amountPaise,
      customerName,
    });

    const { abandonmentService } = await import("./abandonment.service");
    const scanResult = await abandonmentService.scanAndRecoverAbandonedCheckouts({
      windowMinutes: 30,
      limit: 10,
    });

    const matchingCase = await prisma.recoveryCase.findFirst({
      where: { orderId: order.id },
      include: { customer: true, order: true },
    });

    return serializeBigInt({
      success: true,
      mode: "RAZORPAY_SANDBOX_HIGH_VALUE_CHECKOUT",
      demoScenario: `${customerName} ₹${amountRupees.toLocaleString("en-IN")} High-Value Checkout Authorization`,
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      caseId: matchingCase?.id,
      caseNumber: matchingCase?.caseNumber,
      amountAtRiskRupees: amountRupees,
      amountAtRiskPaise: amountPaise,
      status: matchingCase?.status,
      requiresHumanApproval: matchingCase?.requiresHumanApproval,
      scanResult,
    });
  }

  /**
   * Create an overdue B2B invoice test fixture in PostgreSQL
   */
  public async createOverdueInvoiceFixture(options?: {
    daysOverdue?: number;
    amountPaise?: bigint;
    customerName?: string;
    customerEmail?: string;
  }) {
    const daysOverdue = options?.daysOverdue ?? 15;
    const amountPaise = options?.amountPaise ?? toPaise(150000); // ₹1,50,000
    const customerName = options?.customerName ?? "Acme Global Solutions Pvt Ltd";
    const customerEmail = options?.customerEmail ?? `enterprise_${Date.now()}@acmeglobal.demo`;

    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        name: customerName,
        companyName: customerName,
        tier: CustomerTier.ENTERPRISE,
        successfulPayments: 12,
        failedPayments: 1,
      },
      create: {
        name: customerName,
        email: customerEmail,
        phone: "+919876543210",
        companyName: customerName,
        tier: CustomerTier.ENTERPRISE,
        lifetimeValue: toPaise(1500000),
        successfulPayments: 12,
        failedPayments: 1,
        preferredPaymentMethod: PaymentMethod.netbanking,
      },
    });

    const dueDate = new Date(Date.now() - daysOverdue * 24 * 60 * 60 * 1000);
    const invoice = await prisma.invoice.create({
      data: {
        razorpayInvoiceId: `inv_demo_${Date.now()}`,
        customerId: customer.id,
        amount: amountPaise,
        currency: "INR",
        status: "overdue",
        dueDate,
      },
    });

    return { customer, invoice, daysOverdue };
  }

  /**
   * Run a controlled B2B Receivables recovery scenario
   */
  public async startReceivablesDemoRecovery() {
    const amountRupees = 150000;
    const amountPaise = toPaise(amountRupees);
    const customerName = "Acme Global Solutions Pvt Ltd";

    const { customer, invoice, daysOverdue } = await this.createOverdueInvoiceFixture({
      daysOverdue: 15,
      amountPaise,
      customerName,
    });

    const { receivablesService } = await import("./receivables.service");
    const scanResult = await receivablesService.scanAndRecoverOverdueInvoices({
      daysOverdueThreshold: 0,
      limit: 10,
    });

    const matchingCase = await prisma.recoveryCase.findFirst({
      where: { invoiceId: invoice.id },
      include: { customer: true, invoice: true },
    });

    return serializeBigInt({
      success: true,
      mode: "RAZORPAY_SANDBOX_B2B_RECEIVABLES",
      demoScenario: `${customerName} ₹${amountRupees.toLocaleString("en-IN")} Overdue Invoice Recovery`,
      invoiceId: invoice.id,
      razorpayInvoiceId: invoice.razorpayInvoiceId,
      caseId: matchingCase?.id,
      caseNumber: matchingCase?.caseNumber,
      amountAtRiskRupees: amountRupees,
      amountAtRiskPaise: amountPaise,
      daysOverdue,
      status: matchingCase?.status,
      requiresHumanApproval: matchingCase?.requiresHumanApproval,
      scanResult,
    });
  }

  /**
   * Safely reset ONLY demo/test records (never touches production data)
   */
  public async resetDemoRecovery() {
    // Find all demo and test cases to reset
    const demoCases = await prisma.recoveryCase.findMany({
      where: {
        OR: [
          { caseNumber: { startsWith: "REC-DEMO-" } },
          { caseNumber: { startsWith: "REC-SUB-" } },
          { caseNumber: { startsWith: "REC-CHK-" } },
          { caseNumber: { startsWith: "REC-INV-" } },
          { caseNumber: { startsWith: "REC-LG-" } },
          { caseNumber: { startsWith: "REC-REG-" } },
          { caseNumber: { startsWith: "REC-ADV-" } },
          { caseNumber: { startsWith: "REC-ATOMIC-" } },
          { caseNumber: { startsWith: "REC-TEST-" } },
          { caseNumber: { startsWith: "REC-AUDIT-" } },
          { caseNumber: { startsWith: "REC-CHRG-" } },
          { caseNumber: { startsWith: "REC-PLINK-" } },
          { caseNumber: { startsWith: "REC-2026-" } },
          { caseNumber: { startsWith: "TEST-" } },
          { customer: { email: { endsWith: ".demo" } } },
        ],
      },
      select: { id: true, paymentId: true, subscriptionId: true, orderId: true, invoiceId: true },
    });

    const caseIds = demoCases.map((c) => c.id);
    const paymentIds = demoCases.map((c) => c.paymentId).filter(Boolean) as string[];
    const subscriptionIds = demoCases.map((c) => c.subscriptionId).filter(Boolean) as string[];
    const orderIds = demoCases.map((c) => c.orderId).filter(Boolean) as string[];
    const invoiceIds = demoCases.map((c) => c.invoiceId).filter(Boolean) as string[];

    if (caseIds.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.auditEvent.deleteMany({ where: { caseId: { in: caseIds } } });
        await tx.agentDecision.deleteMany({ where: { recoveryCaseId: { in: caseIds } } });
        await tx.recoveryAttempt.deleteMany({ where: { recoveryCaseId: { in: caseIds } } });
        await tx.humanApproval.deleteMany({ where: { recoveryCaseId: { in: caseIds } } });
        await tx.promiseToPay.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
        await tx.recoveryCase.deleteMany({ where: { id: { in: caseIds } } });
        if (paymentIds.length > 0) {
          await tx.payment.deleteMany({ where: { id: { in: paymentIds } } });
        }
        if (subscriptionIds.length > 0) {
          await tx.subscription.deleteMany({ where: { id: { in: subscriptionIds } } });
        }
        if (orderIds.length > 0) {
          await tx.order.deleteMany({ where: { id: { in: orderIds } } });
        }
        if (invoiceIds.length > 0) {
          await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });
        }
      });
    }

    const portfolio = await this.ensureDemoPortfolio();
    const heroCase = portfolio.find((c) => c.caseNumber === "REC-DEMO-005") || portfolio[0];

    return {
      success: true,
      resetCasesCount: caseIds.length,
      portfolioCount: portfolio.length,
      canonicalCaseId: heroCase.id,
      canonicalCaseNumber: heroCase.caseNumber,
      status: heroCase.status,
      heroCaseNumber: heroCase.caseNumber,
      heroCustomer: "Orion Media",
      amountAtRiskRupees: Number(heroCase.amountAtRisk) / 100,
      message: `Safely reset controlled demo portfolio to 8 deterministic recovery cases (₹1,249 to ₹8,40,000). Hero Live Razorpay demo case ${heroCase.caseNumber} ready (₹67,500). Production records preserved.`,
    };
  }
}

export const demoService = new DemoService();

