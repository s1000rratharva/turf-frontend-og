"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Download,
  Filter,
  Search,
  BarChart3,
  PieChart,
  LogOut,
  Loader,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function RevenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [showChart, setShowChart] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedBooking, setExpandedBooking] = useState(null);

  // Calculate revenue metrics
  const revenueData = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let total = 0, daily = 0, monthly = 0, yearly = 0;
    const monthlyData = Array(12).fill(0);
    const activityData = {};

    bookings.forEach(booking => {
      const amount = Number(booking.amountPaid || 0);
      const dateStr = booking.date;
      if (!dateStr) return;

      const date = new Date(dateStr);
      
      total += amount;
      if (dateStr === today) daily += amount;
      if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) monthly += amount;
      if (date.getFullYear() === currentYear) yearly += amount;

      // Monthly breakdown for current year
      if (date.getFullYear() === currentYear) {
        monthlyData[date.getMonth()] += amount;
      }

      // Activity breakdown
      if (!activityData[booking.activity]) {
        activityData[booking.activity] = 0;
      }
      activityData[booking.activity] += amount;
    });

    return { total, daily, monthly, yearly, monthlyData, activityData };
  }, [bookings]);

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const matchesSearch = searchTerm === "" || 
        booking.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.paymentId?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesActivity = activityFilter === "all" || booking.activity === activityFilter;
      
      const matchesDate = dateFilter === "all" || 
        (dateFilter === "today" && booking.date === new Date().toISOString().split("T")[0]) ||
        (dateFilter === "month" && new Date(booking.date).getMonth() === new Date().getMonth());
      
      return matchesSearch && matchesActivity && matchesDate;
    });
  }, [bookings, searchTerm, activityFilter, dateFilter]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== "keluskaratharva999@gmail.com") {
        router.push("/login");
        return;
      }
      await fetchRevenue();
    });

    return () => unsubscribe();
  }, []);

  const fetchRevenue = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const month = new Date().getMonth();
      const year = new Date().getFullYear();

      const fetchData = async (activity) => {
        try {
          const snap = await getDocs(collection(db, `${activity}_Bookings`));
          if (snap.empty) return [];
          return snap.docs.map((doc) => ({
            id: doc.id,
            activity,
            ...doc.data(),
          }));
        } catch (error) {
          console.error(`Error fetching ${activity} bookings:`, error);
          return [];
        }
      };

      const cricket = await fetchData("Cricket");
      const football = await fetchData("Football");
      const allBookings = [...cricket, ...football];

      setBookings(allBookings);
    } catch (err) {
      console.error("Error fetching revenue:", err);
      toast.error("Failed to fetch revenue data");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Activity", "Date", "Time", "Amount", "Payment ID", "User Email"];
    const csvData = filteredBookings.map(b => [
      b.activity,
      b.date,
      `${b.startTime || "--"} - ${b.endTime || "--"}`,
      b.amountPaid || 0,
      b.paymentId || "N/A",
      b.userEmail || "N/A"
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success("Report exported successfully!");
  };

  const StatCard = ({ title, value, icon: Icon, change, color }) => (
    <div className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${color} hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">₹{value.toLocaleString()}</p>
          {change && (
            <p className={`text-xs font-medium mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '↑' : '↓'} {Math.abs(change)}%
            </p>
          )}
        </div>
        <div className="p-3 rounded-full bg-blue-50">
          <Icon className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </div>
  );

  const ChartBar = ({ month, value, maxValue }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="w-full bg-gray-200 rounded-full h-32 relative">
          <div 
            className="absolute bottom-0 w-full bg-gradient-to-t from-green-400 to-green-600 rounded-full transition-all duration-500"
            style={{ height: `${percentage}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-600">{month}</span>
        <span className="text-xs font-bold text-gray-900">₹{value.toLocaleString()}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Loading revenue dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
              <p className="text-sm text-gray-600">Track and analyze your booking revenue</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => signOut(auth).then(() => router.push('/login'))}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={revenueData.total}
            icon={DollarSign}
            color="border-l-green-500"
          />
          <StatCard
            title="Today's Revenue"
            value={revenueData.daily}
            icon={TrendingUp}
            color="border-l-blue-500"
          />
          <StatCard
            title="This Month"
            value={revenueData.monthly}
            icon={Calendar}
            color="border-l-purple-500"
          />
          <StatCard
            title="This Year"
            value={revenueData.yearly}
            icon={Users}
            color="border-l-orange-500"
          />
        </div>

        {/* Charts Toggle */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Revenue Analytics</h2>
          <button
            onClick={() => setShowChart(!showChart)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {showChart ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showChart ? "Hide Charts" : "Show Charts"}
          </button>
        </div>

        {/* Charts Section */}
        {showChart && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Revenue Chart */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Revenue ({new Date().getFullYear()})</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex items-end justify-between h-48 px-4">
                {revenueData.monthlyData.map((value, index) => (
                  <ChartBar
                    key={index}
                    month={new Date(2024, index).toLocaleString('default', { month: 'short' })}
                    value={value}
                    maxValue={Math.max(...revenueData.monthlyData)}
                  />
                ))}
              </div>
            </div>

            {/* Activity Distribution */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Revenue by Activity</h3>
                <PieChart className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                {Object.entries(revenueData.activityData).map(([activity, amount], index) => {
                  const colors = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500'];
                  return (
                    <div key={activity} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${colors[index] || 'bg-gray-500'}`} />
                        <span className="font-medium text-gray-700">{activity}</span>
                      </div>
                      <span className="font-bold text-gray-900">₹{amount.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Activities</option>
              <option value="Cricket">Cricket</option>
              <option value="Football">Football</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="month">This Month</option>
            </select>
            <button
              onClick={() => {
                setSearchTerm("");
                setActivityFilter("all");
                setDateFilter("all");
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Booking Records ({filteredBookings.length})
              </h2>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {showDetails ? "Hide Details" : "Show Details"}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  {showDetails && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBookings.map((booking, index) => (
                  <tr key={booking.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-3 ${
                          booking.activity === 'Cricket' ? 'bg-green-500' : 'bg-blue-500'
                        }`} />
                        <span className="font-medium text-gray-900">{booking.activity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{booking.date}</div>
                        <div className="text-sm text-gray-500">
                          {booking.startTime} - {booking.endTime}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ₹{booking.amountPaid || 0}
                      </span>
                    </td>
                    {showDetails && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                          {booking.paymentId || "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {booking.userEmail || "N/A"}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setExpandedBooking(expandedBooking === index ? null : index)}
                        className="text-green-600 hover:text-green-900"
                      >
                        {expandedBooking === index ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">No bookings found</div>
              <p className="text-gray-500">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}