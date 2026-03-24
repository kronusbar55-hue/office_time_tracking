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
  UserCheck,
  AlertCircle,
  Target,
  Zap,
  BarChart3
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
  const teamSize = team.length;

  // KPI Data from EmployeeMonitor
  const { EmployeeMonitor } = await import("@/models/EmployeeMonitor");
  const uniqueTeamToday = await EmployeeMonitor.distinct("userId", { 
    userId: { $in: teamIds.map((id: any) => id.toString()) }, 
    date: dateStr 
  });
  const teamCheckedInToday = uniqueTeamToday.length;

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

  // Team attendance details for today from EmployeeMonitor
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
    const userId = session._id;
    if (attendanceMap[userId]) {
      const rawStatus = (session.latestStatus || "").toUpperCase();
      if (rawStatus === "ON_BREAK") {
        attendanceMap[userId].status = "on-break";
      } else if (rawStatus === "OFFLINE" || rawStatus === "CHECKED_OUT") {
        attendanceMap[userId].status = "checked-out";
      } else {
        attendanceMap[userId].status = "active";
      }
      attendanceMap[userId].clockIn = session.lastTime;
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

  // Calculate total tasks and completion rate
  const totalTasks = Object.values(stats).reduce((sum, val) => sum + (val as number), 0);
  const completedTasks = stats.done;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get overdue tasks
  const now = new Date();
  const overdueTasksCount = await Task.countDocuments({
    assignee: { $in: teamIds },
    isDeleted: false,
    dueDate: { $lt: now },
    status: { $ne: "done" }
  });

  // Get high-priority tasks
  const highPriorityTasksCount = await Task.countDocuments({
    assignee: { $in: teamIds },
    isDeleted: false,
    priority: { $in: ["High", "Critical"] },
    status: { $ne: "done" }
  });

  // Get projects stats
  const allProjects = await Project.find({ members: { $in: [userId] } })
    .select("_id status name")
    .lean();
  
  const projectStats = {
    active: allProjects.filter((p: any) => p.status === "active").length,
    onHold: allProjects.filter((p: any) => p.status === "on_hold").length,
    completed: allProjects.filter((p: any) => p.status === "completed").length,
    total: allProjects.length
  };

  // Get upcoming approvals (pending leaves in next 7 days)
  const upcomingDate = new Date();
  upcomingDate.setDate(upcomingDate.getDate() + 7);
  
  const approvalsPending = await LeaveRequest.countDocuments({
    user: { $in: teamIds },
    status: "pending"
  });

  // Get recent completed tasks for momentum
  const tasksCompletedThisWeek = await Task.countDocuments({
    assignee: { $in: teamIds },
    isDeleted: false,
    status: "done",
    updatedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
  });

  // Get unassigned tasks in team projects
  const projectIds = allProjects.map((p: any) => p._id);
  const unassignedTasksCount = await Task.countDocuments({
    project: { $in: projectIds },
    assignee: null,
    isDeleted: false,
    status: { $ne: "done" }
  });

  // Get team's weekly hours (summarized)
  const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const teamWorkMinutes = await TimeSession.aggregate([
    {
      $match: {
        userId: { $in: teamIds.map((id: any) => id.toString()) },
        startTime: { $gte: weekAgoDate }
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

  // Calculate team performance metrics
  const avgTasksPerMember = teamSize > 0 ? Math.round(totalTasks / teamSize) : 0;
  const avgCompletedPerMember = teamSize > 0 ? Math.round(completedTasks / teamSize) : 0;

  const teamAttendanceRate = teamSize > 0 ? Math.round((teamCheckedInToday / teamSize) * 100) : 0;

  // Get recent task activities for timeline
  const TaskActivityLog = (await import("@/models/TaskActivityLog")).default;
  const teamTaskIds = await Task.find({ assignee: { $in: teamIds }, isDeleted: false })
    .select("_id")
    .lean();
  
  const recentActivities = await TaskActivityLog.find({
    task: { $in: teamTaskIds.map((t: any) => t._id) }
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate("user", "firstName lastName email")
    .populate("task", "key title project")
    .lean();

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Row 1: Welcome */}
      <WelcomeHeader
        firstName={(manager as any)?.firstName}
        lastName={(manager as any)?.lastName}
        progress={teamAttendanceRate}
      />

      {/* Row 2: Key KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total Tasks */}
        <DashboardCard delay={0.1} className="lg:col-span-1">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <CheckSquare className="h-5 w-5 text-blue-400" />
              <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">Tasks</span>
            </div>
            <div className="text-3xl font-bold text-text-primary">{totalTasks}</div>
            <div className="text-xs text-text-secondary mt-2">{completedTasks} completed</div>
            <div className="mt-auto pt-3 border-t border-border-color/40">
              <span className="text-xs font-bold text-green-400">{completionRate}% Done</span>
            </div>
          </div>
        </DashboardCard>

        {/* Active Projects */}
        <DashboardCard delay={0.15} className="lg:col-span-1">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Briefcase className="h-5 w-5 text-indigo-400" />
              <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">Projects</span>
            </div>
            <div className="text-3xl font-bold text-text-primary">{projectStats.active}</div>
            <div className="text-xs text-text-secondary mt-2">{projectStats.total} total</div>
            <div className="mt-auto pt-3 border-t border-border-color/40">
              <span className="text-xs font-bold text-indigo-400">{projectStats.onHold} on hold</span>
            </div>
          </div>
        </DashboardCard>

        {/* Overdue Tasks */}
        <DashboardCard delay={0.2} className="lg:col-span-1">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">Overdue</span>
            </div>
            <div className="text-3xl font-bold text-rose-400">{overdueTasksCount}</div>
            <div className="text-xs text-text-secondary mt-2">require attention</div>
            {overdueTasksCount > 0 && (
              <div className="mt-auto pt-3 border-t border-border-color/40">
                <Link href="/tasks" className="text-xs font-bold text-rose-400 hover:text-rose-300">
                  View →
                </Link>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* High Priority */}
        <DashboardCard delay={0.25} className="lg:col-span-1">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-yellow-400" />
              <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">Priority</span>
            </div>
            <div className="text-3xl font-bold text-yellow-400">{highPriorityTasksCount}</div>
            <div className="text-xs text-text-secondary mt-2">high/critical</div>
            {highPriorityTasksCount > 0 && (
              <div className="mt-auto pt-3 border-t border-border-color/40">
                <Link href="/tasks?priority=High" className="text-xs font-bold text-yellow-400 hover:text-yellow-300">
                  View →
                </Link>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Approvals Pending */}
        <DashboardCard delay={0.3} className="lg:col-span-1">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-5 w-5 text-orange-400" />
              <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">Approvals</span>
            </div>
            <div className="text-3xl font-bold text-text-primary">{approvalsPending}</div>
            <div className="text-xs text-text-secondary mt-2">leave requests</div>
            {approvalsPending > 0 && (
              <div className="mt-auto pt-3 border-t border-border-color/40">
                <Link href="/leaves" className="text-xs font-bold text-orange-400 hover:text-orange-300">
                  Review →
                </Link>
              </div>
            )}
          </div>
        </DashboardCard>

        {/* Team Members */}
        <DashboardCard delay={0.35} className="lg:col-span-1">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">Team</span>
            </div>
            <div className="text-3xl font-bold text-text-primary">{teamSize}</div>
            <div className="text-xs text-text-secondary mt-2">{teamCheckedInToday} checked in</div>
            <div className="mt-auto pt-3 border-t border-border-color/40">
              <span className="text-xs font-bold text-emerald-400">{teamAttendanceRate}% attendance</span>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Row 3: Team Performance & Task Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Summary */}
        <DashboardCard delay={0.4}>
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            Team Performance
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Avg Tasks/Member</span>
                <span className="text-sm font-bold text-text-primary">{avgTasksPerMember}</span>
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-2">
                <div className="bg-cyan-400 h-2 rounded-full" style={{ width: `${Math.min((avgTasksPerMember / 20) * 100, 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Completed/Member</span>
                <span className="text-sm font-bold text-text-primary">{avgCompletedPerMember}</span>
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: `${Math.min((avgCompletedPerMember / avgTasksPerMember * 100 || 0), 100)}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-text-secondary">Team Work Hours (7d)</span>
                <span className="text-sm font-bold text-text-primary">{totalWorkHours} hrs</span>
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-2">
                <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${Math.min((totalWorkHours / 168) * 100, 100)}%` }}></div>
              </div>
            </div>

            <div className="border-t border-border-color/40 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">This Week Completed</span>
                <span className="text-sm font-bold text-green-400">{tasksCompletedThisWeek} tasks</span>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Task Distribution */}
        <DashboardCard className="lg:col-span-2" delay={0.45}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-400" />
              Team Task Distribution
            </h3>
            <span className="text-sm font-bold text-text-primary bg-bg-secondary/40 px-3 py-1 rounded-full">
              {totalTasks} tasks
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Chart */}
            <div className="md:col-span-5 flex items-center justify-center">
              <TaskDonutChart data={stats} />
            </div>
            
            {/* Stats List */}
            <div className="md:col-span-7 space-y-3">
              {[
                { key: 'backlog', label: 'Backlog', color: 'bg-blue-400' },
                { key: 'todo', label: 'To Do', color: 'bg-slate-400' },
                { key: 'inProgress', label: 'In Progress', color: 'bg-yellow-400' },
                { key: 'inReview', label: 'In Review', color: 'bg-orange-400' },
                { key: 'done', label: 'Done', color: 'bg-green-400' }
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
                        <span className="text-[11px] text-text-secondary ml-2">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-bg-secondary rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${color}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              
              {/* Summary */}
              <div className="border-t border-border-color/40 pt-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Completion</p>
                    <p className="text-base font-bold text-green-400">{completionRate}%</p>
                  </div>
                  <div className="p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Active</p>
                    <p className="text-base font-bold text-yellow-400">{stats.inProgress + stats.inReview}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Row 4: Team Activity & Risk Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <DashboardCard delay={0.5} className="lg:col-span-2">
          <div className="space-y-6">
            {/* Live Status Section */}
            <div>
              <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-green-400" />
                Live Team Status
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {team.length > 0 ? (
                  team.slice(0, 6).map((member: any) => {
                    const attendance = attendanceMap[member._id.toString()];
                    return (
                      <div key={member._id} className="flex items-center gap-2 p-2 rounded-lg bg-card-bg/30 border border-border-color/30 hover:border-border-color transition-colors">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${attendance.status === 'active' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                          attendance.status === 'on-break' ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500' :
                          attendance.status === 'checked-out' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                            'bg-slate-500/10 border-slate-500/30 text-text-secondary'
                          }`}>
                          {member.firstName[0]}{member.lastName[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">{member.firstName}</p>
                          <p className={`text-[9px] font-bold uppercase tracking-wider ${attendance.status === 'active' ? 'text-green-500' :
                            attendance.status === 'on-break' ? 'text-yellow-500' :
                            attendance.status === 'checked-out' ? 'text-blue-500' : 'text-text-secondary'
                            }`}>
                            {attendance.status}
                          </p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-text-secondary text-xs col-span-3">No team members assigned.</p>
                )}
              </div>
            </div>

            {/* Activity Timeline Section */}
            <div className="border-t border-border-color/40 pt-4">
              <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-cyan-400" />
                Recent Task Activity
              </h3>
              <div className="space-y-3">
                {(recentActivities as any).length > 0 ? (
                  (recentActivities as any).map((activity: any, idx: number) => (
                    <div key={activity._id} className="flex gap-3 pb-3 last:pb-0 last:border-0 border-b border-border-color/20">
                      <div className="flex flex-col items-center">
                        <div className="h-3 w-3 rounded-full bg-cyan-400 mt-1"></div>
                        {idx < (recentActivities as any).length - 1 && (
                          <div className="h-6 w-0.5 bg-border-color/30 mt-1"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-text-primary truncate">
                              <Link href={`/tasks/${activity.task._id}`} className="text-cyan-400 hover:text-cyan-300">
                                {activity.task.key}
                              </Link>
                              {" "}<span className="text-text-secondary">{activity.task.title}</span>
                            </p>
                            <p className="text-[11px] text-text-secondary mt-0.5">
                              <span className="text-[10px] font-semibold text-text-primary">{activity.user?.firstName} {activity.user?.lastName}</span>
                              {" "}
                              <span>
                                {activity.eventType?.replace(/_/g, ' ').toLowerCase()}
                              </span>
                            </p>
                          </div>
                          {activity.newValue && (
                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded whitespace-nowrap">
                              {String(activity.newValue).substring(0, 15)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary/70 mt-1">
                          {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-text-secondary text-xs">No recent activities</p>
                )}
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Risk Indicators */}
        <DashboardCard delay={0.55}>
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-rose-400" />
            Risk Indicators
          </h3>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary">Overdue Tasks</span>
                <span className="text-sm font-bold text-rose-400">{overdueTasksCount}</span>
              </div>
              {overdueTasksCount > 0 && (
                <p className="text-xs text-rose-400/70">Immediate action needed</p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary">Unassigned Tasks</span>
                <span className="text-sm font-bold text-yellow-400">{unassignedTasksCount}</span>
              </div>
              {unassignedTasksCount > 0 && (
                <p className="text-xs text-yellow-400/70">Need assignment</p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary">Pending Approvals</span>
                <span className="text-sm font-bold text-blue-400">{approvalsPending}</span>
              </div>
              {approvalsPending > 0 && (
                <p className="text-xs text-blue-400/70">Awaiting your review</p>
              )}
            </div>

            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-secondary">Completed (7d)</span>
                <span className="text-sm font-bold text-orange-400">{tasksCompletedThisWeek}</span>
              </div>
              <p className="text-xs text-orange-400/70">Great momentum!</p>
            </div>
          </div>
        </DashboardCard>

        {/* Project Overview */}
        <DashboardCard delay={0.6}>
          <h3 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-400" />
            Projects Overview
          </h3>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-secondary">Active</span>
                <span className="text-sm font-bold text-indigo-400">{projectStats.active}</span>
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-2">
                <div className="bg-indigo-400 h-2 rounded-full" style={{ width: `${(projectStats.active / projectStats.total * 100) || 0}%` }}></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-secondary">Completed</span>
                <span className="text-sm font-bold text-emerald-400">{projectStats.completed}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-500/10 border border-slate-500/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-secondary">On Hold</span>
                <span className="text-sm font-bold text-slate-400">{projectStats.onHold}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-border-color/40">
              <Link href="/projects" className="text-xs font-bold text-indigo-400 hover:text-indigo-300">
                Manage Projects →
              </Link>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
}

