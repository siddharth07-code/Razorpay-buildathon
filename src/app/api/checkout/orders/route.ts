import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../backend/src/config/prisma";
import { getRazorpayService } from "../../../../lib/razorpay/provider";
import { toPaise, fromPaise } from "../../../../../backend/src/utils/money";
import { eventService } from "../../../../../backend/src/services/event.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amountINR = Number(body.amountINR || body.amount || 1000);
    const amountPaise = body.amountPaise ? BigInt(body.amountPaise) : toPaise(amountINR);

    if (amountINR <= 0) {
      return NextResponse.json({ success: false, error: "Invalid order amount" }, { status: 400 });
    }

    const email = body.customerEmail || body.email || "checkout.customer@example.in";
    const name = body.customerName || body.name || "Checkout Customer";
    const phone = body.customerPhone || body.phone || "+919876543210";

    // 1. Find or create customer
    let customer = await prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email,
          name,
          phone,
          tier: amountINR >= 100000 ? "ENTERPRISE" : "STARTER",
        },
      });
    }

    // 2. Create Razorpay Order through provider
    const razorpay = await getRazorpayService();
    const receipt = `rcpt_chk_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    const rzpOrder = await razorpay.createOrder({
      amount: fromPaise(amountPaise),
      currency: "INR",
      receipt,
      notes: {
        customerId: customer.id,
        source: "recoverai_checkout",
      },
    });

    // 3. Persist Order in PostgreSQL
    const order = await prisma.order.create({
      data: {
        razorpayOrderId: rzpOrder.id,
        customerId: customer.id,
        amount: amountPaise,
        currency: "INR",
        status: "created",
        receipt: rzpOrder.receipt || receipt,
      },
    });

    // 4. Emit real-time event
    await eventService.publishEvent({
      type: "CHECKOUT_CREATED",
      actor: "CHECKOUT_APP",
      status: "success",
      description: `New checkout order created: ${rzpOrder.id} for ₹${amountINR.toLocaleString("en-IN")}.`,
      metadata: {
        orderId: order.id,
        razorpayOrderId: rzpOrder.id,
        amountPaise: Number(amountPaise),
        amountINR,
        customerEmail: email,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutSessionId: order.id,
      razorpayOrderId: rzpOrder.id,
      amountPaise: order.amount.toString(),
      amountINR: fromPaise(order.amount),
      status: order.status,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
