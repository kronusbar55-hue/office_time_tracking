import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { LeaveBalance } from "@/models/LeaveBalance";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { Announcement } from "@/models/Announcement";
import { Types } from "mongoose";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  BarChart3,
  Calendar,
  Briefcase,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  FileText,
  Megaphone
} from "lucide-react";
import WelcomeHeader from "./shared/WelcomeHeader";
import LiveTimer from "./shared/LiveTimer";
import StatsCard from "./shared/StatsCard";
import DashboardCard from "./shared/DashboardCard";
import TaskDonutChart from "./shared/TaskDonutChart";
import TrackedHoursChart from "./shared/TrackedHoursChart";

type Props = { userId: string };

export default async function EmployeeDashboard({ userId }: Props) {
  await connectDB();

  // Get today's date
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Today's stats from EmployeeMonitor
  const { getDayMonitorStats } = await import("@/lib/monitorUtils");
  const monitorStats = await getDayMonitorStats(userId, dateStr);

  // Get user info for greeting
  const user = await User.findById(userId).select("firstName lastName").lean();

  // Announcements instead of balances
  const announcements = await Announcement.find({ isActive: true })
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(3)
    .lean();

  // Assigned tasks (not done)
  const assignedTasks = await Task.find({
    assignee: userId,
    isDeleted: false,
    status: { $ne: "done" }
  })
    .populate("project", "name")
    .sort({ dueDate: 1 })
    .limit(3) // Limit to 3 for the new layout
    .lean();

  // Task stats
  const taskStats = await Task.aggregate([
    { $match: { assignee: new Types.ObjectId(userId), isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const stats = {
    backlog: taskStats.find((t: any) => t._id === "backlog")?.count || 0,
    todo: taskStats.find((t: any) => t._id === "todo")?.count || 0,
    inProgress: taskStats.find((t: any) => t._id === "in_progress")?.count || 0,
    inReview: taskStats.find((t: any) => t._id === "in_review")?.count || 0,
    done: taskStats.find((t: any) => t._id === "done")?.count || 0
  };

  // Calculate work hours today from monitor
  const hoursWorked = Math.round((monitorStats.workedMinutes / 60) * 10) / 10;
  const isActive = monitorStats.isActive;
  let elapsedSeconds = 0;

  if (isActive && monitorStats.lastActivityAt) {
    // For the live timer, we can approximate based on worked minutes
    elapsedSeconds = monitorStats.workedMinutes * 60;
  }

  // Recent activity (last 3 sessions)
  const { TimeSession } = await import("@/models/TimeSession");
  const recentSessions = await TimeSession.find({
    user: userId
  })
    .sort({ date: -1 })
    .limit(3)
    .lean();

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        <div className="flex-grow">
          <WelcomeHeader
            firstName={(user as any)?.firstName}
            lastName={(user as any)?.lastName}
            progress={85}
          />
        </div>
        <div className="flex-shrink-0 flex flex-col justify-center">
          <LiveTimer initialSeconds={elapsedSeconds} isActive={isActive} />
        </div>
      </div>



      <div className="grid grid-cols-1 gap-6">
        <DashboardCard className="w-full" delay={0.5}>
          <TrackedHoursChart />
        </DashboardCard>
      </div>
    </div>
  );
}

