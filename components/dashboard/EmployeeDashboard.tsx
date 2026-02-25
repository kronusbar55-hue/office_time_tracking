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

  // Today's time session
  const todaySession = await TimeSession.findOne({
    user: userId,
    date: dateStr
  }).lean();

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

  // Calculate work hours today
  let hoursWorked = 0;
  let isActive = false;
  let elapsedSeconds = 0;

  if (todaySession) {
    if (todaySession.clockOut) {
      hoursWorked = Math.round((todaySession.totalWorkMinutes || 0) / 60 * 10) / 10;
    } else if (todaySession.clockIn) {
      isActive = true;
      const elapsedMins = Math.floor((Date.now() - new Date(todaySession.clockIn).getTime()) / 60000);
      elapsedSeconds = Math.floor((Date.now() - new Date(todaySession.clockIn).getTime()) / 1000);
      hoursWorked = Math.round((elapsedMins - (todaySession.totalBreakMinutes || 0)) / 60 * 10) / 10;
    }
  }

  // Recent activity (last 5 entries)
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
            firstName={user?.firstName}
            lastName={user?.lastName}
            progress={85}
          />
        </div>
        <div className="flex-shrink-0 flex flex-col justify-center">
          <LiveTimer initialSeconds={elapsedSeconds} isActive={isActive} />
        </div>
      </div>

      {/* Row 2: Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Hours Worked"
          value={`${hoursWorked}h`}
          subtext="+2.4h from last week"
          icon={<Clock className="h-6 w-6" />}
          color="blue"
          trend={{ value: 12, isPositive: true }}
          delay={0.1}
        />
        <StatsCard
          label="Tasks Assigned"
          value={stats.todo + stats.inProgress + stats.backlog}
          subtext="3 due today"
          icon={<Briefcase className="h-6 w-6" />}
          color="green"
          delay={0.2}
        />
        <StatsCard
          label="In Progress"
          value={stats.inProgress}
          subtext="High priority"
          icon={<AlertCircle className="h-6 w-6" />}
          color="yellow"
          delay={0.3}
        />
        <StatsCard
          label="In Review"
          value={stats.inReview}
          subtext="Awaiting feedback"
          icon={<CheckCircle2 className="h-6 w-6" />}
          color="purple"
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard className="w-full" delay={0.5}>
          <TrackedHoursChart />
        </DashboardCard>
      </div>
    </div>
  );
}

