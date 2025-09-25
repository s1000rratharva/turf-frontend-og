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

// ✅ Razorpay loader
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

  // ✅ Backend health check
  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        const backendURL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
        const response = await fetch(`${backendURL}/health`);
        if (response.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("error");
        }
      } catch (error) {
        setBackendStatus("error");
      }
    };

    testBackendConnection();
  }, []);

  // ✅ Updated handlePayment
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
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error("Payment gateway failed to load.");
        setIsProcessing(false);
        return;
      }

      if (backendStatus !== "connected") {
        toast.error("Server connection issue.");
        setIsProcessing(false);
        return;
      }

      const backendURL =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const orderResponse = await fetch(`${backendURL}/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalAmount,
          currency: "INR",
        }),
      });

      const orderData = await orderResponse.json();

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        order_id: orderData.id,
        name: "Turf Booking System",
        description: `Booking for ${activity} - ${slots.length} slot(s) on ${date}`,
        handler: async function (response) {
          toast.success("Payment successful!");
          // here keep your Firestore booking logic
        },
        prefill: {
          name: user.displayName || "Customer",
          email: user.email,
        },
        theme: {
          color: "#10b981",
        },
        config: {
          display: {
            blocks: {
              banks: {
                name: "All Payment Methods",
                instruments: [
                  { method: "upi" },
                  { method: "card" },
                  { method: "netbanking" },
                  { method: "wallet" },
                ],
              },
            },
            sequence: ["block.banks"],
            preferences: { show_default_blocks: true },
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      toast.error(error.message || "Payment failed.");
      setIsProcessing(false);
    }
  };

  // ✅ Keep ALL your JSX (UI) here as it was
  return (
    <div>
      {/* paste your existing UI code here unchanged */}
    </div>
  );
};

export default PaymentComponent;
