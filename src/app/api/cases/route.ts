import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db/repository";
import { prisma } from "../../../../backend/src/config/prisma";
import { fromPaise, serializeBigInt } from "../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ALL";
  const riskLevel = searchParams.get("riskLevel") || "ALL";
  const search = searchParams.get("search") || "";

  try {
    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (riskLevel !== "ALL") where.riskLevel = riskLevel;
    if (search) {
      where.OR = [
        { caseNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { companyName: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [dbCases, total] = await Promise.all([
      prisma.recoveryCase.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          customer: true,
          payment: true,
          recoveryAttempts: { take: 1, orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.recoveryCase.count({ where }),
    ]);

    if (dbCases.length > 0) {
      const adapted = dbCases.map((c: any) => ({
        id: c.id,
        caseNumber: c.caseNumber,
        customerId: c.customerId,
        paymentId: c.paymentId || undefined,
        amount: fromPaise(c.amountAtRisk),
        recoverableAmount: fromPaise(c.recoverableAmount),
        recoveredAmount: fromPaise(c.recoveredAmount),
        currency: c.currency,
        status: c.status,
        riskLevel: c.riskLevel,
        riskScore: c.riskScore,
        recoverabilityScore: c.recoverabilityScore,
        expectedRecoveryValue: fromPaise(c.expectedRecoveryValue),
        priority: c.priority,
        rootCause: c.rootCause,
        rootCauseDetails: c.rootCauseDetails,
        recommendedAction: c.recommendedAction,
        selectedAction: c.selectedAction || undefined,
        currentStep: c.currentStep,
        retryCount: c.retryCount,
        contactCount: c.contactCount,
        actionsTakenCount: c.actionsTakenCount,
        requiresHumanApproval: c.requiresHumanApproval,
        paymentLinkUrl: c.paymentLinkUrl || undefined,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        recoveredAt: c.recoveredAt?.toISOString(),
        customer: c.customer
          ? {
              ...c.customer,
              lifetimeValue: fromPaise(c.customer.lifetimeValue),
              recoveredAmount: fromPaise(c.customer.recoveredAmount),
              createdAt: c.customer.createdAt.toISOString(),
              updatedAt: c.customer.updatedAt.toISOString(),
            }
          : undefined,
        payment: c.payment
          ? {
              ...c.payment,
              amount: fromPaise(c.payment.amount),
              createdAt: c.payment.createdAt.toISOString(),
              updatedAt: c.payment.updatedAt.toISOString(),
            }
          : undefined,
      }));

      return NextResponse.json(serializeBigInt({ cases: adapted, total }));
    }
  } catch (err) {
    console.warn("[API /cases] PostgreSQL query fallback:", err);
  }

  const cases = repository.getRecoveryCases({
    status: status as any,
    riskLevel: riskLevel as any,
    search,
  });

  return NextResponse.json({
    cases,
    total: cases.length,
  });
}
