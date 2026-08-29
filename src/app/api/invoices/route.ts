import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../backend/src/config/prisma";
import { toPaise, serializeBigInt } from "../../../../backend/src/utils/money";
import { CustomerTier, PaymentMethod } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      amountINR,
      customerEmail,
      customerName,
      customerPhone = "+919876543210",
      dueDate,
      companyName,
      tier = "ENTERPRISE",
      notes,
    } = body;

    if (!amountINR || amountINR <= 0) {
      return NextResponse.json({ error: "Valid amountINR is required" }, { status: 400 });
    }

    if (!customerEmail) {
      return NextResponse.json({ error: "customerEmail is required" }, { status: 400 });
    }

    const amountPaise = toPaise(amountINR);

    // Find or create customer
    const customer = await prisma.customer.upsert({
      where: { email: customerEmail },
      update: {
        name: customerName || undefined,
        phone: customerPhone,
        companyName: companyName || customerName || undefined,
        tier: (tier as CustomerTier) || CustomerTier.ENTERPRISE,
      },
      create: {
        email: customerEmail,
        name: customerName || "Enterprise Client",
        phone: customerPhone,
        companyName: companyName || customerName || "Enterprise Corp",
        tier: (tier as CustomerTier) || CustomerTier.ENTERPRISE,
        lifetimeValue: amountPaise * 5n,
        preferredPaymentMethod: PaymentMethod.netbanking,
      },
    });

    const parsedDueDate = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const razorpayInvoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const invoice = await prisma.invoice.create({
      data: {
        razorpayInvoiceId,
        customerId: customer.id,
        amount: amountPaise,
        currency: "INR",
        status: parsedDueDate < new Date() ? "overdue" : "issued",
        dueDate: parsedDueDate,
      },
    });

    return NextResponse.json(
      serializeBigInt({
        success: true,
        invoice: {
          id: invoice.id,
          razorpayInvoiceId: invoice.razorpayInvoiceId,
          amountINR,
          amountPaise,
          currency: invoice.currency,
          status: invoice.status,
          dueDate: invoice.dueDate?.toISOString(),
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email,
            companyName: customer.companyName,
            tier: customer.tier,
          },
        },
      }),
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[POST /api/invoices] Error creating invoice:", err);
    return NextResponse.json({ error: err.message || "Failed to create invoice" }, { status: 500 });
  }
}
