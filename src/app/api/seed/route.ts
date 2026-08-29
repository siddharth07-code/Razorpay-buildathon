import { NextResponse } from "next/server";
import { repository } from "@/lib/db/repository";

export async function POST() {
  repository.reset();
  return NextResponse.json({
    success: true,
    message: "VIREON sandbox demo data reset successfully to initial state.",
  });
}
