import { NextResponse } from "next/server";
import { langGraphOrchestrator } from "../../../../../backend/src/services/langgraph-orchestrator.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const topology = langGraphOrchestrator.getGraphTopology();
    return NextResponse.json(topology);
  } catch (err: any) {
    console.error("[Next API recovery/graph]:", err);
    return NextResponse.json({ error: err?.message || "Failed to fetch graph topology" }, { status: 500 });
  }
}
