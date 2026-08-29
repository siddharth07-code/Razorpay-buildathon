import { NextRequest, NextResponse } from "next/server";
import { analyticsService } from "../../../../../backend/src/services/analytics.service";
import { serializeBigInt } from "../../../../../backend/src/utils/money";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const data = await analyticsService.getCheckoutAnalytics(days);
    return NextResponse.json(serializeBigInt({ success: true, ...data }));
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
