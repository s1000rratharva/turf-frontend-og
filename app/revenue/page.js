"use client";

import { useState, useEffect } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Download,
  RefreshCw,
  Shield,
  Activity,
} from "lucide-react";

export default function RevenuePage() {
  const [revenueData, setRevenueData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("month");
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    averageBooking: 0,
    growth: 0,
  });
  const router = useRouter();

  const db = getFirestore();

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        toast.error("Please log in to view revenue");
        setLoading(false);
        return;
      }

      // Check if user is admin
      if (user.email !== "keluskaratharva999@gmail.com") {
        toast.error("Access denied. Admin privileges required.");
        router.push("/login");
        return;
      }

      // Get current date and calculate range
      const now = new Date();
      let startDate;

      switch (timeRange) {
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        case "year":
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setMonth(now.getMonth() - 1));
      }

      // Fetch bookings for the selected time range
      const footballQuery = query(
        collection(db, "Football_Bookings"),
        where("bookingTime", ">=", startDate),
        orderBy("bookingTime", "desc")
      );
      const cricketQuery = query(
        collection(db, "Cricket_Bookings"),
        where("bookingTime", ">=", startDate),
        orderBy("bookingTime", "desc")
      );

      // Fetch bookings for recent transactions (last 20)
      const recentFootballQuery = query(
        collection(db, "Football_Bookings"),
        orderBy("bookingTime", "desc"),
        limit(10)
      );
      const recentCricketQuery = query(
        collection(db, "Cricket_Bookings"),
        orderBy("bookingTime", "desc"),
        limit(10)
      );

      const [
        footballSnapshot,
        cricketSnapshot,
        recentFootballSnapshot,
        recentCricketSnapshot,
      ] = await Promise.all([
        getDocs(footballQuery),
        getDocs(cricketQuery),
        getDocs(recentFootballQuery),
        getDocs(recentCricketQuery),
      ]);

      const allBookings = [
        ...footballSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          type: "football",
        })),
        ...cricketSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          type: "cricket",
        })),
      ];

      const allRecentBookings = [
        ...recentFootballSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          type: "football",
        })),
        ...recentCricketSnapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          type: "cricket",
        })),
      ];

      const parsedBookings = allBookings.map((b) => ({
        ...b,
        timestamp:
          b.bookingTime && b.bookingTime.seconds
            ? new Date(b.bookingTime.seconds * 1000)
            : b.bookingTime instanceof Date
              ? b.bookingTime
              : new Date(),
      }));

      // Process data for charts
      const processedData = processChartData(parsedBookings, timeRange);
      setRevenueData(processedData);

      // Set recent transactions
      const parsedRecentBookings = allRecentBookings.map((b) => ({
        ...b,
        timestamp:
          b.bookingTime && b.bookingTime.seconds
            ? new Date(b.bookingTime.seconds * 1000)
            : b.bookingTime instanceof Date
              ? b.bookingTime
              : new Date(),
      }));
      const sortedTransactions = parsedRecentBookings.sort(
        (a, b) => (b.timestamp?.getTime() || 0) - (a.timestamp?.getTime() || 0)
      );
      setRecentTransactions(sortedTransactions);

      // Calculate statistics
      calculateStats(parsedBookings);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast.error("Failed to load revenue data");
    } finally {
      setLoading(false);
    }
  };

  const processChartData = (bookings, range) => {
    const groups = {};

    if (range === "week") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      days.forEach(
        (day) => (groups[day] = { name: day, revenue: 0, bookings: 0 })
      );
      bookings.forEach((booking) => {
        if (booking.timestamp) {
          const day = days[booking.timestamp.getDay()];
          if (groups[day]) {
            groups[day].revenue += booking.amountPaid || 0;
            groups[day].bookings += 1;
          }
        }
      });
      return Object.values(groups);
    } else if (range === "month") {
      const weeks = Array.from({ length: 4 }, (_, i) => `Week ${i + 1}`);
      weeks.forEach(
        (week) => (groups[week] = { name: week, revenue: 0, bookings: 0 })
      );
      bookings.forEach((booking) => {
        if (booking.timestamp) {
          const week = `Week ${Math.ceil(booking.timestamp.getDate() / 7)}`;
          if (groups[week]) {
            groups[week].revenue += booking.amountPaid || 0;
            groups[week].bookings += 1;
          }
        }
      });
      return Object.values(groups);
    } else if (range === "year") {
      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];
      months.forEach(
        (month) => (groups[month] = { name: month, revenue: 0, bookings: 0 })
      );
      bookings.forEach((booking) => {
        if (booking.timestamp) {
          const month = months[booking.timestamp.getMonth()];
          if (groups[month]) {
            groups[month].revenue += booking.amountPaid || 0;
            groups[month].bookings += 1;
          }
        }
      });
      return Object.values(groups);
    }
    return [];
  };

  const calculateStats = (bookings) => {
    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + (booking.amountPaid || 0),
      0
    );
    const totalBookings = bookings.length;
    const averageBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    setStats({
      totalRevenue,
      totalBookings,
      averageBooking,
      growth: 12.5,
    });
  };

  const exportToCSV = () => {
    // Helper function to format date consistently
    const formatDate = (date) => {
      if (!date) return "N/A";
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const hh = String(date.getHours()).padStart(2, "0");
      const min = String(date.getMinutes()).padStart(2, "0");
      const ss = String(date.getSeconds()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
    };

    // Helper function to properly escape values for CSV
    const escapeCsvValue = (value) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      if (
        stringValue.includes(",") ||
        stringValue.includes('"') ||
        stringValue.includes("\n")
      ) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const csvContent = [
      ["Date", "Activity", "Amount", "Time Slots", "Slots Count", "User"]
        .map(escapeCsvValue)
        .join(","),
      ...recentTransactions.map((booking) => {
        const date = formatDate(booking.timestamp);
        let timeSlots = "";
        let slotsCount = booking.slotsBooked || 1;

        if (booking.selectedSlots && booking.selectedSlots.length > 0) {
          timeSlots = booking.selectedSlots
            .map((slot) => {
              const [hour] = slot.split(":");
              const endHour = parseInt(hour) + 1;
              const endTime = `${String(endHour).padStart(2, "0")}:00`;
              return `${slot}-${endTime}`;
            })
            .join("; ");
          slotsCount = booking.selectedSlots.length;
        } else if (booking.startTime && booking.endTime) {
          timeSlots = `${booking.startTime}-${booking.endTime}`;
        }

        return [
          escapeCsvValue(date),
          escapeCsvValue(booking.type),
          escapeCsvValue(booking.amountPaid || 0),
          escapeCsvValue(timeSlots),
          escapeCsvValue(slotsCount),
          escapeCsvValue(booking.userEmail),
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${timeRange}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      if (user.email !== "keluskaratharva999@gmail.com") {
        toast.error("Access denied. Admin privileges required.");
        router.push("/login");
        return;
      }

      await fetchRevenueData();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (
      auth.currentUser &&
      auth.currentUser.email === "keluskaratharva999@gmail.com"
    ) {
      fetchRevenueData();
    }
  }, [timeRange]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Revenue Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Track your bookings and earnings
              </p>
            </div>
            <div className="flex gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="year">Last 12 Months</option>
              </select>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={fetchRevenueData}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.totalRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-sm text-green-600">
                +{stats.growth}% from last period
              </span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Bookings
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalBookings}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Across all activities</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg. Booking
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{stats.averageBooking.toFixed(0)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Per booking session</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Time Period</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 capitalize">
                  {timeRange}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">Viewing data</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Revenue Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`₹${value}`, "Revenue"]}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Slots
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.timestamp
                          ? item.timestamp.toLocaleString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {item.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.userEmail || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.selectedSlots && item.selectedSlots.length > 0 ? (
                          <div className="space-y-1">
                            {item.selectedSlots.map((slot, index) => {
                              const [hour] = slot.split(":");
                              const endHour = parseInt(hour) + 1;
                              const endTime = `${String(endHour).padStart(2, "0")}:00`;
                              return (
                                <div
                                  key={index}
                                  className="text-xs bg-gray-100 px-2 py-1 rounded"
                                >
                                  {slot} - {endTime}
                                </div>
                              );
                            })}
                            <div className="text-xs text-gray-500 font-medium">
                              {item.selectedSlots.length} slot
                              {item.selectedSlots.length > 1 ? "s" : ""}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs">
                            <div className="bg-gray-100 px-2 py-1 rounded mb-1">
                              {item.startTime || "N/A"} -{" "}
                              {item.endTime || "N/A"}
                            </div>
                            <div className="text-gray-500 font-medium">
                              {item.slotsBooked || 1} slot
                              {(item.slotsBooked || 1) > 1 ? "s" : ""}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        ₹{item.amountPaid || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No transactions found for this time range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}