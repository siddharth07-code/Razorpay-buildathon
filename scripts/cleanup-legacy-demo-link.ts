/**
 * VIREON - Safe One-Time Cleanup for Canonical Demo Hero Case REC-DEMO-005
 *
 * This script safely clears the known fake legacy Razorpay URL from REC-DEMO-005:
 * - Only targets caseNumber: "REC-DEMO-005"
 * - Clears known fake URL: "https://rzp.io/i/orionmedia_vireon"
 * - Sets paymentLinkUrl = null
 * - Sets razorpayPaymentLinkId = null
 * - Ensures canonical initial status = AWAITING_PAYMENT (₹67,500 at risk)
 * - Does NOT delete payment records
 * - Does NOT delete audit events
 * - Does NOT delete recovery attempts
 * - Does NOT modify unrelated cases
 * - Does NOT destroy real Razorpay records
 *
 * Usage:
 *   npx tsx scripts/cleanup-legacy-demo-link.ts
 */

import { PrismaClient, RecoveryCaseStatus } from "@prisma/client";

const prisma = new PrismaClient();

const KNOWN_FAKE_URLS = [
  "https://rzp.io/i/orionmedia_vireon",
  "orionmedia_vireon",
];

async function main() {
  console.log("==================================================");
  console.log("VIREON — CANONICAL DEMO HERO CASE CLEANUP");
  console.log("Target: REC-DEMO-005 (Orion Media)");
  console.log("==================================================");

  const targetCase = await prisma.recoveryCase.findUnique({
    where: { caseNumber: "REC-DEMO-005" },
    include: { customer: true, payment: true },
  });

  if (!targetCase) {
    console.log("⚠️ REC-DEMO-005 not found in current database. No action taken.");
    return;
  }

  console.log("Current Case State:");
  console.log({
    id: targetCase.id,
    caseNumber: targetCase.caseNumber,
    customer: targetCase.customer?.name,
    amountAtRisk: `${Number(targetCase.amountAtRisk) / 100} INR`,
    status: targetCase.status,
    currentStep: targetCase.currentStep,
    paymentLinkUrl: targetCase.paymentLinkUrl,
    razorpayPaymentLinkId: targetCase.razorpayPaymentLinkId,
  });

  const isFakeUrl =
    targetCase.paymentLinkUrl &&
    KNOWN_FAKE_URLS.some((fake) => targetCase.paymentLinkUrl?.includes(fake));

  if (!isFakeUrl && targetCase.paymentLinkUrl === null) {
    console.log("\n✅ REC-DEMO-005 already has paymentLinkUrl = null. No cleanup needed.");
    return;
  }

  if (targetCase.paymentLinkUrl && targetCase.paymentLinkUrl.startsWith("https://rzp.io/rzp/")) {
    console.log(
      `\nℹ️ REC-DEMO-005 currently has a REAL Razorpay-generated payment link: ${targetCase.paymentLinkUrl}`
    );
    console.log("Preserving real Razorpay record. If you wish to reset it to null for demo re-run,");
    console.log("pass --force as a CLI argument.");
    if (!process.argv.includes("--force")) {
      return;
    }
  }

  console.log("\nCleaning legacy placeholder link from REC-DEMO-005...");

  const updated = await prisma.recoveryCase.update({
    where: { id: targetCase.id },
    data: {
      paymentLinkUrl: null,
      razorpayPaymentLinkId: null,
      status: RecoveryCaseStatus.AWAITING_PAYMENT,
      recoveredAmount: 0n,
      recoveredAt: null,
      updatedAt: new Date(),
    },
    include: { customer: true },
  });

  console.log("\n✅ Successfully updated REC-DEMO-005:");
  console.log({
    id: updated.id,
    caseNumber: updated.caseNumber,
    customer: updated.customer?.name,
    status: updated.status,
    paymentLinkUrl: updated.paymentLinkUrl,
    razorpayPaymentLinkId: updated.razorpayPaymentLinkId,
  });
  console.log("\nAudit events and payment history preserved intact.");
}

main()
  .catch((err) => {
    console.error("Cleanup failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
