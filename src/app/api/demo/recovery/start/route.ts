import { NextRequest, NextResponse } from "next/server";
import { demoService } from "../../../../../../backend/src/services/demo.service";
import { serializeBigInt } from "../../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await demoService.startDemoRecovery({
      amountRupees: body.amount ? parseFloat(body.amount) : 25000,
      customerName: body.customerName,
    });
    return NextResponse.json(serializeBigInt(result));
  } catch (err: any) {
    console.error("[Next API demo/recovery/start]:", err);
    return NextResponse.json({ error: err?.message || "Failed to start demo recovery" }, { status: 500 });
  }
}
