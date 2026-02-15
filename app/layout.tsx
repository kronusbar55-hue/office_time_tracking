import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { ReactNode } from "react";

const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
import { DashboardShell } from "@/components/layout/DashboardShell";
import AuthProvider from "@/components/auth/AuthProvider";
import { TimeTrackingProvider } from "@/components/time-tracking/TimeTrackingProvider";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Office Time Tracking",
  description: "Internal office time tracking & attendance"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-background font-sans text-slate-100 antialiased">
        <AuthProvider>
          <TimeTrackingProvider shiftHoursTarget={8}>
            <DashboardShell>{children}</DashboardShell>
          </TimeTrackingProvider>
        </AuthProvider>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
        />
      </body>
    </html>
  );
}

