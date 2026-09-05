import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const caseId = searchParams.get("caseId") || "";
  const apiBase = process.env.BACKEND_URL || process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
  const backendUrl = `${apiBase.replace(/\/+$/, "")}/api/events/stream${caseId ? `?caseId=${caseId}` : ""}`;

  try {
    const backendRes = await fetch(backendUrl, {
      headers: {
        Accept: "text/event-stream",
      },
      cache: "no-store",
    });

    if (!backendRes.ok || !backendRes.body) {
      return new Response("Failed to connect to backend event stream", { status: 502 });
    }

    return new Response(backendRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    // If Express backend is offline, return synthetic SSE keep-alive to prevent client crashing
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const initData = JSON.stringify({
          id: "evt_fallback",
          type: "HEARTBEAT",
          actor: "NEXTJS_GATEWAY",
          timestamp: new Date().toISOString(),
          status: "waiting",
          description: "Awaiting backend orchestrator event stream connection...",
        });
        controller.enqueue(encoder.encode(`data: ${initData}\n\n`));
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }
}
