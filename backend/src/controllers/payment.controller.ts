import { Request, Response } from "express";
import { paymentRepository } from "../repositories/payment.repository";
import { serializeBigInt } from "../utils/money";

export async function getPayments(req: Request, res: Response) {
  try {
    const { status, customerId, limit, offset } = req.query;
    const result = await paymentRepository.listAll({
      status: status as any,
      customerId: customerId as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch payments" });
  }
}

export async function getPaymentById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }
    res.json(serializeBigInt(payment));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch payment" });
  }
}
