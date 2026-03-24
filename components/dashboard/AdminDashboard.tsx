import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import { LeaveRequest } from "@/models/LeaveRequest";
import { AuditLog } from "@/models/AuditLog";
import { CheckInOut } from "@/models/CheckInOut";
import { EmployeeMonitor } from "@/models/EmployeeMonitor";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Clock,
  Coffee,
  UserMinus,
  Calendar,
  Activity,
  BarChart3,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  LogIn,
  History,
  TrendingUp,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import WelcomeHeader from "./shared/WelcomeHeader";
import StatsCard from "./shared/StatsCard";
import DashboardCard from "./shared/DashboardCard";
import AdminAnalyticsDashboard from "./AdminAnalyticsDashboard";

export default async function AdminDashboard() {
  await connectDB();

  // Get current user (simulated since it's a server component without prop)
  // For the header, we'll keep it general or fetch if needed
  const adminUser = { firstName: "Admin", lastName: "User" };

  // Get today's date range
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // KPI Cards Data
  const totalEmployees = await User.countDocuments({ isDeleted: false });
  const activeEmployees = await User.countDocuments({ isDeleted: false, isActive: true });

  // Attendance data for today from EmployeeMonitor
  const { EmployeeMonitor } = await import("@/models/EmployeeMonitor");
  const uniqueUsersToday = await EmployeeMonitor.distinct("userId", { date: dateStr });
  const checkedInToday = uniqueUsersToday.length;

  // For "On Break", we look at the latest record status for users active today
  const latestRecords = await EmployeeMonitor.aggregate([
    { $match: { date: dateStr, userId: { $in: uniqueUsersToday } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$userId", status: { $first: "$status" } } }
  ]);
  const onBreakToday = latestRecords.filter(r => r.status?.toUpperCase() === "ON_BREAK").length;
  const notCheckedInToday = Math.max(0, activeEmployees - checkedInToday);

  // Leave requests
  const pendingLeaves = await LeaveRequest.countDocuments({ status: "pending" });

  // Tasks overview
  const tasksByStatus = await Task.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  // Projects overview
  const activeProjects = await Project.countDocuments({ status: "active" });
  const delayedProjects = 2; // Simulated for demo

  // Latest leave requests
  const latestLeaves = await LeaveRequest.find()
    .populate("user", "firstName lastName email")
    .populate("leaveType", "name")
    .sort({ appliedAt: -1 })
    .limit(5)
    .lean();

  // Recent Logins
  const recentLogins = await AuditLog.find({ action: "login" })
    .populate("user", "firstName lastName avatarUrl email")
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  // Recent Check-ins (Attendance)
  const recentAttendance = await CheckInOut.find({ date: dateStr })
    .populate("user", "firstName lastName avatarUrl")
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  // Weekly Progress Simulation - Calculate Avg Attendance
  const checkinLast7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  const weeklyAttendance = await CheckInOut.aggregate([
    { $match: { date: { $in: checkinLast7Days } } },
    { $group: { _id: "$date", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const taskStats = {
    backlog: tasksByStatus.find((t: any) => t._id === "backlog")?.count || 0,
    todo: tasksByStatus.find((t: any) => t._id === "todo")?.count || 0,
    inProgress: tasksByStatus.find((t: any) => t._id === "in_progress")?.count || 0,
    inReview: tasksByStatus.find((t: any) => t._id === "in_review")?.count || 0,
    done: tasksByStatus.find((t: any) => t._id === "done")?.count || 0
  };

  const attendanceRate = activeEmployees > 0 ? Math.round((checkedInToday / activeEmployees) * 100) : 0;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Row 1: Welcome */}
      <WelcomeHeader
        firstName={adminUser.firstName}
        lastName={adminUser.lastName}
        progress={attendanceRate}
        showGoalMessage={false}
      />


      {/* Row 3: Analytics Dashboard with Filters */}
      <AdminAnalyticsDashboard />


    </div>
  );
}

