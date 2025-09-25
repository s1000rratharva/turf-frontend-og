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

// Load Razorpay script
const loadRazorpayScript = () =>
  new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ✅ Pick backend URL dynamically
const getBackendURL = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_LOCAL_API_URL || "http://localhost:5000";
};

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

  // Extract params
  useEffect(() => {
    const activityParam = searchParams.get("activity") || "";
    const dateParam = searchParams.get("date") || "";
    const slotString = searchParams.get("slots") || "";
    const slotArray = slotString.split(",").filter(Boolean);

    setActivity(activityParam);
    setDate(dateParam);
    setSlots(slotArray);
  }, [searchParams]);

  // ✅ Health check backend
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        const backendURL = getBackendURL();
        const response = await fetch(`${backendURL}/health`);
        if (response.ok) {
          setBackendStatus("connected");
          console.log("✅ Backend connection successful:", backendURL);
        } else {
          setBackendStatus("error");
          console.error("❌ Backend responded with error:", response.status);
        }
      } catch (error) {
        setBackendStatus("error");
        console.error("❌ Backend connection failed:", error.message);
      }
    };

    testBackendConnection();
  }, []);

  // Time slot helpers
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

  // ✅ Payment Handler
  const handlePayment = async () => {
    if (isProcessing) return;

    const user = auth.currentUser;
    if (!user) {
      toast.error("Please log in to continue with payment");
      router.push("/login");
      return;
    }

    setIsProcessing(true);

    try {
      // Load Razorpay
      toast.loading("Loading payment gateway...");
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Payment gateway failed to load. Please refresh.");
        setIsProcessing(false);
        return;
      }

      if (backendStatus !== "connected") {
        toast.error("Server connection issue. Please try again later.");
        setIsProcessing(false);
        return;
      }

      // ✅ Create order
      toast.loading("Creating payment order...");
      const backendURL = getBackendURL();

      const orderResponse = await fetch(`${backendURL}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount * 100, // 🔥 Always send in paise
          currency: "INR",
        }),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        throw new Error(`Order creation failed: ${errorText}`);
      }

      const orderData = await orderResponse.json();
      toast.dismiss();

      // ✅ Razorpay options
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        order_id: orderData.id,
        name: "Turf Booking System",
        description: `Booking for ${activity} - ${slots.length} slot(s) on ${date}`,
        handler: async function (response) {
          try {
            toast.loading("Confirming your booking...");

            const activityCollection =
              activity.toLowerCase() === "football"
                ? "Football_Bookings"
                : "Cricket_Bookings";

            const bookingPromises = slots.map((slot) =>
              addDoc(collection(db, activityCollection), {
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || "Customer",
                date,
                startTime: slot,
                endTime: getEndTime(slot),
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
                amountPaid: pricePerHour,
                totalAmount,
                slotsBooked: slots.length,
                activity,
                status: "confirmed",
                timestamp: serverTimestamp(),
              })
            );

            await Promise.all(bookingPromises);
            toast.dismiss();

            toast.success("Booking confirmed! Redirecting...");
            setTimeout(() => router.push("/your-booking"), 2000);
          } catch (err) {
            console.error("Booking save failed:", err.message);
            toast.error("Payment successful, but booking failed to save.");
          }
        },
        prefill: {
          name: user.displayName || "Customer",
          email: user.email,
        },
        theme: {
          color: "#10b981",
        },
        modal: {
          ondismiss: () => {
            toast.error("Payment window closed");
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp) => {
        console.error("Payment failed:", resp.error);
        toast.error(`Payment failed: ${resp.error.reason}`);
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err) {
      console.error("Payment Error:", err.message);
      toast.dismiss();
      toast.error(err.message || "Payment failed. Try again.");
      setIsProcessing(false);
    }
  };

  // ✅ UI stays same (summary + payment button)
  if (!activity || !date || !slots.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading booking summary...</p>
      </div>
    );
  }

  return (
    // keep your JSX (same as before) ...
    // only logic above is updated
    <div>...your existing UI code here...</div>
  );
};

export default PaymentComponent;
