import { NextRequest, NextResponse } from "next/server";
import { repository } from "@/lib/db/repository";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "INJECT_FAILURE") {
      const {
        customerName = "Ankit Roy",
        customerEmail = "ankit@nexuscorp.in",
        customerPhone = "+919876500000",
        companyName = "Nexus Corporation India",
        amount = 18999,
        method = "card",
        errorCode = "INSUFFICIENT_FUNDS",
      } = body;

      const result = repository.injectSimulatedFailure({
        customerName,
        customerEmail,
        customerPhone,
        companyName,
        amount: Number(amount),
        method,
        errorCode,
      });

      return NextResponse.json({
        success: true,
        message: `Injected simulated Razorpay failure (${errorCode}) for ₹${Number(amount).toLocaleString("en-IN")}. VIREON recovery case opened.`,
        ...result,
      });
    }

    if (action === "SIMULATE_RECOVERY") {
      const { caseId } = body;
      if (!caseId) {
        return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
      }

      const currentCase = repository.getRecoveryCaseById(caseId);
      if (!currentCase) {
        return NextResponse.json({ error: "Case not found" }, { status: 404 });
      }

      const updated = repository.markCaseRecovered(caseId, currentCase.amount);
      return NextResponse.json({
        success: true,
        message: `Simulated full recovery of ₹${currentCase.amount.toLocaleString("en-IN")}`,
        case: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Simulation error" }, { status: 500 });
  }
}
