"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import {
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  ArrowLeft,
  CheckCircle,
} from "lucide-react";

// Helper function to calculate the end time for a given slot array.
// If given ["10:00"], it returns "11:00". If given ["10:00", "11:00"], it returns "12:00".
const getEndTime = (slots) => {
  if (!slots || slots.length === 0) return "";
  const lastSlot = slots[slots.length - 1];
  const [hour] = lastSlot.split(":");
  const endHour = parseInt(hour) + 1;
  return `${String(endHour).padStart(2, "0")}:00`;
};

export default function PaymentComponent() {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [bookingDetails, setBookingDetails] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Load Razorpay script
    const loadRazorpayScript = () => {
      return new Promise((resolve) => {
        if (window.Razorpay) {
          setScriptLoaded(true);
          resolve(true);
          return;
        }

        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => {
          setScriptLoaded(true);
          resolve(true);
        };
        script.onerror = () => {
          toast.error("Failed to load payment gateway");
          resolve(false);
        };
        document.body.appendChild(script);
      });
    };

    loadRazorpayScript();

    // Get booking details from URL params
    const activity = searchParams.get("activity");
    const date = searchParams.get("date");
    const slots = searchParams.get("slots");

    if (!activity || !date || !slots) {
      toast.error("Invalid booking details");
      router.push("/book");
      return;
    }

    const slotsArray = slots.split(",");
    const amount = slotsArray.length * 1500; // ₹1500 per slot

    setBookingDetails({
      activity,
      date,
      slots: slotsArray,
      amount,
      slotsCount: slotsArray.length,
    });

    // Check authentication
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        toast.error("Please login to continue");
        router.push("/login");
        return;
      }
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [searchParams, router]);

  // Save booking with complete slot information
  const saveBookingToFirebase = async (paymentDetails) => {
    if (!user || !bookingDetails) return;

    try {
      const bookingData = {
        userId: user.uid,
        userEmail: user.email,
        activity: bookingDetails.activity,
        date: bookingDetails.date,
        selectedSlots: bookingDetails.slots, // Store the actual slots array
        startTime: bookingDetails.slots[0], // First slot as start time
        endTime: getEndTime(bookingDetails.slots), // Calculate end time
        slotsBooked: bookingDetails.slotsCount,
        amountPaid: bookingDetails.amount,
        paymentId: paymentDetails.razorpay_payment_id,
        orderId: paymentDetails.razorpay_order_id,
        signature: paymentDetails.razorpay_signature,
        bookingTime: new Date(),
        status: "confirmed",
      };

      // The collection name now dynamically includes the activity
      const collectionName = `${bookingDetails.activity}_Bookings`;
      await addDoc(collection(db, collectionName), bookingData);

      toast.success(
        "Booking confirmed successfully! You can view the full slot list in your bookings."
      );
      router.push("/your-booking");
    } catch (error) {
      console.error("Error saving booking:", error);
      toast.error(
        "Payment successful but booking save failed. Please contact support."
      );
    }
  };

  const handlePayment = async () => {
    if (!scriptLoaded) {
      toast.error("Payment gateway not loaded. Please refresh and try again.");
      return;
    }

    if (!bookingDetails) {
      toast.error("Booking details not found");
      return;
    }

    setLoading(true);

    try {
      // Create Razorpay order
      const res = await fetch("/api/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: bookingDetails.amount,
          currency: "INR",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create order");
      }

      const orderData = await res.json();

      if (!orderData.id) {
        throw new Error("Invalid order response");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: bookingDetails.amount * 100, // Convert to paise
        currency: "INR",
        name: "GreenSpot Turf",
        description: `${bookingDetails.activity} Booking - ${bookingDetails.date}`,
        order_id: orderData.id,
        prefill: {
          name: user?.displayName || user?.email?.split("@")[0] || "",
          email: user?.email || "",
        },
        theme: {
          color: "#10b981",
        },

        config: {
          display: {
            hide: [
              { method: "paylater" },
              { method: "wallet" },
              { method: "emi" },
            ],
          },
        },

        handler: async function (response) {
          setLoading(true);
          // Pass payment details to the save function
          await saveBookingToFirebase(response);
          setLoading(false);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        setLoading(false);
        console.error("Payment failed:", response.error);
        toast.error(`Payment failed: ${response.error.description}`);
      });

      rzp.open();
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Payment initialization failed. Please try again.");
      setLoading(false);
    }
  };

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Complete Payment
          </h1>
        </div>

        <div className="grid gap-6">
          {/* Booking Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
              Booking Summary
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">Activity</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {bookingDetails.activity}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">Date</span>
                </div>
                <span className="font-semibold text-gray-900">
                  {new Date(bookingDetails.date).toLocaleDateString("en-IN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* *** MODIFICATION HERE: Displaying all selected slots individually *** */}
              <div className="flex justify-between py-3 border-b border-gray-100 items-start">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-gray-400 mr-3 mt-1" />
                  <span className="text-gray-600">Time Slots</span>
                </div>
                <div className="text-right flex flex-col items-end">
                  {/* List all selected slots */}
                  {bookingDetails.slots.map((slot, index) => (
                    <div key={index} className="font-semibold text-gray-900">
                      {slot} - {getEndTime([slot])}
                    </div>
                  ))}
                  {/* Show the total count */}
                  <div className="text-sm text-gray-500 mt-2">
                    Total: {bookingDetails.slotsCount} hour
                    {bookingDetails.slotsCount > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              {/* *** END OF MODIFICATION *** */}

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-600">Total Amount</span>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ₹{bookingDetails.amount}
                  </div>
                  <div className="text-sm text-gray-500">
                    ₹1500 × {bookingDetails.slotsCount} slot
                    {bookingDetails.slotsCount > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Payment Details
            </h2>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-blue-900">Secure Payment</p>
                    <p className="text-sm text-blue-700">
                      Your payment is secured by Razorpay with 256-bit SSL
                      encryption
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayment}
                disabled={loading || !scriptLoaded}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing Payment...
                  </div>
                ) : !scriptLoaded ? (
                  "Loading Payment Gateway..."
                ) : (
                  `Pay ₹${bookingDetails.amount} Securely`
                )}
              </button>

              <div className="text-center text-sm text-gray-500">
                <p>By proceeding, you agree to our terms and conditions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}