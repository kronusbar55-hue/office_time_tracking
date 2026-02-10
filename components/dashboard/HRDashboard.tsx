import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { LeaveRequest } from "@/models/LeaveRequest";
import { TimeSession } from "@/models/TimeSession";
import { LeaveBalance } from "@/models/LeaveBalance";
import { formatDistanceToNow } from "date-fns";

export default async function HRDashboard() {
  await connectDB();

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
  const rejectedLeaves = await LeaveRequest.countDocuments({ status: "rejected" });

  // Pending leave requests with employee details
  const pendingLeaveRequests = await LeaveRequest.find({ status: "pending" })
    .populate("user", "firstName lastName email")
    .populate("leaveType", "name")
    .populate("manager", "firstName lastName")
    .sort({ appliedAt: -1 })
    .limit(10)
    .lean();

  // Recent approvals
  const recentApprovals = await LeaveRequest.find({ status: "approved" })
    .populate("user", "firstName lastName")
    .populate("leaveType", "name")
    .sort({ updatedAt: -1 })
    .limit(5)
    .lean();

  // Leave trends (this month)
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const leavesByType = await LeaveBalance.aggregate([
    {
      $group: {
        _id: "$leaveType",
        totalUsed: { $sum: "$used" },
        totalAllocated: { $sum: "$totalAllocated" }
      }
    },
    { $limit: 5 }
  ]);

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Total Employees" value={totalEmployees} />
        <KpiCard label="Active Employees" value={activeEmployees} />
        <KpiCard label="Checked In Today" value={checkedInToday} subtext={`${attendanceRate}% rate`} />
        <KpiCard label="Pending Leaves" value={pendingLeaves} highlight={pendingLeaves > 0} />
      </div>

      {/* Leave Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-700 p-6">
          <h3 className="mb-4 text-lg font-semibold">Leave Requests (All Time)</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Pending</span>
              <span className={`font-bold text-lg ${pendingLeaves > 0 ? "text-yellow-400" : ""}`}>{pendingLeaves}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Approved</span>
              <span className="font-bold text-lg text-green-400">{approvedLeaves}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Rejected</span>
              <span className="font-bold text-lg text-red-400">{rejectedLeaves}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 p-6">
          <h3 className="mb-4 text-lg font-semibold">Attendance (Today)</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Checked In</span>
              <span className="font-bold text-lg">{checkedInToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Not Checked In</span>
              <span className="font-bold text-lg">{activeEmployees - checkedInToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Compliance Rate</span>
              <span className="font-bold text-lg text-blue-400">{attendanceRate}%</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-700 p-6">
          <h3 className="mb-4 text-lg font-semibold">Employee Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Active</span>
              <span className="font-bold text-lg text-green-400">{activeEmployees}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Inactive</span>
              <span className="font-bold text-lg text-slate-400">{inactiveEmployees}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Total</span>
              <span className="font-bold text-lg">{totalEmployees}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Leave Requests - Requires Action */}
      <div className="rounded-lg border border-slate-700 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Pending Leave Requests</h3>
          <span className="rounded-full bg-red-900/30 px-3 py-1 text-xs font-semibold text-red-400">{pendingLeaves} Pending</span>
        </div>
        {pendingLeaveRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700">
                <tr>
                  <th className="text-left py-2">Employee</th>
                  <th className="text-left py-2">Leave Type</th>
                  <th className="text-left py-2">Duration</th>
                  <th className="text-left py-2">Reason</th>
                  <th className="text-left py-2">Applied</th>
                  <th className="text-left py-2">Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {pendingLeaveRequests.map((req: any) => (
                  <tr key={req._id} className="hover:bg-slate-900/30">
                    <td className="py-3 font-medium">{req.user?.firstName} {req.user?.lastName}</td>
                    <td className="py-3">{req.leaveType?.name}</td>
                    <td className="py-3 text-xs">
                      {req.startDate} to {req.endDate}
                      <br />
                      <span className="text-slate-400">{req.duration.replace("-", " ")}</span>
                    </td>
                    <td className="py-3 text-xs text-slate-300">{req.reason?.substring(0, 40)}...</td>
                    <td className="py-3 text-xs">{req.appliedAt ? formatDistanceToNow(new Date(req.appliedAt), { addSuffix: true }) : '-'}</td>
                    <td className="py-3 text-xs">{req.manager?.firstName || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded bg-green-900/20 p-4 text-center text-sm text-green-200 border border-green-700">
            ✓ No pending leave requests
          </div>
        )}
      </div>

      {/* Recent Approvals */}
      <div className="rounded-lg border border-slate-700 p-6">
        <h3 className="mb-4 text-lg font-semibold">Recent Approvals</h3>
        {recentApprovals.length > 0 ? (
          <div className="space-y-2">
            {recentApprovals.map((req: any) => (
              <div key={req._id} className="flex items-center justify-between rounded bg-slate-900/30 p-3">
                <div>
                  <p className="text-sm font-medium">{req.user?.firstName} {req.user?.lastName}</p>
                  <p className="text-xs text-slate-400">{req.leaveType?.name} • {req.startDate} to {req.endDate}</p>
                </div>
                <span className="text-xs text-green-400">✓ Approved</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No recent approvals</p>
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
