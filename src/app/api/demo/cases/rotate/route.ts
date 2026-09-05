import { NextRequest, NextResponse } from "next/server";
import { demoService } from "../../../../../../backend/src/services/demo.service";
import { prisma } from "../../../../../../backend/src/config/prisma";
import { RecoveryCaseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Run debounced lifecycle check
    await demoService.rotateDemoPortfolioLifecycle();

    const cooldownSeconds = parseInt(
      process.env.DEMO_RECOVERY_COOLDOWN_SECONDS || "180",
      10
    );

    const cases = await prisma.recoveryCase.findMany({
      where: { caseNumber: { startsWith: "REC-DEMO-" } },
      include: { customer: true },
      orderBy: { caseNumber: "asc" },
    });

    const now = Date.now();
    const formattedCases = cases.map((c) => {
      let cooldownRemainingSeconds = 0;
      if (c.status === RecoveryCaseStatus.RECOVERED && c.recoveredAt) {
        const elapsed = Math.floor((now - c.recoveredAt.getTime()) / 1000);
        cooldownRemainingSeconds = Math.max(0, cooldownSeconds - elapsed);
      }

      return {
        id: c.id,
        caseNumber: c.caseNumber,
        customerName: c.customer.name,
        amountRupees: Number(c.amountAtRisk) / 100,
        status: c.status,
        currentStep: c.currentStep,
        requiresHumanApproval: c.requiresHumanApproval,
        recoveredAmountRupees: Number(c.recoveredAmount) / 100,
        recoveredAt: c.recoveredAt,
        cooldownRemainingSeconds,
        isActionable: c.status !== RecoveryCaseStatus.RECOVERED,
        hasActiveRazorpayOrder: Boolean(c.razorpayOrderId),
      };
    });

    const activeHeroCase = await demoService.getActiveDemoRecoveryCase();

    return NextResponse.json({
      success: true,
      cooldownDurationSeconds: cooldownSeconds,
      activeHeroCase: activeHeroCase?.caseNumber,
      cases: formattedCases,
    });
  } catch (err: any) {
    console.error("[API demo/cases/rotate GET Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to inspect demo rotation status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Empty body allowed
    }

    const { force, caseNumber } = body;
    const result = await demoService.rotateDemoPortfolioLifecycle({
      force: Boolean(force),
      caseNumber: typeof caseNumber === "string" ? caseNumber : undefined,
    });

    const activeHeroCase = await demoService.getActiveDemoRecoveryCase();

    return NextResponse.json({
      ...result,
      activeHeroCase: activeHeroCase?.caseNumber,
    });
  } catch (err: any) {
    console.error("[API demo/cases/rotate POST Error]:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to trigger demo rotation" },
      { status: 500 }
    );
  }
}
