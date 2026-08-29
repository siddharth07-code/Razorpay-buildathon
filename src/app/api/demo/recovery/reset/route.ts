import { NextRequest, NextResponse } from "next/server";
import { demoService } from "../../../../../../backend/src/services/demo.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const result = await demoService.resetDemoRecovery();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[Next API demo/recovery/reset]:", err);
    return NextResponse.json({ error: err?.message || "Failed to reset demo recovery" }, { status: 500 });
  }
}
