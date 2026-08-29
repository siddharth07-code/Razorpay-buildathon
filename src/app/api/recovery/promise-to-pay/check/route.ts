import { NextRequest, NextResponse } from "next/server";
import { receivablesService } from "../../../../../../backend/src/services/receivables.service";

export async function POST(req: NextRequest) {
  try {
    const result = await receivablesService.evaluatePromiseToPayDeadlines();
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[POST /api/recovery/promise-to-pay/check] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check promise-to-pay deadlines" },
      { status: 500 }
    );
  }
}
