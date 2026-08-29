import { NextRequest, NextResponse } from "next/server";
import { langGraphOrchestrator } from "../../../../../../../backend/src/services/langgraph-orchestrator.service";
import { serializeBigInt } from "../../../../../../../backend/src/utils/money";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const state = await langGraphOrchestrator.getWorkflowState(params.id);
    return NextResponse.json(serializeBigInt(state));
  } catch (err: any) {
    console.error("[Next API recovery/cases/graph-state]:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch graph state" }, { status: 500 });
  }
}
