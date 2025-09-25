"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  collection,
  addDoc,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";
import { auth } from "../firebase";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const PaymentComponent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activity, setActivity] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [pricePerHour] = useState(1500);
  const [isProcessing, setIsProcessing] = useState(false);
  const totalAmount = pricePerHour * slots.length;
  const db = getFirestore();

  useEffect(() => {
    const activityParam = searchParams.get("activity") || "";
    const dateParam = searchParams.get("date") || "";
    const slotString = searchParams.get("slots") || "";
    const slotArray = slotString.split(",").filter(Boolean);

    setActivity(activityParam);
    setDate(dateParam);
    setSlots(slotArray);
  }, [searchParams]);

  const getEndTime = (slot) => {
    const [hour] = slot.split(":").map(Number);
    return isNaN(hour) ? "--:--" : `${String(hour + 1).padStart(2, "0")}:00`;
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePayment = async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    const resScript = await loadRazorpayScript();
    
    if (!resScript) {
      toast.error("Razorpay SDK failed to load.");
      setIsProcessing(false);
      return;
    }

    try {
      toast.loading("Creating Razorpay Order...");

      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL + "/create-order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: totalAmount }),
        }
      );

      const data = await res.json();
      toast.dismiss();

      if (!data.id) throw new Error("Razorpay order creation failed");

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_hD5vT64kNs5EFN",
        amount: totalAmount * 100,
        currency: "INR",
        name: "SuperKick Turf",
        description: `Booking for ${activity}`,
        order_id: data.id,
        handler: async (response) => {
          try {
            const user = auth.currentUser;
            if (!user) throw new Error("User not logged in");

            const paymentId = response.razorpay_payment_id;
            const orderId = response.razorpay_order_id;

            const activityCollection =
              activity.toLowerCase() === "football"
                ? "Football_Bookings"
                : "Cricket_Bookings";

            // Create all bookings
            const bookingPromises = slots.map(async (slot) => {
              const [hour] = slot.split(":").map(Number);
              const endTime = `${String(hour + 1).padStart(2, "0")}:00`;

              return addDoc(collection(db, activityCollection), {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || "Customer",
                date,
                startTime: slot,
                endTime,
                paymentId,
                orderId,
                amountPaid: pricePerHour,
                totalAmount,
                slotsBooked: slots.length,
                status: "confirmed",
                timestamp: serverTimestamp(),
              });
            });

            await Promise.all(bookingPromises);

            // Send confirmation email
            try {
              await fetch("/api/send-confirmation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: user.email,
                  activity,
                  date,
                  slots: slots,
                  totalAmount,
                  paymentId,
                }),
              });
            } catch (emailError) {
              console.warn("Failed to send confirmation email:", emailError);
            }

            toast.success("Booking Confirmed! Redirecting...");
            setTimeout(() => {
              router.push("/your-booking");
            }, 2000);
          } catch (err) {
            console.error("Booking save failed:", err);
            toast.error("Payment successful, but failed to save booking details.");
          }
        },
        prefill: {
          email: auth.currentUser?.email || "",
          name: auth.currentUser?.displayName || "Customer",
        },
        theme: { 
          color: "#10b981",
          backdrop_color: "#1f2937"
        },
        method: {
          netbanking: true,
          upi: true,
          card: true,
          wallet: true,
          emi: false,
          paylater: false,
        },
        notes: {
          activity: activity,
          date: date,
          slots: slots.join(", "),
        },
      });

      rzp.on('payment.failed', function (response) {
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });

      rzp.open();
      setIsProcessing(false);
    } catch (err) {
      console.error("Payment Error:", err);
      toast.dismiss();
      toast.error("Something went wrong during payment processing.");
      setIsProcessing(false);
    }
  };

  if (!activity || !date || !slots.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Complete Your Booking
          </h1>
          <p className="text-gray-600">Review your details and proceed to secure payment</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Booking Summary</h2>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-medium text-gray-500">Activity</label>
                    <p className="text-lg font-semibold text-gray-900 capitalize">{activity}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <label className="text-sm font-medium text-gray-500">Date</label>
                    <p className="text-lg font-semibold text-gray-900">{formatDisplayDate(date)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <label className="text-sm font-medium text-gray-500 mb-3 block">Selected Time Slots</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {slots.map((slot, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 text-center border border-green-200">
                        <span className="font-semibold text-green-700">{slot} - {getEndTime(slot)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 sticky top-8">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Price per hour</span>
                  <span className="font-semibold">₹{pricePerHour}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total hours</span>
                  <span className="font-semibold">{slots.length}</span>
                </div>
                <div className="border-t pt-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Total Amount</span>
                    <span className="text-2xl font-bold text-green-600">₹{totalAmount}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all ${
                  isProcessing
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Pay ₹${totalAmount}`
                )}
              </button>

              {/* Security Badge */}
              <div className="mt-6 text-center">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Secure payment powered by Razorpay</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Secure Payment</h3>
            <p className="text-sm text-gray-600">Your payment information is encrypted and secure</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Instant Confirmation</h3>
            <p className="text-sm text-gray-600">Receive immediate booking confirmation</p>
          </div>
          
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Easy Refund</h3>
            <p className="text-sm text-gray-600">Cancel up to 24 hours before for full refund</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentComponent;