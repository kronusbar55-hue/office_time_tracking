import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LeaveRequest } from "@/models/LeaveRequest";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import {
  Users,
  Clock,
  Calendar,
  Activity,
  Briefcase,
  Layers,
  CheckSquare,
  ChevronRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import WelcomeHeader from "./shared/WelcomeHeader";
import StatsCard from "./shared/StatsCard";
import DashboardCard from "./shared/DashboardCard";
import TaskDonutChart from "./shared/TaskDonutChart";

type Props = { userId: string };

export default async function ManagerDashboard({ userId }: Props) {
  await connectDB();

  // Get current user for greeting
  const manager = await User.findById(userId).select("firstName lastName").lean();

  // Get today's date
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Get team members
  const team = await User.find({ manager: userId, isDeleted: false, isActive: true })
    .select("firstName lastName email")
    .lean();
  const teamIds = team.map((t) => t._id);

  // KPI Data
  const teamSize = team.length;
  const teamCheckedInToday = await TimeSession.countDocuments({
    user: { $in: teamIds },
    date: dateStr
  });

  // Pending approvals
  const pendingLeaves = await LeaveRequest.countDocuments({
    user: { $in: teamIds },
    status: "pending"
  });

  // Active projects by manager
  const activeProjects = await Project.countDocuments({
    members: { $in: [userId] },
    status: "active"
  });

  // Team attendance details for today
  const teamAttendance = await TimeSession.find({
    user: { $in: teamIds },
    date: dateStr
  })
    .populate("user", "firstName lastName")
    .lean();

  // Attendance map
  const attendanceMap: { [key: string]: any } = {};
  team.forEach((member: any) => {
    attendanceMap[member._id.toString()] = {
      ...member,
      status: "absent",
      clockIn: null
    };
  });

  teamAttendance.forEach((session: any) => {
    const userId = session.user._id.toString();
    if (attendanceMap[userId]) {
      attendanceMap[userId].status = session.clockOut ? "checked-out" : "active";
      attendanceMap[userId].clockIn = session.clockIn;
    }
  });

  // Project task stats for chart
  const teamTasksByStatus = await Task.aggregate([
    { $match: { assignee: { $in: teamIds }, isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const stats = {
    backlog: teamTasksByStatus.find((t: any) => t._id === "backlog")?.count || 0,
    todo: teamTasksByStatus.find((t: any) => t._id === "todo")?.count || 0,
    inProgress: teamTasksByStatus.find((t: any) => t._id === "in_progress")?.count || 0,
    inReview: teamTasksByStatus.find((t: any) => t._id === "in_review")?.count || 0,
    done: teamTasksByStatus.find((t: any) => t._id === "done")?.count || 0
  };

  const teamAttendanceRate = teamSize > 0 ? Math.round((teamCheckedInToday / teamSize) * 100) : 0;

  // Pending leave requests
  const pendingLeaveRequests = await LeaveRequest.find({
    user: { $in: teamIds },
    status: "pending"
  })
    .populate("user", "firstName lastName email")
    .populate("leaveType", "name")
    .sort({ appliedAt: -1 })
    .limit(3)
    .lean();

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Row 1: Welcome */}
      <WelcomeHeader
        firstName={manager?.firstName}
        lastName={manager?.lastName}
        progress={teamAttendanceRate}
      />

      {/* Row 2: Manager Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          label="Team Size"
          value={teamSize}
          subtext="Active members"
          icon={<Users className="h-6 w-6" />}
          color="blue"
          delay={0.1}
        />
        <StatsCard
          label="Team Present"
          value={teamCheckedInToday}
          subtext={`${teamAttendanceRate}% Today`}
          icon={<UserCheck className="h-6 w-6" />}
          color="green"
          delay={0.2}
          trend={{ value: 5, isPositive: true }}
        />
        <StatsCard
          label="Pending Approvals"
          value={pendingLeaves}
          subtext="Leave requests"
          icon={<Calendar className="h-6 w-6" />}
          color="yellow"
          delay={0.3}
          trend={{ value: 2, isPositive: false }}
        />
        <StatsCard
          label="Active Projects"
          value={activeProjects}
          subtext="Managed by you"
          icon={<Briefcase className="h-6 w-6" />}
          color="purple"
          delay={0.4}
        />
      </div>

      {/* Row 3: Visual Team Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard className="lg:col-span-2" delay={0.5}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Team Task Distribution
            </h3>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2">
              <TaskDonutChart data={stats} />
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              {Object.entries(stats).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${key === 'backlog' ? 'bg-blue-400' :
                      key === 'todo' ? 'bg-slate-400' :
                        key === 'inProgress' ? 'bg-yellow-400' :
                          key === 'inReview' ? 'bg-orange-400' : 'bg-green-400'
                      }`} />
                    <span className="text-sm font-medium text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{value as number}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard delay={0.6}>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-green-400" />
            Live Team Activity
          </h3>
          <div className="space-y-4">
            {team.length > 0 ? (
              team.slice(0, 5).map((member: any) => {
                const attendance = attendanceMap[member._id.toString()];
                return (
                  <div key={member._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border ${attendance.status === 'active' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                        attendance.status === 'checked-out' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                          'bg-slate-500/10 border-slate-500/20 text-slate-500'
                        }`}>
                        {member.firstName[0]}{member.lastName[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{member.firstName}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${attendance.status === 'active' ? 'text-green-500' :
                      attendance.status === 'checked-out' ? 'text-blue-500' : 'text-slate-500'
                      }`}>
                      {attendance.status}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-slate-500 text-sm">No team members assigned.</p>
            )}
          </div>
          <Link href="/attendance" className="w-full mt-6 block text-center py-2 text-xs font-bold text-blue-400 hover:text-white transition-colors">
            View All Team Activity
          </Link>
        </DashboardCard>
      </div>

      {/* Row 4: Pending Approvals */}
      <DashboardCard delay={0.7}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-yellow-400" />
            Pending Team Approvals
          </h3>
          <Link href="/leaves" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">
            View All
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingLeaveRequests.length > 0 ? (
            pendingLeaveRequests.map((req: any) => (
              <div key={req._id} className="flex flex-col p-5 rounded-2xl bg-slate-800/30 border border-white/5 hover:border-yellow-500/30 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-500 font-bold">
                    {req.user?.firstName?.[0]}{req.user?.lastName?.[0]}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{req.user?.firstName} {req.user?.lastName}</h4>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">{req.leaveType?.name}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-slate-300 line-clamp-2">{req.reason}</p>
                  <p className="text-[10px] text-slate-500">{req.startDate} to {req.endDate}</p>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button className="flex-1 py-2 rounded-xl bg-green-500/10 text-green-500 border border-green-500/20 text-xs font-bold hover:bg-green-500 hover:text-white transition-all">
                    Approve
                  </button>
                  <button className="flex-1 py-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-bold hover:bg-red-500 hover:text-white transition-all">
                    Reject
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-500">
              <CheckSquare className="h-12 w-12 mb-4 opacity-10" />
              <p>No pending approvals. Your team is all caught up!</p>
            </div>
          )}
        </div>
      </DashboardCard>
    </div>
  );
}

