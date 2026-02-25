import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LeaveRequest } from "@/models/LeaveRequest";
import { TimeSession } from "@/models/TimeSession";
import { LeaveBalance } from "@/models/LeaveBalance";
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
  UserCheck
} from "lucide-react";
import Link from "next/link";
import WelcomeHeader from "./shared/WelcomeHeader";
import StatsCard from "./shared/StatsCard";
import DashboardCard from "./shared/DashboardCard";

export default async function HRDashboard() {
  await connectDB();

  // Simulated HR User details
  const hrUser = { firstName: "HR", lastName: "Specialist" };

  // Get today's date
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Employee metrics
  const totalEmployees = await User.countDocuments({ isDeleted: false });
  const activeEmployees = await User.countDocuments({ isDeleted: false, isActive: true });
  const inactiveEmployees = totalEmployees - activeEmployees;

  // Attendance metrics for today
  const checkedInToday = await TimeSession.countDocuments({ date: dateStr });
  const attendanceRate = totalEmployees > 0 ? Math.round((checkedInToday / activeEmployees) * 100) : 0;

  // Leave metrics
  const pendingLeaves = await LeaveRequest.countDocuments({ status: "pending" });
  const approvedLeaves = await LeaveRequest.countDocuments({ status: "approved" });

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Row 1: Welcome */}
      <WelcomeHeader
        firstName={hrUser.firstName}
        lastName={hrUser.lastName}
        progress={attendanceRate}
      />

      {/* Row 2: HR Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Total Employees"
          value={totalEmployees}
          subtext={`${activeEmployees} Active`}
          icon={<Users className="h-6 w-6" />}
          color="blue"
          delay={0.1}
        />
        <StatsCard
          label="Checked In Today"
          value={checkedInToday}
          subtext={`${attendanceRate}% Compliance`}
          icon={<UserCheck className="h-6 w-6" />}
          color="green"
          delay={0.2}
          trend={{ value: 4, isPositive: true }}
        />
        <StatsCard
          label="Pending Leaves"
          value={pendingLeaves}
          subtext="Needs Approval"
          icon={<Calendar className="h-6 w-6" />}
          color="yellow"
          delay={0.3}
          trend={{ value: 12, isPositive: false }}
        />
        <StatsCard
          label="New Joiners"
          value={2}
          subtext="This Month"
          icon={<UserPlus className="h-6 w-6" />}
          color="purple"
          delay={0.4}
        />
      </div>

      {/* Row 3: Main HR Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Requests */}
        <DashboardCard className="lg:col-span-2" delay={0.5}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Clock4 className="h-5 w-5 text-yellow-400" />
              Pending Leave Requests
            </h3>
            <Link href="/leaves" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {pendingLeaveRequests.length > 0 ? (
              pendingLeaveRequests.map((req: any) => (
                <div key={req._id} className="group flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border border-slate-700 bg-slate-800 flex items-center justify-center text-blue-400 font-bold">
                      {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                        {req.user?.firstName} {req.user?.lastName}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {req.leaveType?.name} • {req.duration.replace("-", " ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="hidden md:block text-right">
                      <p className="text-xs text-slate-400">Status</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Pending</p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <CheckCircle2 className="h-12 w-12 mb-4 text-green-500/20" />
                <p>All clear! No pending requests.</p>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Recent Activity/Approvals */}
        <DashboardCard delay={0.6}>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            Recent Approvals
          </h3>
          <div className="space-y-6">
            {recentApprovals.length > 0 ? (
              recentApprovals.map((req: any) => (
                <div key={req._id} className="flex gap-4">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-2 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-white">{req.user?.firstName} {req.user?.lastName}</h4>
                    <p className="text-xs text-slate-400 mb-1">{req.leaveType?.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatDistanceToNow(new Date(req.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No recent approvals found.</p>
            )}
          </div>
          <Link href="/employees" className="w-full mt-8 block text-center py-3 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-sm hover:bg-slate-700 transition-colors">
            Manage Employees
          </Link>
        </DashboardCard>
      </div>

      {/* Employee Quick View */}
      <DashboardCard delay={0.7}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Employee Overview
          </h3>
          <div className="flex gap-2">
            <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase">
              {activeEmployees} Active
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-[10px] font-bold text-slate-500 uppercase">
              {inactiveEmployees} Inactive
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase font-bold">Attendance Today</span>
              <span className="text-xs font-bold text-blue-400">{attendanceRate}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${attendanceRate}%` }} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase font-bold">Leave Requests Rate</span>
              <span className="text-xs font-bold text-yellow-400">14%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-500" style={{ width: '14%' }} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/30 border border-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500 uppercase font-bold">Hiring Progress</span>
              <span className="text-xs font-bold text-purple-400">65%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: '65%' }} />
            </div>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}

