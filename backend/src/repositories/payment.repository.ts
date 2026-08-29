import { prisma } from "../config/prisma";
import { PaymentStatus, PaymentMethod } from "@prisma/client";

export interface CreatePaymentDTO {
  id?: string;
  customerId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  amount: bigint;
  currency?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  bank?: string;
  vpa?: string;
  errorCode?: string;
  errorDescription?: string;
  errorSource?: string;
  errorStep?: string;
  errorReason?: string;
}

export class PaymentRepository {
  public async findById(id: string) {
    return prisma.payment.findUnique({
      where: { id },
      include: {
        customer: true,
        recoveryCases: true,
      },
    });
  }

  public async findByRazorpayPaymentId(razorpayPaymentId: string) {
    return prisma.payment.findUnique({
      where: { razorpayPaymentId },
      include: { customer: true, recoveryCases: true },
    });
  }

  public async listAll(params?: { status?: PaymentStatus; customerId?: string; limit?: number; offset?: number }) {
    const { status, customerId, limit = 50, offset = 0 } = params || {};
    const where: any = {};
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: { customer: true },
      }),
      prisma.payment.count({ where }),
    ]);

    return { payments, total };
  }

  public async create(data: CreatePaymentDTO) {
    return prisma.payment.create({
      data: {
        id: data.id,
        customerId: data.customerId,
        razorpayPaymentId: data.razorpayPaymentId,
        razorpayOrderId: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency || "INR",
        status: data.status || "failed",
        method: data.method || "card",
        bank: data.bank,
        vpa: data.vpa,
        errorCode: data.errorCode,
        errorDescription: data.errorDescription,
        errorSource: data.errorSource,
        errorStep: data.errorStep,
        errorReason: data.errorReason,
        attempts: 1,
        lastAttemptAt: new Date(),
      },
      include: { customer: true },
    });
  }

  public async markCaptured(id: string, razorpayPaymentId?: string) {
    return prisma.payment.update({
      where: { id },
      data: {
        status: "captured",
        razorpayPaymentId: razorpayPaymentId || undefined,
        updatedAt: new Date(),
      },
    });
  }
}

export const paymentRepository = new PaymentRepository();
