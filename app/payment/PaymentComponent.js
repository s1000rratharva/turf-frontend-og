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
    
    // Check if script is already loaded
    if (window.Razorpay) {
      console.log("Razorpay script already loaded");
      return resolve(true);
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      console.log("Razorpay script loaded successfully");
      resolve(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
      resolve(false);
    };
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
  const [backendStatus, setBackendStatus] = useState("checking");

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

  // Test backend connection on component mount
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        const backendURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await fetch(`${backendURL}/health`);
        if (response.ok) {
          setBackendStatus("connected");
          console.log("✅ Backend connection successful");
        } else {
          setBackendStatus("error");
          console.error("❌ Backend responded with error");
        }
      } catch (error) {
        setBackendStatus("error");
        console.error("❌ Backend connection failed:", error);
      }
    };

    testBackendConnection();
  }, []);

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
    
    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in to continue with payment");
      router.push("/login");
      return;
    }

    setIsProcessing(true);

    try {
      // Load Razorpay script
      toast.loading("Loading payment gateway...");
      const scriptLoaded = await loadRazorpayScript();
      
      if (!scriptLoaded) {
        toast.error("Payment gateway failed to load. Please refresh the page.");
        setIsProcessing(false);
        return;
      }

      // Check backend connection
      if (backendStatus !== "connected") {
        toast.error("Server connection issue. Please try again later.");
        setIsProcessing(false);
        return;
      }

      // Create order
      toast.loading("Creating payment order...");
      const backendURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

      console.log("Creating order with amount:", totalAmount);
      console.log("Backend URL:", backendURL);

      const orderResponse = await fetch(`${backendURL}/create-order`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          amount: totalAmount,
          currency: "INR"
        }),
      });

      console.log("Order response status:", orderResponse.status);

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("Order creation failed:", errorText);
        throw new Error(`Server error: ${orderResponse.status}`);
      }

      const orderData = await orderResponse.json();
      console.log("Order data received:", orderData);

      if (!orderData.id) {
        throw new Error("Order ID not received from server");
      }

      toast.dismiss();

      // Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount, // Use amount from backend
        currency: orderData.currency || "INR",
        order_id: orderData.id,
        name: "Turf Booking System",
        description: `Booking for ${activity} - ${slots.length} slot(s) on ${date}`,
        handler: async function (response) {
          try {
            console.log("Payment successful:", response);
            
            const paymentId = response.razorpay_payment_id;
            const orderId = response.razorpay_order_id;
            const signature = response.razorpay_signature;

            // Verify payment (you might want to add server-side verification)
            toast.loading("Confirming your booking...");

            const activityCollection = activity.toLowerCase() === "football" 
              ? "Football_Bookings" 
              : "Cricket_Bookings";

            // Create booking records
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
                signature,
                amountPaid: pricePerHour,
                totalAmount,
                slotsBooked: slots.length,
                activity: activity,
                status: "confirmed",
                timestamp: serverTimestamp(),
              });
            });

            await Promise.all(bookingPromises);
            toast.dismiss();

            // Send confirmation email (optional)
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
                  orderId,
                }),
              });
            } catch (emailError) {
              console.warn("Email sending failed:", emailError);
              // Don't show error to user - email is optional
            }

            toast.success("Booking confirmed! Redirecting...");
            setTimeout(() => router.push("/your-booking"), 2000);

          } catch (error) {
            console.error("Booking confirmation failed:", error);
            toast.error("Payment successful, but failed to save booking details.");
          }
        },
        prefill: {
          name: user.displayName || "Customer",
          email: user.email,
          contact: "" // You can add phone number collection
        },
        theme: {
          color: "#10b981",
          backdrop_color: "#1f2937",
        },
        modal: {
          ondismiss: function() {
            toast.error("Payment window closed");
            setIsProcessing(false);
          }
        }
      };

      console.log("Opening Razorpay checkout...");
      
      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        toast.error(`Payment failed: ${response.error.reason || response.error.description}`);
        setIsProcessing(false);
      });

      rzp.open();
      
    } catch (error) {
      console.error("Payment Error:", error);
      toast.dismiss();
      toast.error(error.message || "Payment processing failed. Please try again.");
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
            disabled={isProcessing}
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
          
          {/* Backend Status Indicator */}
          <div className="mt-2">
            {backendStatus === "checking" && (
              <div className="flex items-center text-yellow-600 text-sm">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-yellow-600 mr-2"></div>
                Checking server connection...
              </div>
            )}
            {backendStatus === "connected" && (
              <div className="flex items-center text-green-600 text-sm">
                <Check className="w-4 h-4 mr-1" />
                Server connected
              </div>
            )}
            {backendStatus === "error" && (
              <div className="flex items-center text-red-600 text-sm">
                <span className="mr-1">⚠️</span>
                Server connection issue
              </div>
            )}
          </div>
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
                  <div className="text-3xl font-bold text-gray-900 mt-1">
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
                disabled={isProcessing || backendStatus !== "connected"}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all relative overflow-hidden ${
                  isProcessing || backendStatus !== "connected"
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transform hover:scale-105"
                }`}
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                    Processing...
                  </div>
                ) : backendStatus !== "connected" ? (
                  "Server Connection Issue"
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
                <div className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>SSL encrypted</span>
                </div>
                <div className="flex items-start">
                  <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  <span>Multiple payment methods</span>
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