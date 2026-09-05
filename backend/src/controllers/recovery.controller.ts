import { Request, Response } from "express";
import { recoveryOrchestrator } from "../services/orchestrator.service";
import { recoveryRepository } from "../repositories/recovery.repository";
import { serializeBigInt } from "../utils/money";
import { z } from "zod";

export async function getRecoveryCases(req: Request, res: Response) {
  try {
    const { status, riskLevel, priority, search, limit, offset } = req.query;
    const result = await recoveryRepository.listCases({
      status: status as any,
      riskLevel: riskLevel as any,
      priority: priority as any,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch recovery cases" });
  }
}

export async function getRecoveryCaseById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const recCase = await recoveryRepository.findById(id);
    if (!recCase) {
      return res.status(404).json({ error: "Recovery case not found" });
    }
    res.json(serializeBigInt(recCase));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch recovery case" });
  }
}

export async function startRecoveryCase(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const analysis = await recoveryOrchestrator.analyzeCase(id);
    const strategy = await recoveryOrchestrator.selectRecoveryAction(id);
    const policy = await recoveryOrchestrator.validatePolicy(id);

    res.json(
      serializeBigInt({
        success: true,
        caseId: id,
        analysis,
        strategy,
        policy,
      })
    );
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to start recovery case workflow" });
  }
}

export async function analyzeRecoveryCase(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await recoveryOrchestrator.analyzeCase(id);
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to analyze case" });
  }
}

export async function selectCaseStrategy(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await recoveryOrchestrator.selectRecoveryAction(id);
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to select strategy" });
  }
}

export async function validateCasePolicy(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await recoveryOrchestrator.validatePolicy(id);
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to validate policy" });
  }
}

export async function executeRecoveryCase(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { actor } = req.body || {};
    // External callers cannot bypass policy checks; forceExecute is strictly reserved for authorized graph resumption
    const result = await recoveryOrchestrator.executeRecoveryAction(id, { forceExecute: false, actor });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to execute recovery action" });
  }
}

export async function stopRecoveryCase(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const result = await recoveryOrchestrator.stopRecovery(id, reason);
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to stop recovery case" });
  }
}

export async function escalateRecoveryCase(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const result = await recoveryOrchestrator.escalateRecovery(id, reason);
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to escalate recovery case" });
  }
}

export async function getCaseTimeline(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const timeline = await recoveryOrchestrator.getTimeline(id);
    res.json(serializeBigInt(timeline));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch timeline" });
  }
}

export async function getPriorityQueue(req: Request, res: Response) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const cases = await recoveryOrchestrator.getPriorityQueue(limit);
    res.json(serializeBigInt({ cases }));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch priority queue" });
  }
}

export async function getRecoveryStats(req: Request, res: Response) {
  try {
    const stats = await recoveryOrchestrator.getRecoveryStats();
    res.json(serializeBigInt(stats));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch recovery stats" });
  }
}
