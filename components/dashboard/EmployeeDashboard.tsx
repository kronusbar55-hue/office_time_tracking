import { connectDB } from "@/lib/db";
import { TimeSession } from "@/models/TimeSession";
import { LeaveBalance } from "@/models/LeaveBalance";
import { Task } from "@/models/Task";
import { User } from "@/models/User";
import { Types } from "mongoose";

type Props = { userId: string };

export default async function EmployeeDashboard({ userId }: Props) {
  await connectDB();

  // Get today's date
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];

  // Today's time session
  const todaySession = await TimeSession.findOne({
    user: userId,
    date: dateStr
  }).lean();

  // Get user info for greeting
  const user = await User.findById(userId).select("firstName lastName").lean();

  // Leave balances
  const balances = await LeaveBalance.find({ user: userId })
    .populate("leaveType", "name")
    .lean();

  // Assigned tasks (not done)
  const assignedTasks = await Task.find({
    assignee: userId,
    isDeleted: false,
    status: { $ne: "done" }
  })
    .populate("project", "name")
    .sort({ dueDate: 1 })
    .limit(8)
    .lean();

  // Task stats
  const taskStats = await Task.aggregate([
    { $match: { assignee: new Types.ObjectId(userId), isDeleted: false } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const stats = {
    backlog: taskStats.find((t: any) => t._id === "backlog")?.count || 0,
    todo: taskStats.find((t: any) => t._id === "todo")?.count || 0,
    inProgress: taskStats.find((t: any) => t._id === "in_progress")?.count || 0,
    inReview: taskStats.find((t: any) => t._id === "in_review")?.count || 0,
    done: taskStats.find((t: any) => t._id === "done")?.count || 0
  };

  // Calculate work hours today
  let hoursWorked = 0;
  if (todaySession) {
    if (todaySession.clockOut) {
      hoursWorked = Math.round((todaySession.totalWorkMinutes || 0) / 60 * 10) / 10;
    } else if (todaySession.clockIn) {
      const elapsed = Math.floor((Date.now() - new Date(todaySession.clockIn).getTime()) / 60000);
      hoursWorked = Math.round((elapsed - (todaySession.totalBreakMinutes || 0)) / 60 * 10) / 10;
    }
  }

  // Recent activity (last 5 days)
  const currentDate = new Date();
  const fiveDaysAgo = new Date(currentDate);
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  const recentSessions = await TimeSession.find({
    user: userId,
    date: { $gte: fiveDaysAgo.toISOString().split("T")[0] }
  })
    .sort({ date: -1 })
    .limit(5)
    .lean();

  return (
    <div className="space-y-6">
      {/* Welcome & Today's Status */}
      <div className="rounded-lg border border-slate-700 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6">
        <div className="mb-2">
          <p className="text-sm text-slate-400">Welcome back,</p>
          <h1 className="text-3xl font-bold">{user?.firstName} {user?.lastName}</h1>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          {todaySession
            ? todaySession.clockOut
              ? `✓ Checked out at ${new Date(todaySession.clockOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : `✓ You're currently clocked in`
            : "Not clocked in today"}
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Hours Worked"
          value={`${hoursWorked}h`}
          subtext={todaySession ? "Today" : "No session"}
        />
        <KpiCard
          label="Tasks Assigned"
          value={stats.todo + stats.inProgress + stats.backlog}
          subtext={`${stats.done} completed`}
        />
        <KpiCard
          label="In Progress"
          value={stats.inProgress}
          highlight={stats.inProgress > 0}
        />
        <KpiCard
          label="In Review"
          value={stats.inReview}
          highlight={stats.inReview > 0}
        />
      </div>

      {/* Tasks & Leave Balances */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Task Status */}
        <div className="rounded-lg border border-slate-700 p-6">
          <h3 className="mb-4 text-lg font-semibold">My Tasks Status</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                <span className="text-sm">Backlog</span>
              </div>
              <span className="font-bold">{stats.backlog}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <span className="text-sm">Todo</span>
              </div>
              <span className="font-bold">{stats.todo}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-yellow-400"></span>
                <span className="text-sm">In Progress</span>
              </div>
              <span className="font-bold text-yellow-400">{stats.inProgress}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400"></span>
                <span className="text-sm">In Review</span>
              </div>
              <span className="font-bold text-orange-400">{stats.inReview}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-700 pt-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-400"></span>
                <span className="text-sm">Done</span>
              </div>
              <span className="font-bold text-green-400">{stats.done}</span>
            </div>
          </div>
        </div>

        {/* Leave Balances */}
        <div className="rounded-lg border border-slate-700 p-6">
          <h3 className="mb-4 text-lg font-semibold">Leave Balances</h3>
          {balances.length > 0 ? (
            <div className="space-y-2">
              {balances.map((balance: any) => {
                const remainingMinutes = balance.totalAllocated - balance.used;
                const remainingDays = Math.round(remainingMinutes / 480);
                return (
                  <div key={balance._id} className="rounded bg-slate-900/30 p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{balance.leaveType?.name}</p>
                      <p className="font-bold text-blue-400">{remainingDays} days</p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                        style={{
                          width: `${Math.min(
                            (remainingMinutes / balance.totalAllocated) * 100,
                            100
                          )}%`
                        }}
                      ></div>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      {Math.round(remainingMinutes / 480)} of {Math.round(balance.totalAllocated / 480)} days used
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No leave balances configured</p>
          )}
        </div>
      </div>

      {/* Assigned Tasks */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Assigned Tasks</h3>
        {assignedTasks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="text-left py-2">Task</th>
                  <th className="text-left py-2">Project</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {assignedTasks.map((task: any) => (
                  <tr key={task._id} className="hover:bg-slate-900/30">
                    <td className="py-3 max-w-xs truncate font-medium">{task.title}</td>
                    <td className="py-3">{(task as any).project?.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        task.status === "in_progress"
                          ? "bg-yellow-900/30 text-yellow-400"
                          : task.status === "in_review"
                          ? "bg-orange-900/30 text-orange-400"
                          : task.status === "todo"
                          ? "bg-slate-900/30 text-slate-300"
                          : "bg-blue-900/30 text-blue-400"
                      }`}>
                        {task.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 text-xs">
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString([], {
                            month: "short",
                            day: "numeric"
                          })
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center py-6 text-slate-400">No tasks assigned yet</p>
        )}
      </div>

      {/* Recent Time Entries */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Recent Time Entries</h3>
        {recentSessions.length > 0 ? (
          <div className="space-y-2">
            {recentSessions.map((session: any) => {
              const workMinutes = session.totalWorkMinutes || 0;
              const hours = Math.floor(workMinutes / 60);
              const mins = workMinutes % 60;
              const dateObj = new Date(session.date + "T00:00:00");
              const isToday = dateObj.toDateString() === today.toDateString();

              return (
                <div key={session._id} className="flex items-center justify-between rounded bg-slate-900/30 p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {isToday ? "Today" : dateObj.toLocaleDateString([], { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(session.clockIn).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      {session.clockOut &&
                        ` - ${new Date(session.clockOut).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      {hours}h {mins}m
                    </p>
                    {session.totalBreakMinutes > 0 && (
                      <p className="text-xs text-slate-400">
                        Break: {Math.round(session.totalBreakMinutes / 60 * 10) / 10}h
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center py-6 text-slate-400">No time entries in the last 5 days</p>
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
