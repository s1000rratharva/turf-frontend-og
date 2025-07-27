export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" />
        <title>Turf Booking | Book Your Turf Now</title>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Navbar />
        {children}
        <Toaster
          position="top-right"
          containerStyle={{
            top: '80px',
            right: '16px',
          }}
          toastOptions={{
            style: {
              borderRadius: '8px',
              background: '#fff',
              color: '#333',
            },
          }}
        />
      </body>
    </html>
  );
}
