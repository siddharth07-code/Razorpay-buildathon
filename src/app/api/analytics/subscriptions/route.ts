import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "../../../../../backend/src/services/analytics.service";
import { serializeBigInt } from "../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const periodDays = parseInt(searchParams.get("days") || "30", 10);

    const data = await analyticsService.getSubscriptionAnalytics(periodDays);
    return NextResponse.json(serializeBigInt({ success: true, data }));
  } catch (error: any) {
    console.error("[Analytics API] Subscriptions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch subscription analytics" },
      { status: 500 }
    );
  }
}
