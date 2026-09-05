import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db/repository";
import { prisma } from "../../../../backend/src/config/prisma";
import { fromPaise, serializeBigInt } from "../../../../backend/src/utils/money";
import { demoService } from "../../../../backend/src/services/demo.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseRangeToDays(range?: string | null): number {
  if (!range) return 0;
  if (range === "Today" || range === "24h") return 1;
  if (range === "Last 7 Days" || range === "7d") return 7;
  if (range === "Last 30 Days" || range === "30d") return 30;
  if (range === "Last 90 Days" || range === "90d") return 90;
  if (range.startsWith("Year to Date") || range === "YTD" || range === "ytd") {
    return Math.max(1, Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000));
  }
  if (range === "All Time" || range === "all") return 0;
  const num = parseInt(range, 10);
  return isNaN(num) ? 0 : num;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || "ALL";
  const riskLevel = searchParams.get("riskLevel") || "ALL";
  const search = searchParams.get("search") || "";
  const range = searchParams.get("range") || "";
  const days = parseRangeToDays(range);

  try {
    // Continuously rotate demo portfolio lifecycle (expired recovered cases rotate back to actionable states)
    await demoService.rotateDemoPortfolioLifecycle();

    const where: any = {};
    if (status !== "ALL") where.status = status;
    if (riskLevel !== "ALL") where.riskLevel = riskLevel;
    if (days && days > 0) {
      where.createdAt = { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }
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

  let cases = repository.getRecoveryCases({
    status: status as any,
    riskLevel: riskLevel as any,
    search,
  });

  if (days && days > 0) {
    const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const filtered = cases.filter((c: any) => (c.createdAt || c.updatedAt || "") >= threshold);
    if (filtered.length > 0) {
      cases = filtered;
    }
  }

  return NextResponse.json({
    cases,
    total: cases.length,
  });
}
