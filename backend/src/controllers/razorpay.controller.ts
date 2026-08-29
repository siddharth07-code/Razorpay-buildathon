import { Request, Response } from "express";
import { getRazorpayService } from "../../../src/lib/razorpay/provider";
import { config } from "../config";

export async function getRazorpayStatus(req: Request, res: Response) {
  const maskedKeyId =
    config.razorpay.keyId.length > 8
      ? config.razorpay.keyId.substring(0, 8) + "••••••••"
      : "rzp_test_••••••••";

  res.json({
    provider: "Razorpay",
    environment: config.razorpay.environment,
    mode: config.razorpay.mode,
    maskedKeyId,
    configured: Boolean(config.razorpay.keyId),
  });
}

export async function testConnection(req: Request, res: Response) {
  try {
    const razorpayService = await getRazorpayService();
    const result = await razorpayService.verifyConnection();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      connected: false,
      environment: "test",
      mode: "sandbox",
      message: `Connection test failed: ${error?.message}`,
    });
  }
}
