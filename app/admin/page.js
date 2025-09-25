"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { 
  Calendar, 
  Clock, 
  User, 
  Trash2, 
  LogOut, 
  Filter, 
  Search,
  Loader,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

export default function AdminPanel() {
  const [blockedSlots, setBlockedSlots] = useState([]);
  const [filteredSlots, setFilteredSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isDeleting, setIsDeleting] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user || user.email !== "keluskaratharva999@gmail.com") {
        router.push("/login");
        return;
      }
      await fetchBlockedSlots();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    filterSlots();
  }, [blockedSlots, searchTerm, statusFilter]);

  const fetchBlockedSlots = async () => {
    try {
      const q = query(
        collection(db, "Blocked_Slots"), 
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);
      const slots = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        status: new Date(doc.data().date) >= new Date() ? "active" : "expired"
      }));
      setBlockedSlots(slots);
    } catch (err) {
      console.error("Failed to fetch blocked slots", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filterSlots = () => {
    let filtered = blockedSlots;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(slot =>
        slot.activity?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        slot.blockedBy?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(slot => slot.status === statusFilter);
    }

    setFilteredSlots(filtered);
  };

  const handleUnblock = async (id) => {
    if (!confirm("Are you sure you want to unblock this slot?")) return;

    setIsDeleting(id);
    try {
      await deleteDoc(doc(db, "Blocked_Slots", id));
      toast.success("Slot unblocked successfully!");
      setBlockedSlots(prev => prev.filter(slot => slot.id !== id));
    } catch (err) {
      console.error("Unblock failed:", err);
      toast.error("Failed to unblock slot");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const StatsCard = ({ title, value, icon: Icon, color }) => (
    <div className={`bg-white rounded-xl p-6 shadow-sm border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatsCard
            title="Total Blocked Slots"
            value={blockedSlots.length}
            icon={Calendar}
            color="border-l-blue-500"
          />
          <StatsCard
            title="Active Blocks"
            value={blockedSlots.filter(s => s.status === "active").length}
            icon={CheckCircle2}
            color="border-l-green-500"
          />
          <StatsCard
            title="Expired Blocks"
            value={blockedSlots.filter(s => s.status === "expired").length}
            icon={AlertCircle}
            color="border-l-orange-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by activity or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Blocked Slots List */}
        <div className="space-y-4">
          {filteredSlots.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-600">No blocked slots found</p>
              <p className="text-gray-500 mt-2">
                {blockedSlots.length === 0 
                  ? "No slots have been blocked yet." 
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            filteredSlots.map((slot) => (
              <div
                key={slot.id}
                className={`bg-white rounded-xl shadow-sm p-6 transition-all hover:shadow-md ${
                  slot.status === "expired" ? "opacity-60" : ""
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {slot.activity}
                      </h3>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          slot.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {slot.status === "active" ? "Active" : "Expired"}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(slot.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{slot.startTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{slot.blockedBy || "Admin"}</span>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleUnblock(slot.id)}
                    disabled={isDeleting === slot.id}
                    className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeleting === slot.id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    Unblock
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}