import { connectDB } from "@/lib/db";
import { Task } from "@/models/Task";
import { TaskActivityLog } from "@/models/TaskActivityLog";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { Announcement } from "@/models/Announcement";
import { Types } from "mongoose";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  Briefcase,
  TrendingUp,
  Megaphone,
  ListTodo,
  PlayCircle
} from "lucide-react";
import WelcomeHeader from "./shared/WelcomeHeader";
import LiveTimer from "./shared/LiveTimer";
import StatsCard from "./shared/StatsCard";
import DashboardCard from "./shared/DashboardCard";
import TrackedHoursChart from "./shared/TrackedHoursChart";
import DashboardDateFilter from "./shared/DashboardDateFilter";
import { resolveDashboardDateRange, type DashboardFilterInput } from "@/lib/dashboardDateRange";

type Props = {
  userId: string;
  filters?: DashboardFilterInput;
};

export default async function EmployeeDashboard({ userId, filters }: Props) {
  await connectDB();

  const dateRange = resolveDashboardDateRange(filters);
  const today = new Date();
  const todayDateStr = today.toISOString().split("T")[0];
  const isTodayFilter = dateRange.key === "today";

  const { getDayMonitorStats, getMonitorStats } = await import("@/lib/monitorUtils");
  const currentDayMonitorStats = await getDayMonitorStats(userId, todayDateStr);
  const selectedRangeMonitorStats = isTodayFilter
    ? currentDayMonitorStats
    : {
        ...currentDayMonitorStats,
        workedMinutes: (await getMonitorStats(userId, dateRange.startDate, dateRange.endDate)).reduce(
          (sum, day) => sum + day.workedMinutes,
          0
        ),
        isActive: false,
        lastActivityAt: null
      };

  const user = await User.findById(userId).select("firstName lastName").lean();

  const announcements = await Announcement.find({ isActive: true })
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(3)
    .lean();

  const assignedTasks = await Task.find({
    assignee: userId,
    isDeleted: false,
    status: { $ne: "done" }
  })
    .populate("project", "name")
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  const taskStats = await Task.aggregate([
    { $match: { assignee: new Types.ObjectId(userId), isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const stats = {
    todo: taskStats.find((task: any) => task._id === "todo")?.count || 0,
    inProgress: taskStats.find((task: any) => task._id === "in_progress")?.count || 0,
    done: taskStats.find((task: any) => task._id === "done")?.count || 0
  };

  const totalTasks = await Task.countDocuments({ assignee: userId, isDeleted: false });
  const completedTasksCount = stats.done;
  const projectCount = await Project.countDocuments({ members: userId });
  const completionRate = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

  const taskIds = await Task.find({ assignee: userId, isDeleted: false }).select("_id").lean();
  const lastActivities = await TaskActivityLog.find({
    task: { $in: taskIds.map((task: any) => task._id) },
    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate({
      path: "task",
      select: "key title project",
      populate: {
        path: "project",
        select: "name"
      }
    })
    .populate("user", "firstName lastName")
    .lean();

  const hoursWorked = Math.round((selectedRangeMonitorStats.workedMinutes / 60) * 10) / 10;
  const isActive = isTodayFilter ? selectedRangeMonitorStats.isActive : false;
  const elapsedSeconds = selectedRangeMonitorStats.workedMinutes * 60;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="flex-grow">
          <WelcomeHeader
            firstName={(user as any)?.firstName}
            lastName={(user as any)?.lastName}
            progress={Math.min(100, completionRate)}
          />
        </div>
        <div className="flex flex-shrink-0 flex-col justify-center">
          <LiveTimer initialSeconds={elapsedSeconds} isActive={isActive} />
        </div>
      </div>

      <DashboardDateFilter
        initialRange={dateRange.key}
        initialStart={dateRange.key === "custom" ? dateRange.startInput : ""}
        initialEnd={dateRange.key === "custom" ? dateRange.endInput : ""}
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <StatsCard
          label="Hours"
          value={hoursWorked}
          subtext={dateRange.label}
          icon={<Clock className="h-5 w-5" />}
          color="green"
          delay={0.45}
        />
        <StatsCard
          label="To Do"
          value={stats.todo}
          subtext="Ready to start"
          icon={<ListTodo className="h-5 w-5" />}
          color="blue"
          delay={0.5}
        />
        <StatsCard
          label="In Progress"
          value={stats.inProgress}
          subtext="Being worked on"
          icon={<PlayCircle className="h-5 w-5" />}
          color="yellow"
          delay={0.55}
        />
        <StatsCard
          label="Completed"
          value={completedTasksCount}
          subtext={`${completionRate}% done`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="green"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <DashboardCard delay={0.7} className="xl:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-text-primary">
            <TrendingUp className="h-5 w-5 text-indigo-400" />
            Task Overview + Project Activity
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Assigned Tasks</p>
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {assignedTasks.length === 0 ? (
                  <li className="text-sm text-text-secondary">No open tasks assigned.</li>
                ) : (
                  assignedTasks.map((task: any) => (
                    <li key={task._id} className="rounded-lg border border-border-color bg-card-bg/50 p-2">
                      <Link
                        href={`/tasks/${task._id}`}
                        className="font-semibold text-text-primary hover:text-accent hover:underline"
                      >
                        {task.key || task.title}
                      </Link>
                      <p className="mt-1 text-xs text-text-secondary">{task.title}</p>
                      <p className="mt-1 text-[11px] text-text-secondary">Project: {task.project?.name || "Unassigned"}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">Recent Activity by Project</p>
              <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1">
                {lastActivities.length === 0 ? (
                  <p className="text-sm text-text-secondary">No recent activity found for {dateRange.label.toLowerCase()}.</p>
                ) : (
                  lastActivities.map((activity: any) => {
                    const projectName = activity.task?.project?.name || "Unknown project";
                    return (
                      <div key={activity._id} className="rounded-lg border border-border-color bg-card-bg/50 p-2">
                        <p className="truncate text-xs font-semibold text-text-primary">
                          {activity.task?.key} - {projectName}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {activity.eventType?.replace(/_/g, " ").toLowerCase()} by {activity.user?.firstName}{" "}
                          {activity.user?.lastName}
                        </p>
                        <p className="text-[10px] text-text-secondary/70">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.75}>
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-text-primary">
            <Megaphone className="h-5 w-5 text-cyan-400" />
            Notifications
          </h3>
          <div className="space-y-3">
            {announcements.length === 0 ? (
              <p className="text-xs text-text-secondary">No announcements at this time.</p>
            ) : (
              announcements.map((announcement: any) => (
                <div key={announcement._id} className="rounded-lg border border-border-color bg-card-bg/40 p-3">
                  <p className="truncate text-sm font-semibold text-text-primary">{announcement.title}</p>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    {announcement.body?.slice(0, 100) || "No details"}...
                  </p>
                </div>
              ))
            )}
          </div>
          <Link href="/announcements" className="mt-4 inline-block text-xs font-bold text-cyan-400 hover:text-cyan-300">
            View all announcements {"->"}
          </Link>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard className="w-full" delay={0.8}>
          <div className="mb-4">
            <p className="text-lg font-bold text-text-primary">Tracked Hours</p>
            <p className="text-xs text-text-secondary">
              Selected range: {dateRange.label}. Total tracked time: {hoursWorked} hours.
            </p>
          </div>
          <TrackedHoursChart />
        </DashboardCard>
      </div>
    </div>
  );
}
