import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Turf Booking | Book Your Turf Now",
  icons: {
    icon: "/logo.png", // favicon
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          src="https://checkout.razorpay.com/v1/checkout.js"
          async
        ></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
        <Toaster
          position="top-right"
          containerStyle={{
            top: "80px",
            right: "16px",
          }}
          toastOptions={{
            style: {
              borderRadius: "8px",
              background: "#fff",
              color: "#333",
            },
          }}
        />
      </body>
    </html>
  );
}