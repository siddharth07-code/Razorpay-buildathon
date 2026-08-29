import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "../../../../../backend/src/services/analytics.service";
import { serializeBigInt } from "../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const data = await analyticsService.getRecoveryROI();
    return NextResponse.json(serializeBigInt(data));
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch ROI metrics" }, { status: 500 });
  }
}
