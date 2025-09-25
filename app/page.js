"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/app/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  MapPin,
  Clock,
  CheckCircle,
  ArrowRight,
  PlayCircle,
  Star,
  Users,
  Calendar,
  Shield,
  Smartphone,
  Zap,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import Footer from "./components/Footer";

const images = [
  {
    url: "/turf1.webp",
    title: "Premium Football Turf",
    description: "Professional-grade artificial grass with perfect traction",
  },
  {
    url: "/turf2.webp",
    title: "Cricket Practice Nets",
    description: "High-quality nets for batting and bowling practice",
  },
  {
    url: "/turf3.webp",
    title: "Multi-Sport Facility",
    description: "Versatile space for various sports and events",
  },
];

const features = [
  {
    icon: MapPin,
    title: "Prime Location",
    description: "Central location with excellent connectivity",
    gradient: "from-blue-500 to-cyan-500",
    stats: "5 min from highway",
  },
  {
    icon: Clock,
    title: "Instant Booking",
    description:
      "Reserve your slot in under 30 seconds with real-time availability",
    gradient: "from-green-500 to-emerald-500",
    stats: "30 sec booking",
  },
  {
    icon: CheckCircle,
    title: "Smart Confirmation",
    description: "Instant confirmations with updates",
    gradient: "from-purple-500 to-pink-500",
    stats: "100% reliable",
  },
  {
    icon: Shield,
    title: "Secure Payment",
    description: "Bank-level encryption with multiple payment options",
    gradient: "from-orange-500 to-red-500",
    stats: "100% secure",
  },
  {
    icon: Smartphone,
    title: "Mobile First",
    description: "Optimized for mobile booking with one-tap reservations",
    gradient: "from-indigo-500 to-blue-500",
    stats: "Mobile optimized",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Ultra-fast booking system with instant slot updates",
    gradient: "from-yellow-500 to-amber-500",
    stats: "Zero delays",
  },
];

const testimonials = [
  {
    name: "Rahul Sharma",
    role: "Football Coach",
    image: "/avatar1.jpg",
    rating: 5,
    text: "The best turf booking experience I have had. The facility is top-notch and booking is incredibly smooth.",
    sport: "Football",
  },
  {
    name: "Priya Patel",
    role: "Cricket Team Captain",
    image: "/avatar2.jpg",
    rating: 5,
    text: "Perfect for our weekly practice sessions. The instant confirmation feature saves us so much time.",
    sport: "Cricket",
  },
  {
    name: "Arjun Kumar",
    role: "Sports Enthusiast",
    image: "/avatar3.jpg",
    rating: 4,
    text: "Love the mobile-friendly interface and real-time availability updates. Makes planning so easy.",
    sport: "Both",
  },
];

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [currentImage, setCurrentImage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));

    // Auto-slide carousel
    const interval = setInterval(() => {
      if (isPlaying) {
        setCurrentImage((prev) => (prev + 1) % images.length);
      }
    }, 5000);

    // Scroll effect
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isPlaying]);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 10000);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
    setIsPlaying(false);
    setTimeout(() => setIsPlaying(true), 10000);
  };

  const StatsCounter = ({ target, label, duration = 2000 }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      let start = 0;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }, [target, duration]);

    return (
      <div className="text-center">
        <div className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-500 to-cyan-500 bg-clip-text text-transparent">
          {count}+
        </div>
        <div className="text-gray-600 font-medium">{label}</div>
      </div>
    );
  };

  const RatingStars = ({ rating }) => (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-green-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-green-200 to-cyan-200 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-200 to-purple-200 rounded-full blur-3xl opacity-30 animate-pulse delay-1000"></div>
      </div>

      {/* Hero Section with Parallax */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImage}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-0"
          >
            <div
              className="w-full h-full bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: `url(${images[currentImage].url})`,
                transform: `translateY(${scrollY * 0.5}px)`,
              }}
            >
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 text-center text-white px-4 max-w-6xl mx-auto">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                Premium Turf
              </span>
              <br />
              <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Booking Revolution
              </span>
            </h1>
            <p className="text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
              Experience the future of sports booking with our
              platform. Instant reservations, real-time availability, and
              seamless payments.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/book">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white px-8 py-4 rounded-2xl text-lg font-bold shadow-2xl transition-all duration-300 group"
                >
                  <span className="flex items-center gap-3">
                    {user?.email === "keluskaratharva999@gmail.com"
                      ? "Admin Dashboard"
                      : "Book Instantly"}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </motion.button>
              </Link>

            </div>
          </motion.div>

          {/* Image Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentImage(index);
                  setIsPlaying(false);
                  setTimeout(() => setIsPlaying(true), 10000);
                }}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  index === currentImage
                    ? "bg-white scale-125"
                    : "bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-300"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-3 rounded-full backdrop-blur-sm transition-all duration-300"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative py-20 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatsCounter target={5000} label="Happy Players" />
            <StatsCounter target={250} label="Weekly Bookings" />
            <StatsCounter target={99} label="Satisfaction Rate" />
            <StatsCounter target={2} label="Sports Available" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-20">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Why{" "}
              <span className="bg-gradient-to-r from-green-500 to-cyan-500 bg-clip-text text-transparent">
                TurfBook
              </span>{" "}
              Stands Out
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Revolutionizing the way you book sports facilities with
              cutting-edge technology and user-centric design
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group relative bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 border border-white/20"
              >
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-3xl transition-opacity duration-500`}
                ></div>
                <div
                  className={`inline-flex p-4 rounded-2xl bg-gradient-to-r ${feature.gradient} text-white mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                <div className="text-sm font-semibold text-gray-500">
                  {feature.stats}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative py-20 bg-gradient-to-br from-gray-900 to-black text-white">
        <div className="max-w-6xl mx-auto px-4">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Loved by{" "}
              <span className="bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                Players
              </span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Hear what sports enthusiasts are saying about their TurfBook
              experience
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ y: 50, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/10 hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-cyan-400 rounded-2xl flex items-center justify-center text-2xl font-bold">
                    {testimonial.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">{testimonial.name}</h4>
                    <p className="text-gray-300 text-sm">{testimonial.role}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <RatingStars rating={testimonial.rating} />
                      <span className="text-xs text-gray-400">
                        {testimonial.sport}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-gray-200 leading-relaxed">
                  {testimonial.text}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-green-500 to-cyan-500 rounded-3xl p-12 shadow-2xl"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Play Like a Pro?
            </h2>
            <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
              Join thousands of players who&apos;ve revolutionized their sports
              booking experience
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/book">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-green-600 hover:bg-gray-100 px-8 py-4 rounded-2xl text-lg font-bold shadow-lg transition-all duration-300"
                >
                  {user?.email === "keluskaratharva999@gmail.com"
                    ? "Admin Dashboard"
                    : "Start Booking Now"}
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
}   