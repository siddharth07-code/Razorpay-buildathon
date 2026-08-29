import { NextRequest, NextResponse } from "next/server";
import { getRazorpayService } from "@/lib/razorpay/provider";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { amount, caseId, customerEmail, customerPhone } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valid amount in INR is required" }, { status: 400 });
    }

    const razorpayService = await getRazorpayService();
    const order = await razorpayService.createOrder({
      amount,
      receipt: `rcpt_${caseId || Date.now()}`,
      notes: {
        caseId: caseId || "direct_checkout",
        customerEmail: customerEmail || "",
        customerPhone: customerPhone || "",
      },
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    console.error("[Create Order Error]:", error);
    return NextResponse.json({ error: error?.message || "Failed to create Razorpay Order" }, { status: 500 });
  }
}
