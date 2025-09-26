import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";

// Debug environment variables
console.log("🔧 Razorpay Environment Check:", {
  keyId: process.env.RAZORPAY_KEY_ID ? "✅ Present" : "❌ Missing",
  keySecret: process.env.RAZORPAY_KEY_SECRET ? "✅ Present" : "❌ Missing",
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export async function POST(request) {
  try {
    const body = await request.json();
    const { amount, currency = "INR" } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert to paise
      currency: currency,
      receipt: "receipt_" + Math.random().toString(36).substring(7),
      notes: {
        booking_type: "turf_booking",
        created_at: new Date().toISOString(),
      },
    });

    console.log("Razorpay order created:", order.id);

    return NextResponse.json(
      {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error Creating Razorpay Order:", error);
    return NextResponse.json(
      {
        error: "Failed to create payment order",
        details: error.message,
      },
      { status: 500 }
    );
  }
}