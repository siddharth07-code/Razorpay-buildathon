import { prisma } from "../config/prisma";
import { CustomerTier, PaymentMethod } from "@prisma/client";

export interface CreateCustomerDTO {
  id?: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  tier?: CustomerTier;
  lifetimeValue?: bigint;
  preferredPaymentMethod?: PaymentMethod;
}

export class CustomerRepository {
  public async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
        payments: { orderBy: { createdAt: "desc" }, take: 10 },
        recoveryCases: { orderBy: { createdAt: "desc" }, take: 10 },
        subscriptions: true,
        invoices: true,
      },
    });
  }

  public async findByEmail(email: string) {
    return prisma.customer.findUnique({
      where: { email },
    });
  }

  public async listAll(params?: { tier?: CustomerTier; search?: string; limit?: number; offset?: number }) {
    const { tier, search, limit = 50, offset = 0 } = params || {};
    const where: any = {};

    if (tier) where.tier = tier;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { phone: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { recoveryCases: true, payments: true },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total };
  }

  public async upsertCustomer(data: CreateCustomerDTO) {
    return prisma.customer.upsert({
      where: { email: data.email },
      update: {
        name: data.name,
        phone: data.phone,
        companyName: data.companyName,
        tier: data.tier,
      },
      create: {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        companyName: data.companyName,
        tier: data.tier || "STARTER",
        lifetimeValue: data.lifetimeValue || 0n,
        preferredPaymentMethod: data.preferredPaymentMethod || "card",
      },
    });
  }

  public async incrementFailureCount(id: string) {
    return prisma.customer.update({
      where: { id },
      data: {
        failedPayments: { increment: 1 },
      },
    });
  }

  public async recordRecoverySuccess(id: string, amountPaise: bigint) {
    return prisma.customer.update({
      where: { id },
      data: {
        successfulPayments: { increment: 1 },
        recoveredAmount: { increment: amountPaise },
      },
    });
  }
}

export const customerRepository = new CustomerRepository();
