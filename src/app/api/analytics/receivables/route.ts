import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "../../../../../backend/src/services/analytics.service";
import { serializeBigInt } from "../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    const analytics = await analyticsService.getReceivablesAnalytics(days);
    return NextResponse.json(serializeBigInt(analytics), { status: 200 });
  } catch (err: any) {
    console.error("[GET /api/analytics/receivables] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to retrieve B2B receivables analytics" },
      { status: 500 }
    );
  }
}
