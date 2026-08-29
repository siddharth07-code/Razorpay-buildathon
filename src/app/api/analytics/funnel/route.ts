import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "../../../../../backend/src/services/analytics.service";
import { serializeBigInt } from "../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const data = await analyticsService.getFunnel(days);
    return NextResponse.json(serializeBigInt(data));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch funnel" }, { status: 500 });
  }
}
