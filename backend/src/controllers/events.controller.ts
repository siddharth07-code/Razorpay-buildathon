import { Request, Response } from "express";
import { eventService } from "../services/event.service";

export function handleEventStream(req: Request, res: Response) {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const caseId = req.query.caseId as string | undefined;

  // Configure SSE Response Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // Register client with EventService
  eventService.addClient(clientId, res, caseId);

  // Clean up on disconnect
  req.on("close", () => {
    eventService.removeClient(clientId);
  });
}
