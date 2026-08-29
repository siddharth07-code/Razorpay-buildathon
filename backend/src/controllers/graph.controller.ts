import { Request, Response } from "express";
import { langGraphOrchestrator } from "../services/langgraph-orchestrator.service";
import { serializeBigInt } from "../utils/money";

export async function runRecoveryGraph(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await langGraphOrchestrator.runRecoveryWorkflow(id);
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to run LangGraph recovery workflow" });
  }
}

export async function resumeRecoveryGraph(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { approved = true, operator = "OPERATIONS_MANAGER", reason } = req.body || {};
    const result = await langGraphOrchestrator.resumeWorkflow(id, { approved, operator, reason });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to resume LangGraph workflow" });
  }
}

export async function getRecoveryGraphState(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const state = await langGraphOrchestrator.getWorkflowState(id);
    res.json(serializeBigInt(state));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch LangGraph state" });
  }
}

export async function getRecoveryGraphTopology(req: Request, res: Response) {
  try {
    const topology = langGraphOrchestrator.getGraphTopology();
    res.json(topology);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch graph topology" });
  }
}
