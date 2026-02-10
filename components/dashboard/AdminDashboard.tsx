import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { TimeSession } from "@/models/TimeSession";
import { Task } from "@/models/Task";
import { Project } from "@/models/Project";
import { LeaveRequest } from "@/models/LeaveRequest";
import { formatDistanceToNow } from "date-fns";

export default async function AdminDashboard() {
  await connectDB();

  // Get today's date range
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  const nextDay = new Date(today);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDateStr = nextDay.toISOString().split("T")[0];

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
  const delayedProjects = 0; // Would need dueDate tracking

  // Latest leave requests
  const latestLeaves = await LeaveRequest.find()
    .populate("user", "firstName lastName email")
    .populate("leaveType", "name")
    .sort({ appliedAt: -1 })
    .limit(5)
    .lean();

  const taskStats = {
    backlog: tasksByStatus.find((t: any) => t._id === "backlog")?.count || 0,
    todo: tasksByStatus.find((t: any) => t._id === "todo")?.count || 0,
    inProgress: tasksByStatus.find((t: any) => t._id === "in_progress")?.count || 0,
    inReview: tasksByStatus.find((t: any) => t._id === "in_review")?.count || 0,
    done: tasksByStatus.find((t: any) => t._id === "done")?.count || 0
  };

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
        <KpiCard label="Total Employees" value={totalEmployees} />
        <KpiCard label="Checked In Today" value={checkedInToday} subtext={`of ${activeEmployees}`} />
        <KpiCard label="On Break" value={onBreakToday} />
        <KpiCard label="Not Checked In" value={notCheckedInToday} />
        <KpiCard label="Pending Leaves" value={pendingLeaves} highlight={pendingLeaves > 0} />
        <KpiCard label="Timesheet Compliance" value={`${Math.round((checkedInToday / activeEmployees) * 100)}%`} />
      </div>

      {/* Attendance & Tasks Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-700 p-6">
          <h3 className="mb-4 text-lg font-semibold">Attendance Overview (Today)</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Checked In</span>
              <span className="font-bold">{checkedInToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Checked Out</span>
              <span className="font-bold">-</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">On Break</span>
              <span className="font-bold">{onBreakToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Absent</span>
              <span className="font-bold">{notCheckedInToday}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 p-6">
          <h3 className="mb-4 text-lg font-semibold">Tasks Overview</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Backlog</span>
              <span className="font-bold text-blue-400">{taskStats.backlog}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">In Progress</span>
              <span className="font-bold text-yellow-400">{taskStats.inProgress}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">In Review</span>
              <span className="font-bold text-orange-400">{taskStats.inReview}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Done</span>
              <span className="font-bold text-green-400">{taskStats.done}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Overview */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Projects Overview</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-slate-400">Active Projects</p>
            <p className="text-3xl font-bold">{activeProjects}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Delayed Projects</p>
            <p className="text-3xl font-bold text-red-400">{delayedProjects}</p>
          </div>
        </div>
      </div>

      {/* Latest Leave Requests */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Latest Leave Requests</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-700">
              <tr>
                <th className="text-left py-2">Employee</th>
                <th className="text-left py-2">Type</th>
                <th className="text-left py-2">Dates</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Applied</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {latestLeaves.length > 0 ? (
                latestLeaves.map((leave: any) => (
                  <tr key={leave._id} className="hover:bg-slate-900/30">
                    <td className="py-3">{leave.user?.firstName} {leave.user?.lastName}</td>
                    <td className="py-3">{leave.leaveType?.name}</td>
                    <td className="py-3 text-xs">{leave.startDate} to {leave.endDate}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        leave.status === "pending" ? "bg-yellow-900/30 text-yellow-400" :
                        leave.status === "approved" ? "bg-green-900/30 text-green-400" :
                        "bg-red-900/30 text-red-400"
                      }`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="py-3 text-xs">{leave.appliedAt ? formatDistanceToNow(new Date(leave.appliedAt), { addSuffix: true }) : '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">No leave requests</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Alerts */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">System Alerts</h3>
        {pendingLeaves > 0 && (
          <div className="rounded bg-yellow-900/20 p-3 text-sm text-yellow-200 border border-yellow-700">
            ⚠️ {pendingLeaves} pending leave request(s) awaiting approval
          </div>
        )}
        {notCheckedInToday > activeEmployees * 0.1 && (
          <div className="rounded bg-red-900/20 p-3 text-sm text-red-200 border border-red-700 mt-2">
            ⚠️ More than 10% of team members not checked in
          </div>
        )}
        {pendingLeaves === 0 && notCheckedInToday <= activeEmployees * 0.1 && (
          <div className="rounded bg-green-900/20 p-3 text-sm text-green-200 border border-green-700">
            ✓ All systems operational
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, subtext, highlight }: any) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "border-red-700 bg-red-900/10" : "border-slate-700"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-red-400" : ""}`}>{value}</p>
      {subtext && <p className="text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
