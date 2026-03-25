import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LeaveRequest } from "@/models/LeaveRequest";
import { TimeSession } from "@/models/TimeSession";
import { LeaveBalance } from "@/models/LeaveBalance";
import { Technology } from "@/models/Technology";
import { Project } from "@/models/Project";
import { Announcement } from "@/models/Announcement";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock4,
  UserPlus,
  Briefcase,
  ChevronRight,
  UserCheck,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Megaphone
} from "lucide-react";
import Link from "next/link";
import WelcomeHeader from "./shared/WelcomeHeader";
import StatsCard from "./shared/StatsCard";
import DashboardCard from "./shared/DashboardCard";
import TrackedHoursChart from "./shared/TrackedHoursChart";
import { resolveDashboardDateRange, type DashboardFilterInput } from "@/lib/dashboardDateRange";

type Props = {
  userId: string;
  filters?: DashboardFilterInput;
};

export default async function HRDashboard({ userId, filters }: Props) {
  await connectDB();

  const dateRange = resolveDashboardDateRange(filters);
  const { getMonitorStats } = await import("@/lib/monitorUtils");
  const monitorStats = await getMonitorStats(userId, dateRange.startDate, dateRange.endDate);
  const hoursWorked = Math.round((monitorStats.reduce((sum, day) => sum + day.workedMinutes, 0) / 60) * 10) / 10;

  // Simulated HR User details
  const hrUser = { firstName: "HR", lastName: "Specialist" };

  // Get today's date
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Employee metrics
  const totalEmployees = await User.countDocuments({ isDeleted: false });
  const activeEmployees = await User.countDocuments({ isDeleted: false, isActive: true });
  const inactiveEmployees = totalEmployees - activeEmployees;

  // Attendance metrics for today from EmployeeMonitor
  const { EmployeeMonitor } = await import("@/models/EmployeeMonitor");
  const uniqueUsersToday = await EmployeeMonitor.distinct("userId", { date: dateStr });
  const checkedInToday = uniqueUsersToday.length;
  const attendanceRate = activeEmployees > 0 ? Math.round((checkedInToday / activeEmployees) * 100) : 0;

  // Leave metrics
  const pendingLeaves = await LeaveRequest.countDocuments({ status: "pending" });
  const approvedLeaves = await LeaveRequest.countDocuments({ status: "approved" });
  const rejectedLeaves = await LeaveRequest.countDocuments({ status: "rejected" });
  const totalLeaveRequests = pendingLeaves + approvedLeaves + rejectedLeaves;
  const leaveApprovalRate = totalLeaveRequests > 0 ? Math.round((approvedLeaves / totalLeaveRequests) * 100) : 0;

  // Job/skill metrics
  const activeTechnologies = await Technology.countDocuments({ status: "active" });
  const activeProjects = await Project.countDocuments({ status: "active" });

  // HR health metrics
  const attritionRate = totalEmployees > 0 ? Math.round((inactiveEmployees / totalEmployees) * 100) : 0;
  const trainingCompliance = 88; // placeholder for tracked training and certifications

  const usersWithJoin = await User.find({ isDeleted: false, joinDate: { $exists: true } }).select("joinDate").lean();
  const averageTenureMonths = usersWithJoin.length > 0
    ? Math.round(
      usersWithJoin
        .map((u: any) => {
          if (!u.joinDate) return 0;
          return (today.getTime() - new Date(u.joinDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
        })
        .reduce((sum, days) => sum + days, 0) / usersWithJoin.length
    )
    : 0;

  const departmentDistribution = await User.aggregate([
    { $match: { isDeleted: false } },
    { $group: { _id: "$department", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // High-level indicators
  const newJoinersThisMonth = await User.countDocuments({
    isDeleted: false,
    joinDate: { $gte: new Date(today.getFullYear(), today.getMonth(), 1) }
  });

  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  const employeesOnLeaveThisWeek = await LeaveRequest.countDocuments({
    status: "approved",
    startDate: { $lte: endOfWeek.toISOString().split("T")[0] },
    endDate: { $gte: dateStr }
  });

  // Pending leave requests with employee details
  const pendingLeaveRequests = await LeaveRequest.find({ status: "pending" })
    .populate("user", "firstName lastName email")
    .populate("leaveType", "name")
    .populate("manager", "firstName lastName")
    .sort({ appliedAt: -1 })
    .limit(5)
    .lean();

  // Recent approvals
  const recentApprovals = await LeaveRequest.find({ status: "approved" })
    .populate("user", "firstName lastName")
    .populate("leaveType", "name")
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  const announcements = await Announcement.find({ isActive: true })
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(5)
    .lean();

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Row 1: Welcome */}
      <WelcomeHeader
        firstName={hrUser.firstName}
        lastName={hrUser.lastName}
        progress={attendanceRate}
        variant="compact"
      />



      {/* Row 2.5: HR Enrichment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

      </div>

      {/* Row 3: Main HR Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests */}
        <DashboardCard className="lg:col-span-2" delay={0.5}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Clock4 className="h-5 w-5 text-yellow-400" />
              Pending Leave Requests
            </h3>
            <Link href="/leaves" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {pendingLeaveRequests.length > 0 ? (
              pendingLeaveRequests.map((req: any) => (
                <div key={req._id} className="group flex items-center justify-between p-4 rounded-2xl bg-card-bg/30 border border-border-color hover:bg-card-bg/50 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-border-color bg-card-bg flex items-center justify-center text-blue-400 font-bold">
                      {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-text-primary group-hover:text-blue-400 transition-colors">
                        {req.user?.firstName} {req.user?.lastName}
                      </h4>
                      <p className="text-xs text-text-secondary">
                        {req.leaveType?.name} • {req.duration.replace("-", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-text-secondary">Status</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Pending</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
                <CheckCircle2 className="h-12 w-12 mb-4 text-green-500/20" />
                <p>All clear! No pending requests.</p>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Announcements */}
        <DashboardCard className="lg:col-span-1" delay={0.6}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-cyan-400" />
              Recent Announcements
            </h3>
            <Link href="/announcements" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((ann) => (
                <div
                  key={ann._id.toString()}
                  className="rounded-xl border border-border-color bg-card-bg/20 p-4 transition-all hover:bg-card-bg/40 group overflow-hidden relative"
                >
                  {ann.isPinned && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    </div>
                  )}
                  <h4 className="text-sm font-bold text-text-primary group-hover:text-cyan-400 transition-colors truncate mb-1">
                    {ann.title}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-2 mb-2 leading-relaxed">
                    {ann.description}
                  </p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-500/80 px-2 py-0.5 rounded-md bg-cyan-500/10">
                      {ann.category}
                    </span>
                    <span className="text-[10px] text-text-tertiary">
                      {formatDistanceToNow(new Date(ann.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 opacity-40">
                <Megaphone className="h-10 w-10 mb-2" />
                <p className="text-xs">No announcements yet</p>
              </div>
            )}
          </div>
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

