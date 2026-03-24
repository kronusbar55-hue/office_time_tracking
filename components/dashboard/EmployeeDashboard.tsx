import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { LeaveBalance } from "@/models/LeaveBalance";
import { Task } from "@/models/Task";
import { TaskActivityLog } from "@/models/TaskActivityLog";
import { Project } from "@/models/Project";
import { LeaveRequest } from "@/models/LeaveRequest";
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

  // New employee-specific metrics
  const totalTasks = await Task.countDocuments({ assignee: userId, isDeleted: false });
  const activeTasksCount = await Task.countDocuments({ assignee: userId, isDeleted: false, status: { $ne: "done" } });
  const completedTasksCount = await Task.countDocuments({ assignee: userId, isDeleted: false, status: "done" });
  const overdueTasksCount = await Task.countDocuments({ assignee: userId, isDeleted: false, dueDate: { $lt: new Date() }, status: { $ne: "done" } });

  const weekLater = new Date();
  weekLater.setDate(weekLater.getDate() + 7);
  const tasksDueThisWeek = await Task.countDocuments({
    assignee: userId,
    isDeleted: false,
    dueDate: { $gte: new Date(), $lte: weekLater }
  });

  const projectCount = await Project.countDocuments({ members: userId });

  const pendingLeaveCount = await LeaveRequest.countDocuments({ user: userId, status: "pending" });
  const leaveBalanceDoc = await LeaveBalance.findOne({ user: userId }).lean();
  const leaveBalance = leaveBalanceDoc ? Math.max(0, (leaveBalanceDoc.totalAllocated - leaveBalanceDoc.used) / 60) : 0;

  const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  const taskIds = await Task.find({ assignee: userId, isDeleted: false }).select("_id").lean();
  const lastActivities = await TaskActivityLog.find({ task: { $in: taskIds.map((t: any) => t._id) } })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("task", "key title project")
    .populate("user", "firstName lastName")
    .lean();

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
            progress={Math.min(100, completionRate)}
          />
        </div>
        <div className="flex-shrink-0 flex flex-col justify-center">
          <LiveTimer initialSeconds={elapsedSeconds} isActive={isActive} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          label="Total Tasks"
          value={totalTasks}
          subtext="Assigned tasks"
          icon={<FileText className="h-5 w-5" />}
          color="blue"
          delay={0.4}
        />

        <StatsCard
          label="Active Tasks"
          value={activeTasksCount}
          subtext="Not completed"
          icon={<Clock className="h-5 w-5" />}
          color="orange"
          delay={0.45}
        />

        <StatsCard
          label="Completed Tasks"
          value={completedTasksCount}
          subtext="Total finished"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
          delay={0.5}
        />

        <StatsCard
          label="Overdue Tasks"
          value={overdueTasksCount}
          subtext="Needs attention"
          icon={<AlertCircle className="h-5 w-5" />}
          color="orange"
          delay={0.55}
        />

        <StatsCard
          label="This Week Due"
          value={tasksDueThisWeek}
          subtext="Due soon"
          icon={<Calendar className="h-5 w-5" />}
          color="purple"
          delay={0.6}
        />

        <StatsCard
          label="Projects"
          value={projectCount}
          subtext="Assigned"
          icon={<Briefcase className="h-5 w-5" />}
          color="blue"
          delay={0.65}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <DashboardCard delay={0.7} className="xl:col-span-2">
          <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            Task Overview + Project Activity
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Assigned Tasks</p>
              <ul className="space-y-2">
                {assignedTasks.length === 0 ? (
                  <li className="text-sm text-text-secondary">No open tasks assigned.</li>
                ) : (
                  assignedTasks.map((task: any) => (
                    <li key={task._id} className="p-2 bg-card-bg/50 rounded-lg border border-border-color">
                      <Link href={`/tasks/${task._id}`} className="font-semibold text-text-primary hover:text-accent hover:underline">{task.key || task.title}</Link>
                      <p className="text-xs text-text-secondary mt-1">{task.title}</p>
                      <p className="text-[11px] text-text-secondary mt-1">Project: {task.project?.name || "Unassigned"}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Recent Activity by Project</p>
              <div className="space-y-2">
                {lastActivities.length === 0 ? (
                  <p className="text-sm text-text-secondary">No recent activity yet.</p>
                ) : (
                  lastActivities.map((activity: any) => {
                    const projectName = activity.task?.project?.name || "Unknown project";
                    return (
                      <div key={activity._id} className="p-2 bg-card-bg/50 rounded-lg border border-border-color">
                        <p className="text-xs font-semibold text-text-primary truncate">{activity.task?.key} · {projectName}</p>
                        <p className="text-[11px] text-text-secondary">{activity.eventType?.replace(/_/g, " ").toLowerCase()} by {activity.user?.firstName} {activity.user?.lastName}</p>
                        <p className="text-[10px] text-text-secondary/70">{new Date(activity.createdAt).toLocaleString()}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.75}>
          <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-cyan-400" />
            Notifications
          </h3>
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-text-secondary text-xs">No announcements at this time.</p>
            ) : (
              announcements.map((announcement: any) => (
                <div key={announcement._id} className="p-3 rounded-lg border border-border-color bg-card-bg/40">
                  <p className="text-sm font-semibold text-text-primary truncate">{announcement.title}</p>
                  <p className="text-[11px] text-text-secondary mt-1">{announcement.body?.slice(0, 100) || "No details"}...</p>
                </div>
              ))
            )}
          </div>
          <Link href="/announcements" className="mt-4 inline-block text-xs font-bold text-cyan-400 hover:text-cyan-300">
            View all announcements →
          </Link>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard className="w-full" delay={0.8}>
          <TrackedHoursChart />
        </DashboardCard>
      </div>
    </div>
  );
}

