import { NextRequest, NextResponse } from "next/server";
import { langGraphOrchestrator } from "../../../../../../../backend/src/services/langgraph-orchestrator.service";
import { serializeBigInt } from "../../../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await langGraphOrchestrator.resumeWorkflow(params.id, {
      approved: body.approved !== false,
      operator: body.operator || "OPERATIONS_MANAGER",
      reason: body.reason,
    });
    if (result && result.alreadyTerminal) {
      return NextResponse.json({
        error: "CASE_ALREADY_TERMINAL",
        status: result.status,
        message: result.message,
      }, { status: 409 });
    }
    return NextResponse.json(serializeBigInt(result));
  } catch (err: any) {
    console.error("[Next API recovery/cases/resume]:", err);
    return NextResponse.json({ error: err?.message || "Failed to resume recovery graph" }, { status: 500 });
  }
}
