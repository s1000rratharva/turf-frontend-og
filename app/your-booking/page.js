"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const YourBookingsPage = () => {
  const [bookings, setBookings] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, upcoming, past
  const router = useRouter();

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setIsAdmin(user.email === "keluskaratharva999@gmail.com");

      try {
        const cricketRef = collection(db, "Cricket_Bookings");
        const footballRef = collection(db, "Football_Bookings");

        const cricketQuery = query(cricketRef, where("userId", "==", user.uid));
        const footballQuery = query(footballRef, where("userId", "==", user.uid));

        const [cricketSnap, footballSnap] = await Promise.all([
          getDocs(cricketQuery),
          getDocs(footballQuery),
        ]);

        const cricketBookings = cricketSnap.docs.map((doc) => ({
          id: doc.id,
          activity: "Cricket",
          ...doc.data(),
        }));

        const footballBookings = footballSnap.docs.map((doc) => ({
          id: doc.id,
          activity: "Football",
          ...doc.data(),
        }));

        const allBookings = [...cricketBookings, ...footballBookings].sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.startTime}`);
          const dateB = new Date(`${b.date}T${b.startTime}`);
          return dateB - dateA; // Show latest first
        });

        setBookings(allBookings);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load bookings", err);
        toast.error("Failed to fetch bookings");
        setLoading(false);
      }
    });
  }, [router]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getBookingStatus = (booking) => {
    const bookingEnd = new Date(`${booking.date}T${booking.endTime}`);
    const now = new Date();
    
    if (bookingEnd < now) {
      return { status: "Completed", color: "gray", bgColor: "bg-gray-100", textColor: "text-gray-700" };
    }
    
    const bookingStart = new Date(`${booking.date}T${booking.startTime}`);
    if (bookingStart > now) {
      return { status: "Upcoming", color: "green", bgColor: "bg-green-100", textColor: "text-green-700" };
    }
    
    return { status: "In Progress", color: "blue", bgColor: "bg-blue-100", textColor: "text-blue-700" };
  };

  const filteredBookings = bookings.filter(booking => {
    const status = getBookingStatus(booking);
    if (filter === "all") return true;
    if (filter === "upcoming") return status.status === "Upcoming";
    if (filter === "past") return status.status === "Completed";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="animate-pulse bg-gray-200 h-8 w-64 mx-auto rounded mb-4"></div>
            <div className="animate-pulse bg-gray-200 h-4 w-96 mx-auto rounded"></div>
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <div className="bg-gray-200 h-6 w-32 rounded"></div>
                    <div className="bg-gray-200 h-4 w-48 rounded"></div>
                    <div className="bg-gray-200 h-4 w-64 rounded"></div>
                  </div>
                  <div className="bg-gray-200 h-6 w-20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Your Bookings
          </h1>
          <p className="text-gray-600">Manage and view your upcoming and past bookings</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
            <div className="flex space-x-1">
              {[
                { key: "all", label: "All Bookings", count: bookings.length },
                { key: "upcoming", label: "Upcoming", count: bookings.filter(b => getBookingStatus(b).status === "Upcoming").length },
                { key: "past", label: "Past", count: bookings.filter(b => getBookingStatus(b).status === "Completed").length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all ${
                    filter === tab.key
                      ? "bg-green-500 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {tab.label} 
                  <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                    filter === tab.key ? "bg-green-600" : "bg-gray-200"
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-600 mb-6">
                {filter === "all" 
                  ? "You haven't made any bookings yet." 
                  : `No ${filter} bookings found.`}
              </p>
              <button
                onClick={() => router.push("/book")}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all"
              >
                Book Now
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredBookings.map((booking) => {
              const status = getBookingStatus(booking);
              const bookingDateTime = new Date(`${booking.date}T${booking.startTime}`);
              
              return (
                <div key={booking.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${
                            booking.activity === "Football" 
                              ? "bg-blue-100 text-blue-600" 
                              : "bg-amber-100 text-amber-600"
                          }`}>
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              {booking.activity === "Football" ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                              )}
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{booking.activity}</h3>
                            <p className="text-gray-600">₹{booking.amountPaid || 1500} • {booking.slotsBooked || 1} hour{booking.slotsBooked > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.textColor}`}>
                          {status.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <div>
                            <p className="text-sm text-gray-500">Date</p>
                            <p className="font-semibold">{formatDate(booking.date)}</p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm text-gray-500">Time</p>
                            <p className="font-semibold">{booking.startTime} - {booking.endTime}</p>
                          </div>
                        </div>

                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <div>
                            <p className="text-sm text-gray-500">Payment ID</p>
                            <p className="font-semibold text-sm truncate" title={booking.paymentId}>
                              {booking.paymentId?.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {status.status === "Upcoming" && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {Math.ceil((bookingDateTime - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default YourBookingsPage;