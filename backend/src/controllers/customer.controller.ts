import { Request, Response } from "express";
import { customerRepository } from "../repositories/customer.repository";
import { serializeBigInt } from "../utils/money";

export async function getCustomers(req: Request, res: Response) {
  try {
    const { tier, search, limit, offset } = req.query;
    const result = await customerRepository.listAll({
      tier: tier as any,
      search: search as string,
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });
    res.json(serializeBigInt(result));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch customers" });
  }
}

export async function getCustomerById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const customer = await customerRepository.findById(id);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(serializeBigInt(customer));
  } catch (error: any) {
    res.status(500).json({ error: error?.message || "Failed to fetch customer" });
  }
}
