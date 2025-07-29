'use client';

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { collection, addDoc, getFirestore, serverTimestamp } from "firebase/firestore";
import { auth } from "../firebase";
import axios from "axios";

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

const PaymentPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activity, setActivity] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]);
  const [pricePerHour] = useState(1500);

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

const saveBookingToFirestore = async (response) => {
  const user = auth.currentUser;
  if (!user) return;

  await addDoc(
    collection(db, activity === "cricket" ? "Cricket_Bookings" : "Football_Bookings"),
    {
      userId: user.uid,
      name: user.displayName || "",
      email: user.email,
      activity,
      date,
      slots,
      amountPaid: totalAmount,
      razorpayPaymentId: response.razorpay_payment_id,
      createdAt: serverTimestamp(),
    }
  );
};


  const handlePayment = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("Please login to book.");
      return;
    }

    const isScriptLoaded = await loadRazorpayScript();
    if (!isScriptLoaded) {
      toast.error("Razorpay failed to load.");
      return;
    }

    try {
      const res = await axios.post("/api/razorpay", { amount: totalAmount });
      const data = res.data;

      const rzp = new window.Razorpay({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_hD5vT64kNs5EFN",
        amount: totalAmount * 100,
        currency: "INR",
        name: "GreenSpot Turf",
        description: `Booking for ${activity}`,
        order_id: data.id,
        handler: async (response) => {
          await saveBookingToFirestore(response);
          toast.success("Booking confirmed!");
          router.push("/your-booking");
        },
        prefill: {
          name: user.displayName || "User",
          email: user.email,
        },
        theme: { color: "#22c55e" },
        config: {
          display: {
            blocks: {
              upi: {
                name: "UPI",
                instruments: [{ method: "upi" }],
              },
              netbanking: {
                name: "Netbanking",
                instruments: [{ method: "netbanking" }],
              },
            },
            sequence: ["block.upi", "block.netbanking"],
            preferences: {
              show_default_blocks: false,
            },
          },
        },
      });

      rzp.open();
    } catch (err) {
      console.error(err);
      toast.error("Payment failed.");
    }
  };

  if (!activity || !date || !slots.length) {
    return <p className="text-center text-gray-500 mt-12">Loading booking summary...</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto bg-gradient-to-br from-gray-100 to-white min-h-screen">
      <div className="bg-white shadow-xl rounded-xl p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Payment Summary</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-lg font-semibold">Activity: {activity}</p>
            <p className="text-lg font-semibold">Date: {date}</p>
            <p className="text-lg font-semibold">Slots:</p>
            <ul className="list-disc list-inside">
              {slots.map((slot, idx) => (
                <li key={idx}>
                  {slot} - {getEndTime(slot)}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl shadow-sm">
            <p className="text-lg">
              <span className="font-semibold">Price per Hour:</span> ₹{pricePerHour}
            </p>
            <p className="text-lg">
              <span className="font-semibold">Total Hours:</span> {slots.length}
            </p>
            <p className="text-xl font-bold mt-4 text-green-700">
              Total: ₹{totalAmount}
            </p>
          </div>
        </div>

        <button
          onClick={handlePayment}
          className="mt-8 w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg rounded-xl"
        >
          Pay ₹{totalAmount}
        </button>
      </div>
    </div>
  );
};

export default PaymentPage;
