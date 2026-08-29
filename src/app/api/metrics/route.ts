import { NextResponse } from "next/server";
import { repository } from "@/lib/db/repository";
import { dashboardService } from "../../../../backend/src/services/dashboard.service";
import { serializeBigInt } from "../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const metrics = await dashboardService.getSummaryMetrics();
    return NextResponse.json(serializeBigInt(metrics), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.warn("[API /metrics] PostgreSQL metric fallback:", err);
    const fallback = repository.getMetrics();
    return NextResponse.json(fallback);
  }
}
