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
import { Check, Clock, Calendar, CreditCard, ArrowLeft } from "lucide-react";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const PaymentComponent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = getFirestore();

  const [activity, setActivity] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [pricePerHour] = useState(1500);
  const [isProcessing, setIsProcessing] = useState(false);

  const totalAmount = pricePerHour * slots.length;

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
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
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

      // CORRECTED LINE: Using NEXT_PUBLIC_API_URL instead of NEXT_PUBLIC_BACKEND_URL
      const backendURL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      const res = await fetch(`${backendURL}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: totalAmount }),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        console.error("Invalid JSON response:", text);
        throw new Error("Backend returned invalid response");
      }

      toast.dismiss();
      if (!data.id) throw new Error("Razorpay order creation failed");

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: totalAmount * 100,
        currency: "INR",
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

            try {
              await fetch("/api/send-confirmation", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to: user.email,
                  activity,
                  date,
                  slots,
                  totalAmount,
                  paymentId,
                }),
              });
            } catch (emailError) {
              console.warn("Email sending failed:", emailError);
            }

            toast.success("Booking Confirmed! Redirecting...");
            setTimeout(() => router.push("/your-booking"), 2000);
          } catch (err) {
            console.error("Booking save failed:", err);
            toast.error("Payment successful, but failed to save booking.");
          }
        },
        prefill: {
          email: auth.currentUser?.email || "",
          name: auth.currentUser?.displayName || "Customer",
        },
        theme: {
          color: "#10b981",
          backdrop_color: "#1f2937",
        },
        method: {
          netbanking: true,
          card: true,
          upi: true,
          wallet: false,
          emi: false,
          paylater: false,
        },
      });

      rzp.on("payment.failed", (response) => {
        toast.error(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });

      rzp.open();
      setIsProcessing(false);
    } catch (err) {
      console.error("Payment Error:", err);
      toast.dismiss();
      toast.error(err.message || "Something went wrong during payment.");
      setIsProcessing(false);
    }
  };

  if (!activity || !date || !slots.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking summary...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to selection
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Complete Your Booking
          </h1>
          <p className="text-gray-600 mt-2">
            Review your selection and proceed to payment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking Summary Card */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Check className="w-6 h-6 text-green-600 mr-2" />
                Booking Summary
              </h2>

              {/* Activity & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <div
                      className={`w-3 h-3 rounded-full mr-2 ${
                        activity.toLowerCase() === "football"
                          ? "bg-blue-500"
                          : "bg-orange-500"
                      }`}
                    ></div>
                    <span className="text-sm font-medium text-gray-500">
                      Activity
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {activity}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center mb-2">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-500">
                      Date
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDisplayDate(date)}
                  </p>
                </div>
              </div>

              {/* Selected Slots */}
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <Clock className="w-5 h-5 text-gray-400 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Selected Time Slots
                  </h3>
                  <span className="ml-2 bg-green-100 text-green-800 text-sm px-2 py-1 rounded-full">
                    {slots.length} slot{slots.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {slots.map((slot, index) => (
                    <div
                      key={index}
                      className="bg-green-50 border border-green-200 rounded-lg p-3 text-center"
                    >
                      <div className="text-sm font-medium text-green-900">
                        {slot} - {getEndTime(slot)}
                      </div>
                      <div className="text-xs text-green-600 mt-1">1 hour</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Price Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Price per hour</span>
                    <span className="font-medium">₹{pricePerHour}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Number of slots</span>
                    <span className="font-medium">{slots.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-semibold text-gray-900 pt-3 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span>₹{totalAmount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <CreditCard className="w-6 h-6 text-green-600 mr-2" />
                Payment Details
              </h2>

              {/* Total Amount Highlight */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                <div className="text-center">
                  <div className="text-sm text-green-600 font-medium">
                    Total Amount
                  </div>
                  <div className="text-3xl font-bold text-black-900 mt-1">
                    ₹{totalAmount}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {slots.length} hour{slots.length > 1 ? "s" : ""} × ₹
                    {pricePerHour}
                  </div>
                </div>
              </div>

              {/* Payment Button */}
              <button
                onClick={handlePayment}
                disabled={isProcessing}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all relative overflow-hidden ${
                  isProcessing
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-600 hover:from-green-700 hover:to-green-700 shadow-lg hover:shadow-xl"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Pay ₹{totalAmount}
                  </div>
                )}
              </button>

              {/* Security Note */}
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center text-xs text-gray-500">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Secure payment powered by Razorpay
                </div>
              </div>

              {/* Additional Info */}
              <div className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Instant confirmation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentComponent;
