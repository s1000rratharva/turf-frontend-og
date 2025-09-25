"use client";

import { auth, googleProvider } from "@/app/firebase.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { LuEye, LuEyeClosed, LuMail, LuLock, LuUserPlus, LuLogIn } from "react-icons/lu";
import { FcGoogle } from "react-icons/fc";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        toast.success("🎉 Account created successfully!");
        router.push("/");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("👋 Welcome back!");
        router.push("/book");
      }
    } catch (err) {
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Please sign in instead.");
          break;
        case "auth/user-not-found":
          setError("No account found with this email. Please register first.");
          break;
        case "auth/wrong-password":
          setError("Incorrect password. Please try again or use Google Sign-In.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/weak-password":
          setError("Password should be at least 6 characters long.");
          break;
        case "auth/too-many-requests":
          setError("Too many attempts. Please try again in a moment.");
          break;
        default:
          setError("Something went wrong. Please try again.");
          break;
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success("✅ Google Sign-In Successful");
      router.push("/book");
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      if (err?.code === "auth/popup-closed-by-user") {
        setError("Sign-in popup was closed. Please try again.");
      } else if (err?.code === "auth/cancelled-popup-request") {
        setError("Sign-in was interrupted. Please try again.");
      } else {
        setError("Google Sign-In failed. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 p-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white/20 rounded-full">
              {isRegister ? (
                <LuUserPlus className="w-8 h-8 text-white" />
              ) : (
                <LuLogIn className="w-8 h-8 text-white" />
              )}
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">
            {isRegister ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-blue-100 mt-2">
            {isRegister ? "Join GreenSpot Turf today" : "Sign in to your account"}
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex bg-gray-100/80 m-4 rounded-xl p-1">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
              !isRegister
                ? "bg-white shadow-lg text-blue-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${
              isRegister
                ? "bg-white shadow-lg text-green-600"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            Register
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LuMail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LuLock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                {showPassword ? <LuEyeClosed className="w-5 h-5" /> : <LuEye className="w-5 h-5" />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-green-600 text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center my-6">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500 text-sm">or continue with</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl bg-white shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 group"
          >
            <FcGoogle className="w-6 h-6" />
            <span className="text-gray-700 font-medium group-hover:text-gray-900">
              Continue with Google
            </span>
          </button>

          {/* Help Text */}
          <p className="text-sm text-gray-600 text-center mt-4 leading-relaxed">
            {isRegister 
              ? "Already have an account? " 
              : "Don't have an account? "
            }
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
            >
              {isRegister ? "Sign in here" : "Register here"}
            </button>
          </p>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center animate-pulse">
              {error}
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-6 p-3 bg-blue-50/50 rounded-xl border border-blue-200/50">
            <p className="text-xs text-blue-700 text-center">
              💡 If you previously signed up with Google, please use the Google Sign-In button above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}