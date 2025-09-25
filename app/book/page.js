"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  deleteDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { doc } from "firebase/firestore";

const SLOT_TIMES = Array.from({ length: 18 }, (_, i) => i + 6);

export default function BookingPage() {
  const router = useRouter();
  const [activity, setActivity] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [bookedSlots, setBookedSlots] = useState([]);
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [blockedSlotDocs, setBlockedSlotDocs] = useState({});
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setIsAdmin(u.email === "keluskaratharva999@gmail.com");
      } else {
        router.push("/login");
      }
    });
  }, []);

  useEffect(() => {
    if (selectedDate && activity) {
      setLoading(true);
      fetchSlots().finally(() => setLoading(false));
    }
  }, [selectedDate, activity]);

  const fetchSlots = async () => {
    try {
      const colRef = collection(db, `${activity}_Bookings`);
      const q = query(colRef, where("date", "==", selectedDate));
      const snapshot = await getDocs(q);
      const booked = snapshot.docs.map((doc) => doc.data().startTime);

      const blockRef = collection(db, "Blocked_Slots");
      const qb = query(
        blockRef,
        where("date", "==", selectedDate),
        where("activity", "==", activity)
      );
      const blockedSnap = await getDocs(qb);
      const blocked = blockedSnap.docs.map((doc) => doc.data().startTime);

      const blockedDocMap = {};
      blockedSnap.docs.forEach((doc) => {
        blockedDocMap[doc.data().startTime] = doc.id;
      });

      setBookedSlots(booked);
      setBlockedSlots(blocked);
      setBlockedSlotDocs(blockedDocMap);
    } catch (err) {
      toast.error("Error fetching slots");
      console.error(err);
    }
  };

  const handleSelectSlot = (slot) => {
    if (bookedSlots.includes(slot) || blockedSlots.includes(slot)) return;
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  const handleProceedToPayment = () => {
    if (!user) return toast.error("Login required");
    if (!selectedSlots.length) return toast.error("No slot selected");

    toast.success("Proceeding to payment...");
    router.push(
      `/payment?activity=${activity}&date=${selectedDate}&slots=${selectedSlots.join(",")}`
    );
  };

  const handleBlockSlots = async () => {
    if (!selectedSlots.length) return toast.error("No slot selected");

    try {
      const blockPromises = selectedSlots.map((slot) =>
        addDoc(collection(db, "Blocked_Slots"), {
          activity,
          date: selectedDate,
          startTime: slot,
          blockedBy: user.email,
          createdAt: new Date(),
        })
      );

      await Promise.all(blockPromises);
      toast.success("Slot(s) marked as unavailable");
      setSelectedSlots([]);
      fetchSlots();
    } catch (err) {
      console.error("Error blocking slot", err);
      toast.error("Failed to block slot");
    }
  };

  const handleUnblockSlot = async (slot) => {
    const docId = blockedSlotDocs[slot];
    if (!docId) return;

    try {
      await deleteDoc(doc(db, "Blocked_Slots", docId));
      toast.success(`Slot ${slot} is now available`);
      fetchSlots();
    } catch (err) {
      console.error("Failed to unblock slot", err);
      toast.error("Could not unblock slot");
    }
  };

  // Fixed date functions
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 4);
    return d.toISOString().split('T')[0];
  };

  const ActivityCard = ({ type, title, description, price }) => (
    <div
      className={`relative p-4 sm:p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer group hover:scale-105 ${
        activity === type
          ? "border-green-500 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
      onClick={() => setActivity(type)}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
        {activity === type && (
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center">
            <svg className="w-3 h-3 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="text-gray-600 mb-4 text-xs sm:text-sm">{description}</p>
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xl sm:text-2xl font-bold text-gray-900">₹{price}</span>
          <span className="text-gray-500 text-xs sm:text-sm ml-1">/ session</span>
        </div>
        <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
          activity === type ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
        }`}>
          {isAdmin ? "Manage" : "Book Now"}
        </span>
      </div>
    </div>
  );

  const SlotButton = ({ time, hour, isBooked, isBlocked, isPast, isSelected }) => {
    const endHour = hour + 1;
    const slotLabel = `${String(hour).padStart(2, "0")}:00 - ${String(endHour).padStart(2, "0")}:00`;

    if (isBlocked && isAdmin) {
      return (
        <button
          onClick={() => handleUnblockSlot(time)}
          className="relative p-3 sm:p-4 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 hover:border-amber-300 transition-all group w-full"
        >
          <div className="text-center">
            <span className="text-xs sm:text-sm font-medium text-amber-800 block">{slotLabel}</span>
            <span className="text-xs text-amber-600 mt-1 bg-amber-100 px-2 py-1 rounded-full">Click to Unblock</span>
          </div>
          <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full"></div>
        </button>
      );
    }

    return (
      <button
        onClick={() => handleSelectSlot(time)}
        disabled={isBooked || isBlocked || isPast}
        className={`relative p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 group w-full ${
          isBooked || isBlocked || isPast
            ? "bg-gray-100 border-gray-200 cursor-not-allowed"
            : isSelected
            ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-md"
            : "bg-white border-gray-200 hover:border-green-300 hover:shadow-md"
        }`}
      >
        <span className={`text-xs sm:text-sm font-medium ${
          isBooked || isBlocked || isPast
            ? "text-gray-400"
            : isSelected
            ? "text-green-700"
            : "text-gray-700"
        }`}>
          {slotLabel}
        </span>
        
        {isBooked && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full"></div>
        )}
        {isBlocked && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-amber-400 rounded-full"></div>
        )}
        {isPast && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-gray-400 rounded-full"></div>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full"></div>
        )}
        
        {(isBooked || isBlocked || isPast) && (
          <div className="absolute inset-0 bg-white bg-opacity-70 rounded-xl flex items-center justify-center">
            <span className="text-xs font-medium text-gray-500">
              {isBooked ? "Booked" : isBlocked ? "Unavailable" : "Past"}
            </span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-4 sm:py-8 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Book Your Session
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Select your activity, choose a date, and pick your preferred time slot</p>
        </div>

        {/* Progress Steps - Mobile Vertical / Desktop Horizontal */}
        <div className="flex justify-center mb-8 sm:mb-12">
          <div className="flex flex-col sm:flex-row items-center sm:space-x-4 space-y-4 sm:space-y-0">
            {['Activity', 'Date', 'Time', 'Payment'].map((step, index) => {
              const currentStep = activity ? (selectedDate ? (selectedSlots.length ? 3 : 2) : 1) : 0;
              const isCompleted = index < currentStep;
              const isActive = index === currentStep;

              return (
                <div key={step} className="flex items-center">
                  <div className={`flex flex-col sm:flex-row items-center ${
                    isCompleted ? 'text-green-600' : isActive ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 font-semibold ${
                      isCompleted 
                        ? 'bg-green-600 border-green-600 text-white' 
                        : isActive 
                        ? 'border-green-600 bg-white text-green-600' 
                        : 'border-gray-300 bg-white text-gray-400'
                    }`}>
                      {isCompleted ? '✓' : index + 1}
                    </div>
                    <span className="text-sm mt-2 sm:mt-0 sm:ml-3 font-medium">{step}</span>
                  </div>
                  {index < 3 && (
                    <>
                      <div className={`hidden sm:block w-16 h-1 mx-4 ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
                      }`}></div>
                      <div className={`sm:hidden w-1 h-8 mx-auto ${
                        isCompleted ? 'bg-green-600' : 'bg-gray-300'
                      }`}></div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 1. Choose Activity */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8 mb-6 sm:mb-8">
          <div className="flex items-center mb-4 sm:mb-6">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-bold text-sm sm:text-base">1</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Choose an Activity</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <ActivityCard
              type="Football"
              title="5v5 Football Turf"
              description="Professional artificial turf with proper goals and markings"
              price="1500"
            />
            <ActivityCard
              type="Cricket"
              title="5v5 Box Cricket"
              description="Indoor cricket facility with bowling machine available"
              price="1500"
            />
          </div>
        </div>

        {/* 2. Select Date */}
        {activity && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8 mb-6 sm:mb-8">
            <div className="flex items-center mb-4 sm:mb-6">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-sm sm:text-base">2</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Date</h2>
            </div>
            
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose your preferred date</label>
              <div className="relative">
                <input
                  type="date"
                  className="w-full p-3 sm:p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  value={selectedDate}
                  min={getMinDate()}
                  max={getMaxDate()}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <div className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2">
                  
                </div>
              </div>
              {selectedDate && (
                <p className="text-green-600 text-sm mt-2">
                  Selected: {new Date(selectedDate).toLocaleDateString('en-IN', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 3. Select Slot */}
        {activity && selectedDate && (
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center mb-2 sm:mb-0">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold text-sm sm:text-base">3</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Select Time Slot</h2>
              </div>
              {selectedSlots.length > 0 && (
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedSlots.length} slot(s) selected
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-green-600"></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-6 sm:mb-8">
                  {SLOT_TIMES.map((hour) => {
                    const time = `${String(hour).padStart(2, "0")}:00`;
                    const isBooked = bookedSlots.includes(time);
                    const isBlocked = blockedSlots.includes(time);
                    const now = new Date();
                    const selectedDateTime = new Date(selectedDate + 'T' + time);
                    const isPast = selectedDateTime < now;
                    const isSelected = selectedSlots.includes(time);

                    return (
                      <SlotButton
                        key={time}
                        time={time}
                        hour={hour}
                        isBooked={isBooked}
                        isBlocked={isBlocked}
                        isPast={isPast}
                        isSelected={isSelected}
                      />
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Selected</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-300 rounded-full mr-2"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Available</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-400 rounded-full mr-2"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Booked</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-amber-400 rounded-full mr-2"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Unavailable</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Past</span>
                  </div>
                </div>

                {/* Action Button */}
                <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-100">
                  {isAdmin ? (
                    <button
                      onClick={handleBlockSlots}
                      disabled={selectedSlots.length === 0}
                      className={`w-full sm:w-auto px-4 py-3 sm:px-8 sm:py-4 rounded-xl font-semibold text-white transition-all ${
                        selectedSlots.length === 0
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg hover:shadow-xl"
                      }`}
                    >
                      Mark Selected as Unavailable
                    </button>
                  ) : (
                    <button
                      onClick={handleProceedToPayment}
                      disabled={selectedSlots.length === 0}
                      className={`w-full sm:w-auto px-4 py-3 sm:px-8 sm:py-4 rounded-xl font-semibold text-white transition-all ${
                        selectedSlots.length === 0
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl"
                      }`}
                    >
                      Proceed to Payment ({selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''})
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}