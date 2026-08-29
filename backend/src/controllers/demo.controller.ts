import { Request, Response } from "express";
import { demoService } from "../services/demo.service";
import { serializeBigInt } from "../utils/money";

export async function startDemoRecovery(req: Request, res: Response) {
  try {
    const { amount, customerName } = req.body || {};
    const result = await demoService.startDemoRecovery({
      amountRupees: amount ? parseFloat(amount) : 25000,
      customerName,
    });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    console.error("[DemoController Error]:", error);
    res.status(500).json({ error: error?.message || "Failed to start demo recovery scenario" });
  }
}

export async function resetDemoRecovery(req: Request, res: Response) {
  try {
    const result = await demoService.resetDemoRecovery();
    res.json(result);
  } catch (error: any) {
    console.error("[DemoController Reset Error]:", error);
    res.status(500).json({ error: error?.message || "Failed to reset demo recovery data" });
  }
}
