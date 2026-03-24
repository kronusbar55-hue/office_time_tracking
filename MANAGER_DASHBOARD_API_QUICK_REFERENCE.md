# Manager Dashboard: Quick API Reference

## Available API Endpoints for Dashboard Data

### TASK ENDPOINTS

```
GET /api/tasks
  Params:
    - project={projectId}       # Filter by project
    - status={status}           # backlog|todo|in_progress|qa|done
    - assignee={userId}         # Filter by assignee
    - priority={priority}       # Low|Medium|High|Critical
    - search={text}             # Search title/key
    - page={number}             # Pagination (default: 1)
    - limit={number}            # Items per page (default: 25)
  Returns:
    - tasks: Array of Task objects
    - total: Total count
    - Each task includes: assignee, reporter, project details

POST /api/tasks
  Creates new task

GET /api/tasks/[id]
  Get specific task details
```

### PROJECT ENDPOINTS

```
GET /api/projects
  Returns: All accessible projects with pagination

GET /api/projects/[id]
  Returns:
    - Project details
    - Members (with avatars)
    - Logo URL and colors

PUT /api/projects/[id]
  Update project details, members, logo, status
```

### TIME TRACKING ENDPOINTS

```
GET /api/time-tracking/summary?range=today|week|month
  Returns:
    - workedHours
    - breakHours
    - overtimeHours
    - workedMinutes
    - breakMinutes
    - overtimeMinutes

GET /api/time-tracking/weekly
  Returns: Weekly summary data

GET /api/time-tracking/monthly
  Returns: Monthly summary data

GET /api/time-tracking/graph
  Returns: Graph-compatible data format

GET /api/time-tracking/distribution
  Returns: Time distribution metrics
```

### ATTENDANCE ENDPOINTS

```
GET /api/attendance/route
  Returns: Attendance logs

GET /api/attendance/checkout
  Clock out endpoint

GET /api/attendance/checkout-with-project-logs
  Clock out with project time logs
```

### LEAVE ENDPOINTS

```
GET /api/leaves
  Returns: Leave requests (with filters)
  Params:
    - status={pending|approved|rejected|cancelled}
    - userId={userId}
    - startDate, endDate

POST /api/leaves
  Create leave request

GET /api/leaves/[id]
  Get specific leave request
```

### REPORTS ENDPOINTS

```
GET /api/reports/route
  Main reporting endpoint with aggregation
  Params:
    - startDate (required, ISO format)
    - endDate (required, ISO format)
    - department={string}
    - userId={string}
    - search={string}
  Returns:
    - aggregated user work data
    - dailyRecords by date
    - totalWorkMs, totalOvertimeMs, totalBreakMs
    - payrollHours
    - intensity ratings per day
    - checkInTime, checkOutTime

GET /api/reports/attendance
  Attendance detailed analysis

GET /api/reports/breaks
  Break analysis by user/date

GET /api/reports/overtime
  Overtime tracking and analysis

GET /api/reports/timesheet
  Timesheet summaries

GET /api/reports/weekly
  Weekly report aggregation

GET /api/reports/latest-arrivals
  Late arrivals tracking

GET /api/reports/insights
  Performance insights
```

---

## Data Aggregation Patterns Used in Codebase

### Task Aggregation (from ManagerDashboard.tsx)
```javascript
Task.aggregate([
  { $match: { assignee: { $in: teamIds }, isDeleted: false } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
// Result: Array of { _id: status, count: number }
```

### Attendance Aggregation
```javascript
EmployeeMonitor.aggregate([
  { $match: { userId: { $in: teamIds }, date: dateStr } },
  { $sort: { createdAt: -1 } },
  { 
    $group: { 
      _id: "$userId", 
      latestStatus: { $first: "$status" },
      lastTime: { $first: "$time" }
    } 
  }
])
// Result: Latest activity per user
```

### Monitor Data Aggregation (from reports/route.ts)
```javascript
EmployeeMonitor.aggregate([
  {
    $match: {
      userId: { $in: userIds },
      date: { $in: dateStrings }
    }
  },
  {
    $group: {
      _id: { userId: "$userId", date: "$date" },
      workSeconds: { $sum: "$activeSeconds" },
      idleSeconds: { $sum: "$idleSeconds" },
      maxBreak: { $max: "$breakTime" },
      maxSession: { $max: "$sessionTime" },
      firstIn: { $min: "$createdAt" },
      lastOut: { $max: "$createdAt" }
    }
  }
])
```

---

## Helper Functions & Utilities

### Time Conversion (from monitorUtils.ts)
```typescript
// Parse HH:mm:ss to minutes
function timeToMinutes(timeStr: string): number {
  const parts = timeStr.split(":").map(Number);
  const h = parts[0] || 0;
  const m = parts[1] || 0;
  const s = parts[2] || 0;
  return h * 60 + m + s / 60;
}
```

### Monitor Stats Aggregation (from monitorUtils.ts)
```typescript
// Get stats for date range
async function getMonitorStats(userId: string, startDate: Date, endDate: Date)
// Returns: Array of { date, workedMinutes, breakMinutes, sessionMinutes }

// Get stats for single day
async function getDayMonitorStats(userId: string, dateStr: string)
// Returns: { workedMinutes, breakMinutes, sessionMinutes, isActive, lastActivityAt, status }
```

---

## Key Query Patterns for Manager Dashboard

### Get Team Information
```javascript
// Team members reporting to manager
const team = await User.find({ 
  manager: userId, 
  isDeleted: false, 
  isActive: true 
}).select("firstName lastName email").lean();

const teamIds = team.map(t => t._id);
```

### Get Today's Attendance
```javascript
const today = new Date().toISOString().split("T")[0];
const uniqueTeamToday = await EmployeeMonitor.distinct("userId", { 
  userId: { $in: teamIds.map(id => id.toString()) }, 
  date: today 
});
const teamCheckedInToday = uniqueTeamToday.length;
const attendanceRate = (teamCheckedInToday / teamSize) * 100;
```

### Get Pending Leaves
```javascript
const pendingLeaves = await LeaveRequest.countDocuments({
  user: { $in: teamIds },
  status: "pending"
});

const pendingLeaveDetails = await LeaveRequest.find({
  user: { $in: teamIds },
  status: "pending"
})
  .populate("user", "firstName lastName email")
  .populate("leaveType", "name")
  .limit(3)
  .lean();
```

### Get Task Status Distribution
```javascript
const tasksByStatus = await Task.aggregate([
  { $match: { assignee: { $in: teamIds }, isDeleted: false } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);

// Transform to object
const stats = {
  backlog: tasksByStatus.find(t => t._id === "backlog")?.count || 0,
  todo: tasksByStatus.find(t => t._id === "todo")?.count || 0,
  inProgress: tasksByStatus.find(t => t._id === "in_progress")?.count || 0,
  qa: tasksByStatus.find(t => t._id === "qa")?.count || 0,
  done: tasksByStatus.find(t => t._id === "done")?.count || 0
};
```

### Get Active Projects
```javascript
const activeProjects = await Project.countDocuments({
  members: { $in: [userId] },
  status: "active"
});
```

---

## Data Types & Enums

### Task Statuses
```typescript
type TaskStatus = "backlog" | "todo" | "in_progress" | "qa" | "done"
```

### Task Priorities
```typescript
type TaskPriority = "Low" | "Medium" | "High" | "Critical"
```

### Task Types
```typescript
type TaskType = "Task" | "Bug" | "Improvement"
```

### Project Status
```typescript
type ProjectStatus = "active" | "on_hold" | "completed" | "archived"
```

### Leave Status
```typescript
type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled"
```

### Leave Duration
```typescript
type LeaveDuration = "full-day" | "half-first" | "half-second"
```

### Time Session Status
```typescript
type TimeSessionStatus = "active" | "completed"
```

### Employee Monitor Status
```typescript
// Typical values: "ONLINE", "OFFLINE", "ON_BREAK", "CHECKED_OUT"
interface IEmployeeMonitor {
  status?: string;
  // ...
}
```

### User Roles
```typescript
type RoleName = "admin" | "hr" | "manager" | "employee"
```

---

## Calculation Formulas

### Time Metrics
```
Worked Hours = totalWorkMinutes / 60
Break Hours = totalBreakMinutes / 60
Overtime Hours = max(0, workedHours - 8)
Session Duration = (clockOut - clockIn) / 1000 / 60 (in minutes)
Net Work Time = Session Duration - Break Duration
```

### Task Metrics
```
Completion Rate = (doneTasks / totalTasks) * 100
Overdue Tasks = count where dueDate < today AND status != "done"
Task Load per Person = totalTasks / teamSize
High Priority Tasks = count where priority IN ("High", "Critical")
Time Estimation Accuracy = estimatedTime / actualTimeSpent
```

### Attendance Metrics
```
Attendance Rate = (presentCount / totalTeam) * 100
Late Arrival Rate = (lateCount / totalSessions) * 100
Early Departure Rate = (earlyCount / totalSessions) * 100
```

### Leave Metrics
```
Leave Usage % = (usedMinutes / totalAllocatedMinutes) * 100
Remaining Leave = totalAllocated - used (in minutes)
Remaining Days = Remaining Leave / (8 * 60) [assuming 8-hour day]
```

### Activity Intensity (from reports)
```
Intensity Scale (1-6):
  1 = 0-2 hours
  2 = 2-4 hours
  3 = 4-6 hours
  4 = 6-8 hours
  5 = 8-10 hours
  6 = 10+ hours
```

---

## Rate Limiting & Performance Notes

### Indexed Fields (for query optimization)
- Task: project, assignee, status, priority, type
- User: role, manager, technology
- TimeSession: user, date, clockIn, status
- LeaveRequest: user, status, startDate, endDate
- EmployeeMonitor: userId, date
- AttendanceLog: userId, date

### Batch Operations
- Use .aggregate() for large data sets
- Use .lean() for read-only queries
- Limit initial loads to 25-50 items
- Implement pagination for large results

---

## Authentication & Authorization

All endpoints require:
- **auth_token**: Cookie-based JWT token
- **User role verification**: admin, hr, manager, employee
- **Visibility scope**: Managers see team data, employees see own data

Example auth check:
```javascript
const cookieStore = cookies();
const token = cookieStore.get("auth_token")?.value;
const payload = verifyAuthToken(token);
if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

Managers can see:
- All tasks in projects they're members of
- Team members reporting to them
- Attendance and leave data for their team

Employees can see:
- Only their own tasks and time entries
- Their own leave requests and balance

---

## Common Dashboard Queries Summary

| Use Case | Endpoint | Data | Frequency |
|----------|----------|------|-----------|
| Team Size | User.find() | Team count | Once per session |
| Today's Attendance | EmployeeMonitor | Present count | Real-time |
| Task Distribution | Task.aggregate() | By status | Real-time |
| Pending Leaves | LeaveRequest.find() | Pending requests | Real-time |
| Active Projects | Project.count() | Project count | Once per session |
| Team Hours | TimeSession | Worked minutes | Daily/Weekly |
| Leave Balance | LeaveBalance | Used/Allocated | Monthly |
| Overdue Tasks | Task.find() | Count with dueDate | Daily |

