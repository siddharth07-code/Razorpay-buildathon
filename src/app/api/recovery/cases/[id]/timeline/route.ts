import { NextRequest, NextResponse } from "next/server";
import { auditService } from "../../../../../../../backend/src/services/audit.service";
import { serializeBigInt } from "../../../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const timeline = await auditService.getCaseTimeline(params.id);
    return NextResponse.json(serializeBigInt(timeline));
  } catch (err: any) {
    console.error("[Next API recovery/cases/id/timeline]:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch timeline" }, { status: 404 });
  }
}
