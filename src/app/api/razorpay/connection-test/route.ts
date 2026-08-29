import { NextResponse } from "next/server";
import { getRazorpayService } from "@/lib/razorpay/provider";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const razorpayService = await getRazorpayService();
    const result = await razorpayService.verifyConnection();

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ConnectionTest Error]:", error);
    return NextResponse.json(
      {
        connected: false,
        environment: "test",
        mode: "sandbox",
        message: `Connection probe error: ${error?.message || "Failed to reach Razorpay API"}`,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return POST();
}
