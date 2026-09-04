import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db/repository";
import { dashboardService } from "../../../../backend/src/services/dashboard.service";
import { serializeBigInt } from "../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseRangeToDays(range?: string | null): number {
  if (!range) return 30;
  if (range === "Today" || range === "24h") return 1;
  if (range === "Last 7 Days" || range === "7d") return 7;
  if (range === "Last 30 Days" || range === "30d") return 30;
  if (range === "Last 90 Days" || range === "90d") return 90;
  if (range.startsWith("Year to Date") || range === "YTD" || range === "ytd") {
    return Math.max(1, Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 86400000));
  }
  if (range === "All Time" || range === "all") return 0;
  const num = parseInt(range, 10);
  return isNaN(num) ? 30 : num;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get("range");
  const days = parseRangeToDays(range);

  try {
    const metrics = await dashboardService.getSummaryMetrics(days);
    return NextResponse.json(serializeBigInt(metrics), {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    console.warn("[API /metrics] PostgreSQL metric fallback:", err);
    const fallback = repository.getMetrics(days);
    return NextResponse.json(fallback);
  }
}
