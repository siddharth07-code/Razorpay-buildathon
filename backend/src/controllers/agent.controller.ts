import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { runOrchestratorTestSuite } from "../tests";
import { serializeBigInt } from "../utils/money";

export async function getAgentStatus(req: Request, res: Response) {
  try {
    const [decisionsCount, activeCasesCount] = await Promise.all([
      prisma.agentDecision.count(),
      prisma.recoveryCase.count({
        where: {
          status: { in: ["NEW", "OPEN", "ANALYZING", "DIAGNOSED", "ACTION_SELECTED", "AWAITING_APPROVAL", "EXECUTING", "IN_PROGRESS", "AWAITING_PAYMENT"] },
        },
      }),
    ]);

    res.json({
      status: "OPERATIONAL",
      engine: "Deterministic Multi-Agent Engine + Heuristics + Policy Guardrails",
      activeCases: activeCasesCount,
      totalDecisionsLogged: decisionsCount,
      policyLimits: {
        maxPaymentRetries: 3,
        maxCustomerContacts: 3,
        minimumRetryIntervalHours: 12,
        humanApprovalThreshold: "₹1,00,000",
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch agent status" });
  }
}

export async function getAgentEvents(req: Request, res: Response) {
  try {
    const decisions = await prisma.agentDecision.findMany({
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        recoveryCase: {
          include: { customer: true },
        },
      },
    });

    res.json(serializeBigInt({ events: decisions }));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch agent decisions" });
  }
}

export async function runAgentTests(req: Request, res: Response) {
  try {
    const testResults = await runOrchestratorTestSuite();
    res.json(testResults);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to run orchestrator tests" });
  }
}
