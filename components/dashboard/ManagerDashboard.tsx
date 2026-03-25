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
  BarChart3,
  Clock,
  ListTodo,
  PlayCircle
} from "lucide-react";
import Link from "next/link";
import WelcomeHeader from "./shared/WelcomeHeader";
import DashboardCard from "./shared/DashboardCard";
import TaskDonutChart from "./shared/TaskDonutChart";
import TrackedHoursChart from "./shared/TrackedHoursChart";
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

  const openTeamTasks = await Task.find({
    assignee: { $in: teamIds },
    isDeleted: false,
    status: { $ne: "done" }
  })
    .populate("project", "name")
    .populate("assignee", "firstName lastName")
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

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
    .limit(10)
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
     

       

      <div className="grid grid-cols-1 gap-6">
        <DashboardCard className="w-full" delay={0.55}>
          <div className="mb-4">
            <p className="text-lg font-bold text-text-primary">Tracked Hours</p>
            <p className="text-xs text-text-secondary">
              Selected range: {dateRange.label}. Team tracked time: {totalWorkHours} hours.
            </p>
          </div>
          <TrackedHoursChart />
        </DashboardCard>
      </div>
   );
}
