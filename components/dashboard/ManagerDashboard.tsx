import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LeaveRequest } from "@/models/LeaveRequest";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";

type Props = { userId: string };

export default async function ManagerDashboard({ userId }: Props) {
  await connectDB();

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
  const teamOnBreak = await TimeSession.countDocuments({
    user: { $in: teamIds },
    date: dateStr,
    $expr: { $gt: ["$totalBreakMinutes", 0] }
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

  // Create attendance map for team
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
      attendanceMap[userId].userName = (session as any).user?.firstName + " " + (session as any).user?.lastName;
    }
  });

  // Project-wise task progress
  const projects = await Project.find({
    members: { $in: [userId] }
  })
    .select("name _id status")
    .lean();

  const projectTaskStats = await Promise.all(
    projects.map(async (project: any) => {
      const tasks = await Task.aggregate([
        { $match: { project: project._id, isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);

      return {
        projectId: project._id,
        projectName: project.name,
        stats: {
          backlog: tasks.find((t: any) => t._id === "backlog")?.count || 0,
          todo: tasks.find((t: any) => t._id === "todo")?.count || 0,
          inProgress: tasks.find((t: any) => t._id === "in_progress")?.count || 0,
          inReview: tasks.find((t: any) => t._id === "in_review")?.count || 0,
          done: tasks.find((t: any) => t._id === "done")?.count || 0
        }
      };
    })
  );

  // Tasks assigned to team members
  const teamTasks = await Task.find({
    assignee: { $in: teamIds },
    isDeleted: false,
    status: { $ne: "done" }
  })
    .populate("assignee", "firstName lastName")
    .populate("project", "name")
    .sort({ dueDate: 1 })
    .limit(10)
    .lean();

  // Pending leave requests to approve/reject
  const pendingLeaveRequests = await LeaveRequest.find({
    user: { $in: teamIds },
    status: "pending"
  })
    .populate("user", "firstName lastName email")
    .populate("leaveType", "name")
    .sort({ appliedAt: -1 })
    .limit(5)
    .lean();

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiCard label="Team Members" value={teamSize} />
        <KpiCard label="Checked In Today" value={teamCheckedInToday} subtext={`of ${teamSize}`} />
        <KpiCard label="On Break" value={teamOnBreak} />
        <KpiCard label="Pending Approvals" value={pendingLeaves} highlight={pendingLeaves > 0} />
        <KpiCard label="Active Projects" value={activeProjects} />
      </div>

      {/* Team Attendance Status */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Team Attendance (Today)</h3>
        {team.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {team.map((member: any) => {
              const attendance = attendanceMap[member._id.toString()];
              return (
                <div
                  key={member._id}
                  className={`rounded border p-3 ${
                    attendance.status === "active"
                      ? "border-green-700 bg-green-900/10"
                      : attendance.status === "checked-out"
                      ? "border-blue-700 bg-blue-900/10"
                      : "border-red-700 bg-red-900/10"
                  }`}
                >
                  <p className="font-medium text-sm">{member.firstName} {member.lastName}</p>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={`px-2 py-1 rounded ${
                      attendance.status === "active"
                        ? "bg-green-900/30 text-green-300"
                        : attendance.status === "checked-out"
                        ? "bg-blue-900/30 text-blue-300"
                        : "bg-red-900/30 text-red-300"
                    }`}>
                      {attendance.status === "active" ? "✓ Active" : attendance.status === "checked-out" ? "Checked Out" : "Absent"}
                    </span>
                    {attendance.clockIn && (
                      <span className="text-slate-400">
                        {new Date(attendance.clockIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No team members assigned</p>
        )}
      </div>

      {/* Project-wise Task Progress */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Project-wise Task Progress</h3>
        {projectTaskStats.length > 0 ? (
          <div className="space-y-4">
            {projectTaskStats.map((proj: any) => {
              const totalTasks =
                proj.stats.backlog + proj.stats.todo + proj.stats.inProgress + proj.stats.inReview + proj.stats.done;
              const completionRate = totalTasks > 0 ? Math.round((proj.stats.done / totalTasks) * 100) : 0;

              return (
                <div key={proj.projectId} className="rounded border border-slate-700 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-medium">{proj.projectName}</p>
                    <span className="text-xs text-blue-400">{completionRate}% Complete</span>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div className="flex-1">
                      <span className="text-slate-400">Backlog</span>
                      <p className="font-bold text-blue-400">{proj.stats.backlog}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-400">Todo</span>
                      <p className="font-bold text-slate-300">{proj.stats.todo}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-400">In Progress</span>
                      <p className="font-bold text-yellow-400">{proj.stats.inProgress}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-400">In Review</span>
                      <p className="font-bold text-orange-400">{proj.stats.inReview}</p>
                    </div>
                    <div className="flex-1">
                      <span className="text-slate-400">Done</span>
                      <p className="font-bold text-green-400">{proj.stats.done}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No projects assigned</p>
        )}
      </div>

      {/* Team Tasks This Week */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Assigned Tasks (Not Done)</h3>
        {teamTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="text-left py-2">Task</th>
                  <th className="text-left py-2">Assigned To</th>
                  <th className="text-left py-2">Project</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {teamTasks.map((task: any) => (
                  <tr key={task._id} className="hover:bg-slate-900/30">
                    <td className="py-3 max-w-xs truncate">{task.title}</td>
                    <td className="py-3">{(task as any).assignee?.firstName}</td>
                    <td className="py-3">{(task as any).project?.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        task.status === "in_progress" ? "bg-yellow-900/30 text-yellow-400" :
                        task.status === "in_review" ? "bg-orange-900/30 text-orange-400" :
                        "bg-slate-900/30 text-slate-300"
                      }`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-xs">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">No pending tasks</p>
        )}
      </div>

      {/* Pending Leave Requests */}
      <div className="rounded-lg border border-slate-700 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Pending Leave Approvals</h3>
          {pendingLeaves > 0 && (
            <span className="rounded-full bg-yellow-900/30 px-3 py-1 text-xs font-semibold text-yellow-400">{pendingLeaves} Pending</span>
          )}
        </div>
        {pendingLeaveRequests.length > 0 ? (
          <div className="space-y-2">
            {pendingLeaveRequests.map((req: any) => (
              <div key={req._id} className="rounded bg-slate-900/30 p-4 border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{req.user?.firstName} {req.user?.lastName}</p>
                    <p className="text-xs text-slate-400">
                      {req.leaveType?.name} • {req.startDate} to {req.endDate} • {req.duration.replace("-", " ")}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{req.reason}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded bg-green-900/30 px-3 py-1 text-xs text-green-400 hover:bg-green-900/50">
                      Approve
                    </button>
                    <button className="rounded bg-red-900/30 px-3 py-1 text-xs text-red-400 hover:bg-red-900/50">
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded bg-green-900/20 p-4 text-center text-sm text-green-200 border border-green-700">
            ✓ No pending leave requests
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, subtext, highlight }: any) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-yellow-700 bg-yellow-900/10" : "border-slate-700"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-yellow-400" : ""}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
