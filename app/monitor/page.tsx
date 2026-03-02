import { DashboardShell } from "@/components/layout/DashboardShell";
import MonitorDashboard from "@/components/monitor/MonitorDashboard";
import { connectDB } from "@/lib/db";

export const metadata = {
    title: "Employee Monitor | Technotoil",
    description: "Administrative interface for monitoring employee activity"
};

export default async function MonitorPage() {
    // Pre-connect to DB if needed
    await connectDB();

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
            <MonitorDashboard />
        </div>
    );
}
