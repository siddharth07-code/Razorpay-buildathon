import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "../../../../../backend/src/services/analytics.service";
import { serializeBigInt } from "../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as any) || "7d";
    const data = await analyticsService.getRevenueTrend(period);
    return NextResponse.json(serializeBigInt(data));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch revenue trend" }, { status: 500 });
  }
}
