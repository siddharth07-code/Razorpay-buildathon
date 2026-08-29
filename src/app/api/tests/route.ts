import { NextResponse } from "next/server";
import { runAllUnitTests } from "@/lib/testing/unit-tests";

export const dynamic = "force-dynamic";

export async function GET() {
  const testResults = await runAllUnitTests();
  return NextResponse.json(testResults);
}
