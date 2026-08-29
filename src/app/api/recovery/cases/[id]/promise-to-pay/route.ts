import { NextRequest, NextResponse } from "next/server";
import { receivablesService } from "../../../../../../../backend/src/services/receivables.service";
import { toPaise } from "../../../../../../../backend/src/utils/money";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const caseId = params.id;
    const body = await req.json();
    const { promiseDate, amountINR, notes } = body;

    if (!promiseDate) {
      return NextResponse.json({ error: "promiseDate is required" }, { status: 400 });
    }

    const amountPaise = amountINR ? toPaise(amountINR) : undefined;

    const result = await receivablesService.recordPromiseToPay(caseId, {
      promiseDate: new Date(promiseDate),
      amountPaise,
      notes,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error(`[POST /api/recovery/cases/${params.id}/promise-to-pay] Error:`, err);
    return NextResponse.json(
      { error: err.message || "Failed to record promise to pay" },
      { status: 500 }
    );
  }
}
