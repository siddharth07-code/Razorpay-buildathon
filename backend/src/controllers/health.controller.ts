import { Request, Response } from "express";
import { checkDatabaseConnection } from "../config/prisma";
import { config } from "../config";

export async function getHealth(req: Request, res: Response) {
  const dbHealth = await checkDatabaseConnection();

  res.json({
    status: "ok",
    database: dbHealth.connected ? "connected" : "fallback_mode",
    databaseLatencyMs: dbHealth.latencyMs,
    razorpay: config.razorpay.keyId ? "configured" : "mock_mode",
    environment: config.razorpay.environment,
    timestamp: new Date().toISOString(),
  });
}
