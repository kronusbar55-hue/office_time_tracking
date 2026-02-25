import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import { LeaveRequest } from "@/models/LeaveRequest";
import { AuditLog } from "@/models/AuditLog";
import { CheckInOut } from "@/models/CheckInOut";
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
import TaskDonutChart from "./shared/TaskDonutChart";
import WeeklyAttendanceChart from "./shared/WeeklyAttendanceChart";

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

  // Attendance data for today
  const checkedInToday = await TimeSession.countDocuments({ date: dateStr, status: "active" });
  const onBreakToday = await TimeSession.countDocuments({
    date: dateStr,
    status: "active",
    $expr: { $gt: ["$totalBreakMinutes", 0] }
  });
  const notCheckedInToday = activeEmployees - checkedInToday;

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
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  });

  const weeklyAttendance = await CheckInOut.aggregate([
    { $match: { date: { $in: last7Days } } },
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

      {/* Row 2: Admin Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <StatsCard
          label="Total Employees"
          value={totalEmployees}
          icon={<Users className="h-6 w-6" />}
          color="blue"
          delay={0.1}
        />
        <StatsCard
          label="Checked In"
          value={checkedInToday}
          subtext={`of ${activeEmployees}`}
          icon={<Clock className="h-6 w-6" />}
          color="green"
          delay={0.2}
        />
        <StatsCard
          label="On Break"
          value={onBreakToday}
          icon={<Coffee className="h-6 w-6" />}
          color="yellow"
          delay={0.3}
        />
        <StatsCard
          label="Absent"
          value={notCheckedInToday}
          icon={<UserMinus className="h-6 w-6" />}
          color="orange"
          delay={0.4}
        />
        <StatsCard
          label="Pending Leaves"
          value={pendingLeaves}
          icon={<Calendar className="h-6 w-6" />}
          color="purple"
          trend={{ value: 5, isPositive: true }}
          delay={0.5}
        />
        <StatsCard
          label="Attendance"
          value={`${attendanceRate}%`}
          icon={<Activity className="h-6 w-6" />}
          color="blue"
          delay={0.6}
        />
      </div>

      {/* Row 3: Weekly Progress & Recent Logins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard delay={0.8}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <LogIn className="h-5 w-5 text-green-400" />
              Recent Logins
            </h3>
          </div>
          <div className="space-y-4">
            {recentLogins.map((log: any) => (
              <div key={log._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400">
                    {log.user?.firstName?.[0]}{log.user?.lastName?.[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">{log.user?.firstName}</h4>
                    <p className="text-[10px] text-slate-500">{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-mono">{log.ipAddress?.slice(0, 12)}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      {/* Row 4: Recent Attendance & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard delay={1.0} className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-400" />
              Latest Leaves
            </h3>
            <Link href="/leaves" className="text-xs text-slate-400 hover:text-white transition-colors">View All</Link>
          </div>
          <div className="overflow-hidden">
            <div className="space-y-3">
              {latestLeaves.map((leave: any) => (
                <div key={leave._id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-xs">
                      {leave.user?.firstName?.[0]}{leave.user?.lastName?.[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{leave.user?.firstName} {leave.user?.lastName}</h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{leave.leaveType?.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${leave.status === "pending" ? "bg-yellow-500/10 text-yellow-500" :
                      leave.status === "approved" ? "bg-green-500/10 text-green-500" :
                        "bg-red-500/10 text-red-500"
                      }`}>
                      {leave.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

