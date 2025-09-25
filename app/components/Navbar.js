"use client";

import { auth } from "@/app/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Menu, X, User, LogOut, Settings, MapPin, Calendar, Receipt } from "lucide-react";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully");
      setIsMenuOpen(false);
      router.push("/login");
    } catch (err) {
      toast.error("Logout failed. Please try again.");
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsAdmin(user?.email === "keluskaratharva999@gmail.com");
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const closeMenu = () => setIsMenuOpen(false);

  const isActive = (path) => pathname === path;

  const navItems = [
    ...(!isAdmin ? [
      { href: "#location", label: "Location", icon: MapPin, isAnchor: true },
      { href: "/book", label: "Book a Slot", icon: Calendar },
      ...(user ? [{ href: "/your-booking", label: "Your Bookings", icon: Receipt }] : [])
    ] : []),
    ...(isAdmin ? [
      { href: "/admin", label: "Admin Panel", icon: Settings },
      { href: "/revenue", label: "Revenue", icon: Receipt },
      { href: "/book", label: "Manage Slots", icon: Calendar }
    ] : [])
  ];

  return (
    <nav className={`
      sticky top-0 z-50 transition-all duration-300
      ${isScrolled 
        ? "bg-white/95 backdrop-blur-md shadow-xl border-b border-gray-200/60" 
        : "bg-white/90 backdrop-blur-sm border-b border-gray-100"
      }
    `}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="GreenSpot Turf"
                className="h-10 w-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-600/20 group-hover:from-green-400/30 group-hover:to-emerald-600/30 transition-all duration-300" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">
              GreenSpot
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.isAnchor) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                      ${isActive(item.href)
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "text-gray-600 hover:text-green-700 hover:bg-gray-50"
                      }
                    `}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center space-x-1 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
                    ${isActive(item.href)
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "text-gray-600 hover:text-green-700 hover:bg-gray-50"
                    }
                  `}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* User Section - Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User size={16} />
                  <span className="font-medium">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-all duration-200"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link href="/login">
                <button className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200">
                  Sign In
                </button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`
        md:hidden transition-all duration-300 ease-in-out overflow-hidden
        ${isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}
      `}>
        <div className="bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-4">
          <div className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.isAnchor) {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeMenu}
                    className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-green-50 rounded-lg transition-all duration-200"
                  >
                    <Icon size={18} />
                    <span className="font-medium">{item.label}</span>
                  </a>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className="flex items-center space-x-3 px-3 py-3 text-gray-700 hover:bg-green-50 rounded-lg transition-all duration-200"
                >
                  <Icon size={18} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            
            {/* Mobile User Section */}
            <div className="pt-4 border-t border-gray-200">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 px-3 py-2 text-sm text-gray-600">
                    <User size={18} />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-3 w-full px-3 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                  >
                    <LogOut size={18} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={closeMenu}>
                  <button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 rounded-lg font-medium shadow-lg transform hover:scale-[1.02] transition-all duration-200">
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}