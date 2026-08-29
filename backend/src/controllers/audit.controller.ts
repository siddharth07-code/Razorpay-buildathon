import { Request, Response } from "express";
import { auditRepository } from "../repositories/audit.repository";
import { serializeBigInt } from "../utils/money";

export async function getAuditEvents(req: Request, res: Response) {
  try {
    const { caseId, eventType, limit, offset } = req.query;
    const result = await auditRepository.listEvents({
      caseId: caseId as string,
      eventType: eventType as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch audit events" });
  }
}

export async function getAuditEventsByCaseId(req: Request, res: Response) {
  try {
    const { caseId } = req.params;
    const result = await auditRepository.listEvents({ caseId });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch case audit trail" });
  }
}
