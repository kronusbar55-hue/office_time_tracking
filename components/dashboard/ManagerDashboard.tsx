import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LeaveRequest } from "@/models/LeaveRequest";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import {
  Users,
  Calendar,
  Activity,
  Briefcase,
  CheckSquare,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Zap,
  BarChart3
} from "lucide-react";
import Link from "next/link";
import WelcomeHeader from "./shared/WelcomeHeader";
import DashboardCard from "./shared/DashboardCard";
import TaskDonutChart from "./shared/TaskDonutChart";
import DashboardDateFilter from "./shared/DashboardDateFilter";
import { resolveDashboardDateRange, type DashboardFilterInput } from "@/lib/dashboardDateRange";

type Props = {
  userId: string;
  filters?: DashboardFilterInput;
};

export default async function ManagerDashboard({ userId, filters }: Props) {
  await connectDB();

  const dateRange = resolveDashboardDateRange(filters);
  const manager = await User.findById(userId).select("firstName lastName").lean();

  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  const team = await User.find({ manager: userId, isDeleted: false, isActive: true })
    .select("firstName lastName email")
    .lean();
  const teamIds = team.map((member) => member._id);
  const teamSize = team.length;

  const { EmployeeMonitor } = await import("@/models/EmployeeMonitor");
  const uniqueTeamInRange = await EmployeeMonitor.distinct("userId", {
    userId: { $in: teamIds.map((id: any) => id.toString()) },
    date: { $gte: dateRange.startInput, $lte: dateRange.endInput }
  });
  const teamCheckedInToday = uniqueTeamInRange.length;

  const pendingLeaves = await LeaveRequest.countDocuments({
    user: { $in: teamIds },
    status: "pending"
  });

  const teamAttendance = await EmployeeMonitor.aggregate([
    { $match: { userId: { $in: teamIds.map((id: any) => id.toString()) }, date: dateStr } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$userId",
        latestStatus: { $first: "$status" },
        lastTime: { $first: "$time" }
      }
    }
  ]);

  const attendanceMap: { [key: string]: any } = {};
  team.forEach((member: any) => {
    attendanceMap[member._id.toString()] = {
      ...member,
      status: "absent",
      clockIn: null
    };
  });

  teamAttendance.forEach((session: any) => {
    const memberId = session._id;
    if (attendanceMap[memberId]) {
      const rawStatus = (session.latestStatus || "").toUpperCase();
      if (rawStatus === "ON_BREAK") {
        attendanceMap[memberId].status = "on-break";
      } else if (rawStatus === "OFFLINE" || rawStatus === "CHECKED_OUT") {
        attendanceMap[memberId].status = "checked-out";
      } else {
        attendanceMap[memberId].status = "active";
      }
      attendanceMap[memberId].clockIn = session.lastTime;
    }
  });

  const teamTasksByStatus = await Task.aggregate([
    { $match: { assignee: { $in: teamIds }, isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const stats = {
    backlog: teamTasksByStatus.find((task: any) => task._id === "backlog")?.count || 0,
    todo: teamTasksByStatus.find((task: any) => task._id === "todo")?.count || 0,
    inProgress: teamTasksByStatus.find((task: any) => task._id === "in_progress")?.count || 0,
    inReview: teamTasksByStatus.find((task: any) => task._id === "in_review")?.count || 0,
    done: teamTasksByStatus.find((task: any) => task._id === "done")?.count || 0
  };

  const totalTasks = Object.values(stats).reduce((sum, value) => sum + (value as number), 0);
  const completedTasks = stats.done;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const overdueTasksCount = await Task.countDocuments({
    assignee: { $in: teamIds },
    isDeleted: false,
    dueDate: { $lt: now },
    status: { $ne: "done" }
  });

  const highPriorityTasksCount = await Task.countDocuments({
    assignee: { $in: teamIds },
    isDeleted: false,
    priority: { $in: ["High", "Critical"] },
    status: { $ne: "done" }
  });

  const allProjects = await Project.find({ members: { $in: [userId] } })
    .select("_id status name")
    .lean();

  const projectStats = {
    active: allProjects.filter((project: any) => project.status === "active").length,
    onHold: allProjects.filter((project: any) => project.status === "on_hold").length,
    completed: allProjects.filter((project: any) => project.status === "completed").length,
    total: allProjects.length
  };

  const tasksCompletedInRange = await Task.countDocuments({
    assignee: { $in: teamIds },
    isDeleted: false,
    status: "done",
    updatedAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
  });

  const projectIds = allProjects.map((project: any) => project._id);
  const unassignedTasksCount = await Task.countDocuments({
    project: { $in: projectIds },
    assignee: null,
    isDeleted: false,
    status: { $ne: "done" }
  });

  const teamWorkMinutes = await TimeSession.aggregate([
    {
      $match: {
        userId: { $in: teamIds.map((id: any) => id.toString()) },
        startTime: { $gte: dateRange.startDate, $lte: dateRange.endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalMinutes: { $sum: "$workMinutes" }
      }
    }
  ]);

  const totalWorkMinutes = teamWorkMinutes[0]?.totalMinutes || 0;
  const totalWorkHours = Math.round(totalWorkMinutes / 60);
  const avgTasksPerMember = teamSize > 0 ? Math.round(totalTasks / teamSize) : 0;
  const avgCompletedPerMember = teamSize > 0 ? Math.round(completedTasks / teamSize) : 0;
  const teamAttendanceRate = teamSize > 0 ? Math.round((teamCheckedInToday / teamSize) * 100) : 0;

  const TaskActivityLog = (await import("@/models/TaskActivityLog")).default;
  const teamTaskIds = await Task.find({ assignee: { $in: teamIds }, isDeleted: false })
    .select("_id")
    .lean();

  const recentActivities = await TaskActivityLog.find({
    task: { $in: teamTaskIds.map((task: any) => task._id) },
    createdAt: { $gte: dateRange.startDate, $lte: dateRange.endDate }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("user", "firstName lastName email")
    .populate({
      path: "task",
      select: "key title project",
      populate: {
        path: "project",
        select: "name"
      }
    })
    .lean();

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-3">
      <WelcomeHeader
        firstName={(manager as any)?.firstName}
        lastName={(manager as any)?.lastName}
        progress={teamAttendanceRate}
      />

      <DashboardDateFilter
        initialRange={dateRange.key}
        initialStart={dateRange.key === "custom" ? dateRange.startInput : ""}
        initialEnd={dateRange.key === "custom" ? dateRange.endInput : ""}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        <DashboardCard delay={0.1} className="lg:col-span-1">
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Tasks</span>
            </div>
            <div className="text-3xl font-bold text-text-primary">{totalTasks}</div>
            <div className="mt-2 text-xs text-text-secondary">{completedTasks} completed</div>
            <div className="mt-auto border-t border-border-color/40 pt-3">
              <span className="text-xs font-bold text-green-400">{completionRate}% Done</span>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.15} className="lg:col-span-1">
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Projects</span>
            </div>
            <div className="text-3xl font-bold text-text-primary">{projectStats.active}</div>
            <div className="mt-2 text-xs text-text-secondary">{projectStats.total} total</div>
            <div className="mt-auto border-t border-border-color/40 pt-3">
              <span className="text-xs font-bold text-indigo-400">{projectStats.onHold} on hold</span>
            </div>
          </div>
        </DashboardCard>

        

        <DashboardCard delay={0.25} className="lg:col-span-1">
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Priority</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{highPriorityTasksCount}</div>
            <div className="mt-2 text-xs text-text-secondary">high/critical</div>
            {highPriorityTasksCount > 0 && (
              <div className="mt-auto border-t border-border-color/40 pt-3">
                <Link href="/tasks?priority=High" className="text-xs font-bold text-yellow-400 hover:text-yellow-300">
                  View -
                </Link>
              </div>
            )}
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
    

        <DashboardCard className="lg:col-span-2" delay={0.45}>
          <div className="mb-6 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Team Task Distribution
            </h3>
            <span className="rounded-full bg-bg-secondary/40 px-3 py-1 text-sm font-bold text-text-primary">
              {totalTasks} tasks
            </span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
            <div className="flex items-center justify-center md:col-span-5">
              <TaskDonutChart data={stats} />
            </div>

            <div className="space-y-3 md:col-span-7">
              {[
                { key: "backlog", label: "Backlog", color: "bg-blue-400" },
                { key: "todo", label: "To Do", color: "bg-slate-400" },
                { key: "inProgress", label: "In Progress", color: "bg-yellow-400" },
                { key: "inReview", label: "In Review", color: "bg-orange-400" },
                { key: "done", label: "Done", color: "bg-green-400" }
              ].map(({ key, label, color }) => {
                const count = stats[key as keyof typeof stats];
                const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${color}`} />
                        <span className="text-sm font-medium text-text-secondary">{label}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-text-primary">{count}</span>
                        <span className="ml-2 text-[11px] text-text-secondary">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
                      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
 
            </div>
          </div>
        </DashboardCard>
      </div>      
    </div>
  );
}
