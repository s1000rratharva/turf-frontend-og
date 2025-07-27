// app/api/razorpay/route.js
import Razorpay from "razorpay";
import { NextRequest, NextResponse } from "next/server";

// Initialize Razorpay instance with your credentials
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Handle POST requests to create a Razorpay order
export async function POST(request) {
  try {
    // Parse the request body to get the amount
    const body = await request.json();
    const amount = body.amount; // Amount should be sent in the request body

    // Create a new order with Razorpay
    const order = await razorpay.orders.create({
      amount: amount * 100, // Convert amount to paise
      currency: "INR", // Currency should be in lowercase
      receipt: "receipt_" + Math.random().toString(36).substring(7), // Unique receipt ID
    });

    // Return the order ID in the response
    return NextResponse.json({ orderId: order.id }, { status: 200 });
  } catch (error) {
    console.error("Error Creating Order:", error); // Log the error for debugging
    return NextResponse.json(
      { error: "Error creating order" }, // Return error message
      { status: 500 } // Set HTTP status to 500 for server error
    );
  }
}
