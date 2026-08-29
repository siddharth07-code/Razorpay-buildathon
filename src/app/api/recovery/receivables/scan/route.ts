import { NextRequest, NextResponse } from "next/server";
import { receivablesService } from "../../../../../../backend/src/services/receivables.service";
import { serializeBigInt } from "../../../../../../backend/src/utils/money";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { daysOverdueThreshold = 0, limit = 50 } = body;

    const result = await receivablesService.scanAndRecoverOverdueInvoices({
      daysOverdueThreshold: Number(daysOverdueThreshold),
      limit: Number(limit),
    });

    return NextResponse.json(serializeBigInt(result), { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/recovery/receivables/scan] Scan error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scan overdue receivables" },
      { status: 500 }
    );
  }
}
