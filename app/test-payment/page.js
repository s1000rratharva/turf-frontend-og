"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function TestPayment() {
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Razorpay script is loaded
    const checkScript = () => {
      if (window.Razorpay) {
        setScriptLoaded(true);
        console.log("✅ Razorpay script loaded successfully");
      } else {
        console.log("❌ Razorpay script not loaded");
        setTimeout(checkScript, 1000);
      }
    };
    checkScript();
  }, []);

  const testPayment = async () => {
    console.log("🧪 Starting payment test...");
    console.log("Environment check:", {
      razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        ? "✅ Present"
        : "❌ Missing",
      scriptLoaded: scriptLoaded ? "✅ Loaded" : "❌ Not loaded",
    });

    if (!scriptLoaded) {
      toast.error("Razorpay script not loaded");
      return;
    }

    setLoading(true);

    try {
      console.log("📡 Creating order...");
      const res = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 100, // ₹100 for testing
          currency: "INR",
        }),
      });

      console.log("📡 Response status:", res.status);
      const data = await res.json();
      console.log("📡 Response data:", data);

      if (!res.ok) {
        throw new Error(data.error || "Failed to create order");
      }

      if (!data.id) {
        throw new Error("Order ID not received");
      }

      console.log("✅ Order created successfully:", data.id);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: 100 * 100, // ₹100 in paise
        currency: "INR",
        name: "GreenSpot Turf - Test",
        description: "Test Payment",
        order_id: data.id,
        theme: {
          color: "#10b981",
        },
        handler: function (response) {
          console.log("✅ Payment successful:", response);
          toast.success("Test payment successful!");
          setLoading(false);
        },
        modal: {
          ondismiss: function () {
            console.log("❌ Payment modal dismissed");
            toast("Payment cancelled");
            setLoading(false);
          },
        },
      };

      console.log("🚀 Opening Razorpay checkout...");
      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        console.error("❌ Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });

      rzp.open();
    } catch (error) {
      console.error("❌ Payment test error:", error);
      toast.error(`Test failed: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Payment Test
          </h1>

          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <span>Razorpay Script:</span>
              <span
                className={scriptLoaded ? "text-green-600" : "text-red-600"}
              >
                {scriptLoaded ? "✅ Loaded" : "❌ Not loaded"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>API Key:</span>
              <span
                className={
                  process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
                  ? "✅ Present"
                  : "❌ Missing"}
              </span>
            </div>
          </div>

          <button
            onClick={testPayment}
            disabled={loading || !scriptLoaded}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Testing..." : "Test Payment (₹100)"}
          </button>

          <p className="text-sm text-gray-500 mt-4 text-center">
            This will open Razorpay checkout for ₹100. Check browser console for
            detailed logs.
          </p>
        </div>
      </div>
    </div>
  );
}