"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function PaymentPage() {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);

try {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_LOCAL_API_URL;

const res = await fetch(`${apiUrl}/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: 500, // amount in rupees
      currency: "INR",
    }),
  });
      const data = await res.json();

      if (!data.id) {
        toast.error("Order creation failed!");
        setLoading(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: "SuperKick Turf",
        description: "Booking Payment",
        order_id: data.id,
        theme: {
          color: "#0d9488",
        },
        handler: function (response) {
          toast.success("Payment Successful!");
          console.log("Payment success:", response);
        },
        modal: {
          ondismiss: function () {
            toast("Payment popup closed!");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-lg rounded-2xl p-8 w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Complete Your Payment
        </h1>
        <p className="text-gray-600 mb-6">
          Book your slot securely with Razorpay.
        </p>

        <button
          onClick={handlePayment}
          disabled={loading}
          className="w-full bg-emerald-600 text-white py-3 px-6 rounded-xl font-semibold shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
        >
          {loading ? "Processing..." : "Pay ₹500"}
        </button>
      </div>
    </div>
  );
}
