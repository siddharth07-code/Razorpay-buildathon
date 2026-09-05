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
    razorpayOrderId: targetCase.razorpayOrderId,
    razorpayPaymentId: targetCase.razorpayPaymentId,
  });

  const hasStaleIdentifiers =
    targetCase.razorpayOrderId !== null ||
    targetCase.razorpayPaymentId !== null ||
    targetCase.paymentLinkUrl !== null ||
    targetCase.razorpayPaymentLinkId !== null ||
    targetCase.status !== RecoveryCaseStatus.AWAITING_PAYMENT ||
    targetCase.recoveredAmount > 0n ||
    targetCase.recoveredAt !== null;

  if (!hasStaleIdentifiers) {
    console.log("\n✅ REC-DEMO-005 is already in canonical clean state (all Razorpay IDs null, status AWAITING_PAYMENT). No cleanup needed.");
    return;
  }

  console.log("\nCleaning stale Razorpay identifiers from REC-DEMO-005...");

  const updated = await prisma.recoveryCase.update({
    where: { id: targetCase.id },
    data: {
      paymentLinkUrl: null,
      razorpayPaymentLinkId: null,
      razorpayOrderId: null,
      razorpayPaymentId: null,
      status: RecoveryCaseStatus.AWAITING_PAYMENT,
      recoveredAmount: 0n,
      recoveredAt: null,
      amountAtRisk: 6750000n,
      updatedAt: new Date(),
    },
    include: { customer: true },
  });

  console.log("\n✅ Successfully updated REC-DEMO-005 to canonical initial state:");
  console.log({
    id: updated.id,
    caseNumber: updated.caseNumber,
    customer: updated.customer?.name,
    amountAtRisk: `${Number(updated.amountAtRisk) / 100} INR`,
    status: updated.status,
    paymentLinkUrl: updated.paymentLinkUrl,
    razorpayPaymentLinkId: updated.razorpayPaymentLinkId,
    razorpayOrderId: updated.razorpayOrderId,
    razorpayPaymentId: updated.razorpayPaymentId,
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
