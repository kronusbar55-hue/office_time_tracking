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

import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Technotoil WorkPortal",
  description: "Internal work portal"
};
// Ensure favicon is served from public/favicon.ico — copy the file to public/
metadata.icons = {
  icon: "/favicon.ico"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-text-primary antialiased" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
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
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

