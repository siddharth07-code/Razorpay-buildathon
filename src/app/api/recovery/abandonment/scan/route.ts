import { NextRequest, NextResponse } from "next/server";
import { abandonmentService } from "../../../../../../backend/src/services/abandonment.service";

export async function POST(req: NextRequest) {
  try {
    let windowMinutes: number | undefined;
    let limit: number | undefined;

    try {
      const body = await req.json();
      if (body.windowMinutes !== undefined) windowMinutes = Number(body.windowMinutes);
      if (body.limit !== undefined) limit = Number(body.limit);
    } catch {
      // Body may be empty
    }

    if (windowMinutes === undefined) {
      const { searchParams } = new URL(req.url);
      const queryWindow = searchParams.get("windowMinutes");
      if (queryWindow) windowMinutes = parseInt(queryWindow, 10);
    }

    const result = await abandonmentService.scanAndRecoverAbandonedCheckouts({
      windowMinutes,
      limit,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
