import { Request, Response } from "express";
import { webhookService } from "../services/webhook.service";

export async function handleRazorpayWebhook(req: Request, res: Response) {
  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    const signature = (req.headers["x-razorpay-signature"] as string) || "";

    const result = await webhookService.handleWebhook(rawBody, signature);
    res.json(result);
  } catch (error: any) {
    console.error("[Express Webhook Error]:", error);
    if (error?.message?.includes("Invalid signature")) {
      return res.status(401).json({ error: error.message });
    }
    res.status(500).json({ error: error?.message || "Failed to process webhook" });
  }
}
