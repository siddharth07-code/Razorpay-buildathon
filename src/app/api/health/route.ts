import { NextResponse } from "next/server";
import { appConfig } from "@/lib/config";
import { repository } from "@/lib/db/repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const metrics = repository.getMetrics();
  return NextResponse.json({
    status: "ok",
    service: "VIREON — Revenue Intelligence Infrastructure",
    mode: appConfig.razorpayMode,
    isSandbox: appConfig.isSandbox,
    currency: appConfig.merchant.currency,
    timestamp: new Date().toISOString(),
    stats: {
      activeCases: metrics.activeCasesCount,
      totalRecovered: metrics.totalRevenueRecovered,
    },
  });
}
