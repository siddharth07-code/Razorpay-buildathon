import { prisma } from "../config/prisma";
import {
  RecoveryCaseStatus,
  RecoveryRiskLevel,
  CasePriority,
  RootCauseType,
  RecoveryAction,
  RecoveryStep,
  AttemptStatus,
} from "@prisma/client";

export class RecoveryRepository {
  public async findById(id: string) {
    return prisma.recoveryCase.findUnique({
      where: { id },
      include: {
        customer: true,
        payment: true,
        order: true,
        subscription: true,
        invoice: true,
        recoveryAttempts: { orderBy: { createdAt: "desc" } },
        agentDecisions: { orderBy: { createdAt: "desc" } },
        auditEvents: { orderBy: { timestamp: "desc" } },
        humanApprovals: { orderBy: { createdAt: "desc" } },
        notifications: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  public async findByCaseNumber(caseNumber: string) {
    return prisma.recoveryCase.findUnique({
      where: { caseNumber },
      include: {
        customer: true,
        payment: true,
        recoveryAttempts: true,
        agentDecisions: true,
        auditEvents: true,
      },
    });
  }

  public async listCases(params?: {
    status?: RecoveryCaseStatus;
    riskLevel?: RecoveryRiskLevel;
    priority?: CasePriority;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, riskLevel, priority, search, limit = 50, offset = 0 } = params || {};
    const where: any = {};

    if (status) where.status = status;
    if (riskLevel) where.riskLevel = riskLevel;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { caseNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { companyName: { contains: search, mode: "insensitive" } } },
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { razorpayPaymentId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.recoveryCase.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          payment: true,
          recoveryAttempts: { take: 3, orderBy: { createdAt: "desc" } },
          humanApprovals: { take: 1, orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.recoveryCase.count({ where }),
    ]);

    return { cases, total };
  }

  public async createCase(data: any) {
    return prisma.recoveryCase.create({
      data,
      include: {
        customer: true,
        payment: true,
      },
    });
  }

  public async recordAttempt(data: {
    recoveryCaseId: string;
    paymentId?: string;
    attemptNumber: number;
    action: RecoveryAction;
    status: AttemptStatus;
    razorpayReference?: string;
    amount: bigint;
    channel?: string;
    result?: any;
    notes?: string;
  }) {
    return prisma.recoveryAttempt.create({
      data,
    });
  }

  public async recordDecision(data: {
    recoveryCaseId: string;
    agent: string;
    decision: string;
    confidence: number;
    explanation: string;
    inputSnapshot: any;
  }) {
    return prisma.agentDecision.create({
      data,
    });
  }

  public async updateCaseStatus(
    id: string,
    status: RecoveryCaseStatus,
    extra?: {
      currentStep?: RecoveryStep;
      selectedAction?: RecoveryAction;
      recoveredAmount?: bigint;
      recoveredAt?: Date;
    }
  ) {
    return prisma.recoveryCase.update({
      where: { id },
      data: {
        status,
        currentStep: extra?.currentStep,
        selectedAction: extra?.selectedAction,
        recoveredAmount: extra?.recoveredAmount,
        recoveredAt: extra?.recoveredAt,
        updatedAt: new Date(),
      },
      include: { customer: true, payment: true },
    });
  }
}

export const recoveryRepository = new RecoveryRepository();
