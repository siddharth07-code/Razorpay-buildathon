import { prisma } from "../config/prisma";
import { stateMachineService, RecoveryStateMachine } from "./state-machine.service";
import { riskService, RiskEvaluation } from "./risk.service";
import { diagnosisService, DiagnosisResult } from "./diagnosis.service";
import { strategyService, StrategyResult } from "./strategy.service";
import { policyService, PolicyEvaluation } from "./policy.service";
import { executionService, ExecutionResult } from "./execution.service";
import { outcomeService } from "./outcome.service";
import { auditService } from "./audit.service";
import { eventService } from "./event.service";
import { toPaise, fromPaise, serializeBigInt } from "../utils/money";
import { RecoveryCaseStatus, RecoveryStep, AttemptStatus, RootCauseType, RecoveryAction } from "@prisma/client";

function mapToPrismaRootCause(rootCause: string): RootCauseType {
  switch (rootCause) {
    case "CHECKOUT_TIMEOUT":
    case "PAYMENT_METHOD_FRICTION":
    case "PAYMENT_ATTEMPT_FAILED":
    case "UNKNOWN_CHECKOUT_ABANDONMENT":
    case "CHECKOUT_ABANDONMENT":
      return RootCauseType.checkout_abandonment;
    case "CARD_EXPIRED":
    case "MANDATE_ISSUE":
    case "PAYMENT_METHOD_ISSUE":
      return RootCauseType.payment_method_issue;
    case "SUBSCRIPTION_HALTED":
    case "REPEATED_SUBSCRIPTION_FAILURE":
    case "SUBSCRIPTION_PAYMENT_FAILURE":
    case "SUBSCRIPTION_FAILURE":
    case "UNKNOWN_SUBSCRIPTION_FAILURE":
      return RootCauseType.subscription_payment_failure;
    case "AUTHENTICATION_FAILURE":
      return RootCauseType.authentication_failure;
    case "INSUFFICIENT_FUNDS":
      return RootCauseType.insufficient_funds;
    case "REPEATED_FAILURE":
      return RootCauseType.repeated_failure;
    case "TEMPORARY_PAYMENT_FAILURE":
      return RootCauseType.temporary_payment_failure;
    case "OVERDUE_INVOICE":
      return RootCauseType.overdue_invoice;
    case "MISSED_PROMISE_TO_PAY":
      return RootCauseType.missed_promise_to_pay;
    default:
      return RootCauseType.unknown_other;
  }
}

export class RecoveryOrchestrator {
  /**
   * Step 1: Ingest payment failure and initialize recovery case
   */
  public async createRecoveryCase(params: {
    customerId: string;
    paymentId?: string;
    razorpayPaymentId?: string;
    amountAtRisk: bigint;
    errorCode?: string;
    errorDescription?: string;
    paymentMethod?: string;
  }) {
    const caseNumber = `REC-2026-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const recCase = await prisma.recoveryCase.create({
      data: {
        caseNumber,
        customerId: params.customerId,
        paymentId: params.paymentId,
        razorpayPaymentId: params.razorpayPaymentId,
        amountAtRisk: params.amountAtRisk,
        status: RecoveryCaseStatus.NEW,
        currentStep: RecoveryStep.ROOT_CAUSE_ANALYSIS,
        rootCauseDetails: params.errorDescription || "Payment failure ingested",
      },
    });

    await auditService.logEvent({
      caseId: recCase.id,
      actor: "RECOVERY_ORCHESTRATOR",
      eventType: "CASE_CREATED",
      description: `Recovery case ${caseNumber} created for amount ₹${fromPaise(params.amountAtRisk)}. Status: NEW.`,
    });

    await eventService.publishEvent({
      caseId: recCase.id,
      caseNumber,
      type: "CASE_CREATED",
      actor: "RECOVERY_ORCHESTRATOR",
      status: "success",
      description: `Recovery case ${caseNumber} created for amount ₹${fromPaise(params.amountAtRisk)}.`,
      metadata: { amountAtRisk: fromPaise(params.amountAtRisk) },
    });

    return recCase;
  }

  /**
   * Step 2: Risk & Root Cause Analysis
   */
  public async analyzeCase(caseId: string): Promise<{
    risk: RiskEvaluation;
    diagnosis: DiagnosisResult;
  }> {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, payment: true },
    });

    if (!recCase) throw new Error(`Recovery case ${caseId} not found`);

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      throw new Error(`Cannot analyze case ${caseId}: Recovery case is already in terminal state '${recCase.status}'.`);
    }

    if (recCase.status === RecoveryCaseStatus.AWAITING_PAYMENT) {
      throw new Error(`Cannot analyze case ${caseId}: Recovery case has already progressed to 'AWAITING_PAYMENT' and cannot restart analysis.`);
    }

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "RISK_ANALYSIS_STARTED",
      actor: "RISK_AGENT",
      status: "running",
      description: `Computing risk metrics and recoverability probability for ${recCase.caseNumber}...`,
    });

    // 1. Transition to ANALYZING
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ANALYZING);

    // 2. Risk Evaluation
    const risk = riskService.evaluateRisk({
      amountAtRisk: recCase.amountAtRisk,
      paymentMethod: recCase.payment?.method || undefined,
      failureReason: recCase.payment?.errorCode || recCase.rootCause || undefined,
      customerHistory: recCase.customer
        ? {
            successfulPayments: recCase.customer.successfulPayments,
            failedPayments: recCase.customer.failedPayments,
            tier: recCase.customer.tier,
          }
        : undefined,
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "RISK_ANALYSIS_COMPLETED",
      actor: "RISK_AGENT",
      status: "success",
      description: `Risk score: ${risk.riskScore}/100, Recoverability: ${risk.recoverabilityScore}%, Expected Recovery Value: ₹${fromPaise(risk.expectedRecoveryValue)}. Priority: ${risk.priority}.`,
      metadata: { ...risk, expectedRecoveryValue: fromPaise(risk.expectedRecoveryValue) },
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "DIAGNOSIS_STARTED",
      actor: "DIAGNOSIS_AGENT",
      status: "running",
      description: `Classifying failure telemetry and root cause classification...`,
    });

    // 3. Root Cause Diagnosis
    const diagnosis = await diagnosisService.diagnose({
      errorCode: recCase.payment?.errorCode || undefined,
      errorDescription: recCase.payment?.errorDescription || recCase.rootCauseDetails || undefined,
      errorReason: recCase.payment?.errorReason || undefined,
      paymentMethod: recCase.payment?.method || undefined,
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "DIAGNOSIS_COMPLETED",
      actor: "DIAGNOSIS_AGENT",
      status: "success",
      description: `Diagnosed root cause: ${diagnosis.rootCause} (Confidence: ${Math.round(diagnosis.confidence * 100)}%). ${diagnosis.explanation}`,
      metadata: diagnosis,
    });

    // Map to Prisma RootCauseType enum safely
    const prismaRootCause = mapToPrismaRootCause(diagnosis.rootCause);

    // 4. Update case in PostgreSQL
    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        riskScore: risk.riskScore,
        recoverabilityScore: risk.recoverabilityScore,
        expectedRecoveryValue: risk.expectedRecoveryValue,
        priority: risk.priority,
        riskLevel: risk.riskLevel,
        rootCause: prismaRootCause,
        rootCauseDetails: diagnosis.explanation,
        recoverableAmount: risk.expectedRecoveryValue,
      },
    });

    // 5. Transition to DIAGNOSED
    await stateMachineService.transition(caseId, RecoveryCaseStatus.DIAGNOSED);

    return { risk, diagnosis };
  }

  /**
   * Step 3: Strategy Selection
   */
  public async selectRecoveryAction(caseId: string): Promise<StrategyResult> {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, payment: true },
    });

    if (!recCase) throw new Error(`Recovery case ${caseId} not found`);

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      throw new Error(`Cannot select strategy for case ${caseId}: Recovery case is already in terminal state '${recCase.status}'.`);
    }

    if (recCase.status === RecoveryCaseStatus.AWAITING_PAYMENT) {
      throw new Error(`Cannot select strategy for case ${caseId}: Recovery case has already progressed to 'AWAITING_PAYMENT'.`);
    }

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "STRATEGY_STARTED",
      actor: "STRATEGY_AGENT",
      status: "running",
      description: `Selecting optimal recovery action from closed action set...`,
    });

    const risk = riskService.evaluateRisk({
      amountAtRisk: recCase.amountAtRisk,
      paymentMethod: recCase.payment?.method || undefined,
      failureReason: recCase.rootCause || undefined,
    });

    const rootCauseUpper = (recCase.rootCause ? recCase.rootCause.toUpperCase() : "AUTHENTICATION_FAILURE") as any;

    const strategy = strategyService.selectStrategy({
      amountAtRisk: recCase.amountAtRisk,
      paymentMethod: recCase.payment?.method || undefined,
      rootCause: rootCauseUpper,
      risk,
      recoveryAttemptsCount: recCase.retryCount,
      customerContactCount: recCase.contactCount,
    });

    const prismaAction = strategy.action as RecoveryAction;

    // Update case with selected strategy
    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        recommendedAction: prismaAction,
        selectedAction: prismaAction,
        currentStep: RecoveryStep.DYNAMIC_PAYMENT_LINK_SENT,
      },
    });

    // Record agent decision
    await prisma.agentDecision.create({
      data: {
        recoveryCaseId: caseId,
        agent: "StrategyAgent",
        decision: strategy.action,
        confidence: strategy.confidence,
        explanation: strategy.explanation,
        inputSnapshot: {
          amount: fromPaise(recCase.amountAtRisk),
          method: recCase.payment?.method,
          rootCause: recCase.rootCause,
        },
      },
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "STRATEGY_SELECTED",
      actor: "STRATEGY_AGENT",
      status: "success",
      description: `Selected strategy: ${strategy.action} (Confidence: ${Math.round(strategy.confidence * 100)}%). ${strategy.explanation}`,
      metadata: { ...strategy, expectedRecoveryValue: fromPaise(strategy.expectedRecoveryValue) },
    });

    // Transition to ACTION_SELECTED
    await stateMachineService.transition(caseId, RecoveryCaseStatus.ACTION_SELECTED);

    return strategy;
  }

  /**
   * Step 4: Policy Engine Validation
   */
  public async validatePolicy(caseId: string): Promise<PolicyEvaluation> {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { recoveryAttempts: { take: 1, orderBy: { createdAt: "desc" } } },
    });

    if (!recCase) throw new Error(`Recovery case ${caseId} not found`);

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      throw new Error(`Cannot validate policy for case ${caseId}: Recovery case is already in terminal state '${recCase.status}'.`);
    }

    if (recCase.status === RecoveryCaseStatus.AWAITING_PAYMENT) {
      throw new Error(`Cannot validate policy for case ${caseId}: Recovery case has already progressed to 'AWAITING_PAYMENT'.`);
    }

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "POLICY_CHECK_STARTED",
      actor: "POLICY_ENGINE",
      status: "running",
      description: `Checking compliance against retry caps, contact limits, and ₹1,00,000 threshold...`,
    });

    const lastAttempt = recCase.recoveryAttempts[0];

    const policy = policyService.evaluatePolicy({
      caseId,
      amountAtRisk: recCase.amountAtRisk,
      action: recCase.selectedAction || recCase.recommendedAction || "CREATE_PAYMENT_LINK",
      recoveryAttemptsCount: recCase.retryCount,
      customerContactCount: recCase.contactCount,
      lastAttemptTimestamp: lastAttempt?.createdAt,
    });

    await prisma.recoveryCase.update({
      where: { id: caseId },
      data: {
        requiresHumanApproval: policy.requiresHumanApproval,
      },
    });

    if (policy.requiresHumanApproval) {
      await stateMachineService.transition(caseId, RecoveryCaseStatus.AWAITING_APPROVAL);

      await eventService.publishEvent({
        caseId,
        caseNumber: recCase.caseNumber,
        type: "HUMAN_APPROVAL_REQUIRED",
        actor: "POLICY_ENGINE",
        status: "blocked",
        description: `Mandatory human sign-off required: Amount ₹${fromPaise(recCase.amountAtRisk).toLocaleString("en-IN")} exceeds the ₹1,00,000 threshold.`,
        metadata: policy,
      });
    } else if (!policy.allowed) {
      await stateMachineService.transition(caseId, RecoveryCaseStatus.STOPPED);

      await eventService.publishEvent({
        caseId,
        caseNumber: recCase.caseNumber,
        type: "POLICY_BLOCKED",
        actor: "POLICY_ENGINE",
        status: "failed",
        description: `Policy BLOCKED execution: ${policy.reason}`,
        metadata: policy,
      });
    } else {
      await eventService.publishEvent({
        caseId,
        caseNumber: recCase.caseNumber,
        type: "POLICY_APPROVED",
        actor: "POLICY_ENGINE",
        status: "success",
        description: `Policy APPROVED: Action complies with all risk caps and retry constraints.`,
        metadata: policy,
      });
    }

    return policy;
  }

  /**
   * Step 5: Execute Approved Recovery Action
   */
  public async executeRecoveryAction(
    caseId: string,
    options?: { forceExecute?: boolean; actor?: string }
  ): Promise<ExecutionResult> {
    const recCase = await prisma.recoveryCase.findUnique({
      where: { id: caseId },
      include: { customer: true, payment: true },
    });

    if (!recCase) throw new Error(`Recovery case ${caseId} not found`);

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      throw new Error(`Cannot execute action for case ${caseId}: Recovery case is already in terminal state '${recCase.status}'.`);
    }

    if (recCase.status === RecoveryCaseStatus.AWAITING_PAYMENT && recCase.paymentLinkUrl && !options?.forceExecute) {
      return {
        success: true,
        attemptId: recCase.id,
        action: recCase.selectedAction || "CREATE_PAYMENT_LINK",
        status: AttemptStatus.SUCCESS,
        paymentLinkUrl: recCase.paymentLinkUrl,
        razorpayReference: recCase.razorpayPaymentLinkId || recCase.paymentId || "plink_active",
        message: "Payment link is already active and awaiting customer payment.",
      };
    }

    let currentCase = recCase;
    if (currentCase.status === RecoveryCaseStatus.NEW || currentCase.status === RecoveryCaseStatus.OPEN) {
      await this.analyzeCase(caseId);
      await this.selectRecoveryAction(caseId);
      currentCase = (await prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: { customer: true, payment: true },
      }))!;
    } else if (currentCase.status === RecoveryCaseStatus.DIAGNOSED) {
      await this.selectRecoveryAction(caseId);
      currentCase = (await prisma.recoveryCase.findUnique({
        where: { id: caseId },
        include: { customer: true, payment: true },
      }))!;
    }

    if (!options?.forceExecute) {
      const policy = await this.validatePolicy(caseId);
      if (policy.requiresHumanApproval || !policy.allowed) {
        return {
          success: false,
          attemptId: currentCase.id,
          action: currentCase.selectedAction || "CREATE_PAYMENT_LINK",
          status: AttemptStatus.BLOCKED_BY_POLICY,
          message: policy.reason || "Intervention requires human approval before execution.",
        };
      }
    }

    await eventService.publishEvent({
      caseId,
      caseNumber: currentCase.caseNumber,
      type: "RAZORPAY_ACTION_STARTED",
      actor: "EXECUTION_SERVICE",
      status: "running",
      description: `Dispatching ${currentCase.selectedAction || "action"} via Razorpay Sandbox API...`,
    });

    // Transition to EXECUTING
    await stateMachineService.transition(caseId, RecoveryCaseStatus.EXECUTING);

    const action = currentCase.selectedAction || currentCase.recommendedAction || "CREATE_PAYMENT_LINK";
    const execution = await executionService.executeAction({
      caseId,
      action: action as any,
      amountAtRisk: currentCase.amountAtRisk,
      customer: {
        name: currentCase.customer?.name || "Customer",
        email: recCase.customer?.email || "customer@example.in",
        phone: recCase.customer?.phone || "+919876543210",
      },
      paymentId: recCase.paymentId || undefined,
      attemptNumber: recCase.retryCount + 1,
    });

    if (execution.success) {
      if (execution.paymentLinkUrl) {
        await stateMachineService.transition(caseId, RecoveryCaseStatus.AWAITING_PAYMENT);

        await prisma.recoveryCase.update({
          where: { id: caseId },
          data: {
            paymentLinkUrl: execution.paymentLinkUrl,
            razorpayPaymentLinkId: execution.razorpayReference,
            updatedAt: new Date(),
          },
        });

        await eventService.publishEvent({
          caseId,
          caseNumber: recCase.caseNumber,
          type: "PAYMENT_LINK_CREATED",
          actor: "RAZORPAY_API",
          status: "success",
          description: `1-Click Razorpay Dynamic Payment Link created: ${execution.paymentLinkUrl}`,
          metadata: { paymentLinkUrl: execution.paymentLinkUrl, action },
        });

        await eventService.publishEvent({
          caseId,
          caseNumber: recCase.caseNumber,
          type: "PAYMENT_AWAITING",
          actor: "RECOVER_AI_ORCHESTRATOR",
          status: "waiting",
          description: `Awaiting customer payment in Razorpay Checkout...`,
        });
      } else {
        await outcomeService.confirmRecovery({
          caseId,
          amountCapturedPaise: recCase.amountAtRisk,
          razorpayPaymentId: execution.razorpayReference,
        });
      }
    } else {
      await outcomeService.handleFailure({
        caseId,
        reason: execution.message,
      });

      await eventService.publishEvent({
        caseId,
        caseNumber: recCase.caseNumber,
        type: "RECOVERY_FAILED",
        actor: "EXECUTION_SERVICE",
        status: "failed",
        description: `Execution failed: ${execution.message}`,
      });
    }

    return execution;
  }

  /**
   * Complete recovery on webhook confirmation
   */
  public async completeRecovery(caseId: string, paymentReference?: string) {
    const recCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    if (!recCase) throw new Error(`Case ${caseId} not found`);

    if (recCase.status === RecoveryCaseStatus.RECOVERED) {
      return {
        success: true,
        alreadyRecovered: true,
        caseNumber: recCase.caseNumber,
        recoveredAmountPaise: recCase.recoveredAmount,
        recoveredAmountRupees: fromPaise(recCase.recoveredAmount),
      };
    }

    const result = await outcomeService.confirmRecovery({
      caseId,
      amountCapturedPaise: recCase.amountAtRisk,
      razorpayPaymentId: paymentReference || "pay_webhook_confirmed",
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "PAYMENT_CONFIRMED",
      actor: "RAZORPAY_GATEWAY",
      status: "success",
      description: `Razorpay confirmed payment capture for ₹${fromPaise(recCase.amountAtRisk).toLocaleString("en-IN")}.`,
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase.caseNumber,
      type: "REVENUE_RECOVERED",
      actor: "RECOVERY_ORCHESTRATOR",
      status: "success",
      description: `₹${fromPaise(recCase.amountAtRisk).toLocaleString("en-IN")} full capital recovered and committed to PostgreSQL.`,
      metadata: { recoveredAmount: fromPaise(recCase.amountAtRisk) },
    });

    return result;
  }

  /**
   * Stop recovery
   */
  public async stopRecovery(caseId: string, reason: string) {
    const recCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    if (!recCase) throw new Error(`Case ${caseId} not found`);

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      throw new Error(`Cannot stop case ${caseId}: Recovery case is already in terminal state '${recCase.status}'.`);
    }

    await stateMachineService.transition(caseId, RecoveryCaseStatus.STOPPED);
    await auditService.logEvent({
      caseId,
      actor: "OPERATIONS_MANAGER",
      eventType: "RECOVERY_STOPPED",
      description: `Recovery process stopped: ${reason}`,
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase?.caseNumber,
      type: "RECOVERY_STOPPED",
      actor: "OPERATIONS_MANAGER",
      status: "failed",
      description: `Recovery halted: ${reason}`,
    });

    return { success: true, message: "Recovery stopped." };
  }

  /**
   * Escalate recovery
   */
  public async escalateRecovery(caseId: string, reason: string) {
    const recCase = await prisma.recoveryCase.findUnique({ where: { id: caseId } });
    if (!recCase) throw new Error(`Case ${caseId} not found`);

    if (RecoveryStateMachine.isTerminal(recCase.status)) {
      throw new Error(`Cannot escalate case ${caseId}: Recovery case is already in terminal state '${recCase.status}'.`);
    }

    await stateMachineService.transition(caseId, RecoveryCaseStatus.ESCALATED);
    await auditService.logEvent({
      caseId,
      actor: "OPERATIONS_MANAGER",
      eventType: "RECOVERY_ESCALATED",
      description: `Recovery escalated: ${reason}`,
    });

    await eventService.publishEvent({
      caseId,
      caseNumber: recCase?.caseNumber,
      type: "RECOVERY_ESCALATED",
      actor: "OPERATIONS_MANAGER",
      status: "blocked",
      description: `Escalated to human supervisor: ${reason}`,
    });

    return { success: true, message: "Recovery escalated." };
  }

  /**
   * Get 12-step timeline for a recovery case
   */
  public async getTimeline(caseId: string) {
    return auditService.getCaseTimeline(caseId);
  }

  public async getPriorityQueue(limit: number = 20) {
    return prisma.recoveryCase.findMany({
      where: {
        status: { in: [RecoveryCaseStatus.NEW, RecoveryCaseStatus.ANALYZING, RecoveryCaseStatus.DIAGNOSED, RecoveryCaseStatus.ACTION_SELECTED, RecoveryCaseStatus.AWAITING_APPROVAL, RecoveryCaseStatus.EXECUTING, RecoveryCaseStatus.AWAITING_PAYMENT, RecoveryCaseStatus.IN_PROGRESS] },
      },
      orderBy: { expectedRecoveryValue: "desc" },
      take: limit,
      include: { customer: true, payment: true, recoveryAttempts: { take: 1, orderBy: { createdAt: "desc" } } },
    });
  }

  public async getRecoveryStats() {
    const [total, recovered, active, amounts] = await Promise.all([
      prisma.recoveryCase.count(),
      prisma.recoveryCase.count({ where: { status: RecoveryCaseStatus.RECOVERED } }),
      prisma.recoveryCase.count({
        where: {
          status: { in: [RecoveryCaseStatus.NEW, RecoveryCaseStatus.ANALYZING, RecoveryCaseStatus.DIAGNOSED, RecoveryCaseStatus.ACTION_SELECTED, RecoveryCaseStatus.AWAITING_APPROVAL, RecoveryCaseStatus.EXECUTING, RecoveryCaseStatus.AWAITING_PAYMENT, RecoveryCaseStatus.IN_PROGRESS] },
        },
      }),
      prisma.recoveryCase.aggregate({
        _sum: {
          amountAtRisk: true,
          recoveredAmount: true,
          expectedRecoveryValue: true,
        },
      }),
    ]);

    const totalAtRisk = amounts._sum.amountAtRisk || 0n;
    const totalRecovered = amounts._sum.recoveredAmount || 0n;
    const totalExpected = amounts._sum.expectedRecoveryValue || 0n;
    const rate = total > 0 ? Math.round((recovered / total) * 100) : 0;

    return {
      totalCases: total,
      recoveredCases: recovered,
      activeCases: active,
      autonomousRecoveryRate: rate,
      totalAtRiskPaise: totalAtRisk,
      totalAtRiskRupees: fromPaise(totalAtRisk),
      totalRecoveredPaise: totalRecovered,
      totalRecoveredRupees: fromPaise(totalRecovered),
      totalExpectedRecoveryPaise: totalExpected,
      totalExpectedRecoveryRupees: fromPaise(totalExpected),
    };
  }
}

export const recoveryOrchestrator = new RecoveryOrchestrator();
