# Manager Dashboard: Available Models & Metrics Reference

## Overview
This document details all available data models, fields, and metrics that can be used to build a comprehensive manager dashboard for tracking team performance, task progress, time tracking, and leave management.

---

## 1. TASK MODEL & DATA

### Model: `Task` (ITask interface)

#### Key Fields Available:
- **_id**: Unique task identifier
- **key**: Unique task key (e.g., "PROJ-123")
- **title**: Task name/summary
- **description**: Detailed task description
- **type**: "Task" | "Bug" | "Improvement"
- **priority**: "Low" | "Medium" | "High" | "Critical"
- **status**: "backlog" | "todo" | "in_progress" | "qa" | "done"
- **project**: Reference to Project
- **assignee**: User assigned to task
- **reporter**: User who reported task
- **dueDate**: Task deadline (Date)
- **labels**: Custom tags/labels (string array)
- **estimatedTime**: Estimated effort in minutes
- **totalTimeSpent**: Actual time logged in minutes
- **sprint**: Reference to Sprint
- **progressPercent**: Task completion percentage (0-100)
- **parentTask**: For subtask hierarchies
- **childTasks**: Array of child task references
- **watchers**: Users watching the task

#### Task Filter Capabilities:
- Filter by status (backlog, todo, in_progress, qa, done)
- Filter by priority (Low, Medium, High, Critical)
- Filter by assignee
- Filter by project
- Filter by search text (title, key)
- Filter by sprint (or backlog if no sprint)
- Filter by labels

#### Task Statistics Available:
- **Task Count by Status**: Breakdown of tasks in each status
- **Task Count by Priority**: Distribution across priority levels
- **Task Count by Type**: Task, Bug, or Improvement counts
- **Estimated vs Actual Time**: Compare estimatedTime vs totalTimeSpent
- **Overdue Tasks**: Count tasks with dueDate < today and status != "done"
- **Task Completion Rate**: (done tasks / total tasks) * 100
- **Assigned vs Unassigned**: Count of tasks with/without assignee
- **Sprint Progress**: Tasks done / total tasks in sprint
- **Time Efficiency**: (totalTimeSpent / estimatedTime) * 100 per task

#### Related API Endpoints:
- `GET /api/tasks` - Get all tasks with filters
- `GET /api/tasks?project={projectId}&assignee={userId}&status={status}&priority={priority}`
- Parameters: `page`, `limit`, `search`
- Returns: Task details with populated project, assignee, reporter

#### Related Model Classes:
- **TaskService**: Has methods for getTasksByProject(), moveTask(), updateTask()
- **TaskActivityLog**: Tracks task changes (status changes, assignee changes, etc.)

---

## 2. PROJECT MODEL & DATA

### Model: `Project` (IProject interface)

#### Key Fields Available:
- **_id**: Unique project identifier
- **name**: Project name
- **key**: Unique project key (uppercase, e.g., "PROJ")
- **description**: Project description
- **clientName**: Client/customer name
- **status**: "active" | "on_hold" | "completed" | "archived"
- **members**: Array of User references (project team)
- **logoUrl**: Project logo URL
- **color**: Project color code (for UI)
- **createdBy**: User who created project
- **createdAt**: Project creation timestamp
- **updatedAt**: Last update timestamp

#### Project Status Types:
- **active**: Project is currently in progress
- **on_hold**: Project is paused
- **completed**: Project has finished
- **archived**: Project is archived (no longer active)

#### Project Statistics Available:
- **Active Project Count**: Count of projects with status="active"
- **Member Count per Project**: Number of team members
- **Project Summary**: Total projects by status
- **Task Metrics per Project**:
  - Total tasks in project
  - Tasks by status (backlog, todo, in_progress, qa, done)
  - Completion rate: done tasks / total tasks
  - Overdue tasks in this project
  - High priority tasks count

#### Project Progress Calculation:
```
Project Progress % = (Done Tasks / Total Tasks) * 100
High Priority Count = Tasks with priority="Critical" or "High"
Risk Indicator = Overdue Tasks / Total Tasks
```

#### Related API Endpoints:
- `GET /api/projects` - List all projects
- `GET /api/projects/[id]` - Get specific project details
- `PUT /api/projects/[id]` - Update project details

---

## 3. TIME SESSION & TIME TRACKING MODEL

### Model: `TimeSession` (ITimeSession interface)

#### Key Fields Available:
- **_id**: Session identifier
- **user**: Reference to User
- **date**: Session date (YYYY-MM-DD format)
- **clockIn**: Clock-in timestamp (Date)
- **clockOut**: Clock-out timestamp (Date or null if active)
- **totalWorkMinutes**: Calculated work time in minutes
- **totalBreakMinutes**: Total break time in minutes
- **status**: "active" | "completed"
- **userRole**: "admin" | "hr" | "manager" | "employee"
- **location**: Work location
- **deviceType**: "web" | "mobile" | "kiosk"
- **notes**: Session notes
- **isOvertime**: Boolean flag for overtime
- **lateClockIn**: Boolean flag for late arrival
- **earlyClockOut**: Boolean flag for early departure

#### Related Model: `TimeSessionBreak`
- Tracks individual break periods within a time session
- Each break has breakStart and breakEnd timestamps

#### Time Tracking Statistics Available:
- **Total Worked Hours**: Sum of totalWorkMinutes for date range / 60
- **Total Break Hours**: Sum of totalBreakMinutes / 60
- **Overtime Hours**: Sum of overtime minutes / 60
- **Attendance Rate**: (days with session / total working days) * 100
- **Average Daily Hours**: Total hours / number of days
- **Late Arrivals**: Count of sessions with lateClockIn=true
- **Early Departures**: Count of sessions with earlyClockOut=true
- **Time Range Analysis**: 
  - By day (today, this week, this month)
  - Customizable date ranges

#### Time Tracking API Endpoints:
- `GET /api/time-tracking/summary?range=today|week|month` 
  - Returns: workedHours, breakHours, overtimeHours
- `GET /api/time-tracking/graph` - Graph data endpoint
- `GET /api/time-tracking/monthly` - Monthly summary
- `GET /api/time-tracking/weekly` - Weekly summary
- `GET /api/time-tracking/distribution` - Distribution analysis

#### Related Model: `WorkLog` (IWorkLog interface)
- **user**: User reference
- **timeSession**: Session reference
- **project**: Project worked on
- **description**: Work description
- **workedMinutes**: Minutes worked
- **breakMinutes**: Minutes on break
- **date**: Date (YYYY-MM-DD)
- Indexes: (user, date), (project, date)

---

## 4. LEAVE REQUEST & LEAVE BALANCE MODEL

### Model: `LeaveRequest` (ILeaveRequest interface)

#### Key Fields Available:
- **_id**: Leave request identifier
- **user**: Reference to User requesting leave
- **leaveType**: Reference to LeaveType
- **startDate**: Leave start date (YYYY-MM-DD)
- **endDate**: Leave end date (YYYY-MM-DD)
- **duration**: "full-day" | "half-first" | "half-second"
- **reason**: Reason for leave
- **status**: "pending" | "approved" | "rejected" | "cancelled"
- **manager**: Manager reviewing the request
- **managerComment**: Manager's comment
- **appliedAt**: Timestamp when leave was requested
- **ccUsers**: Users to CC on leave request

#### Leave Status Types:
- **pending**: Awaiting manager approval
- **approved**: Approved by manager
- **rejected**: Rejected by manager
- **cancelled**: Cancelled by user

#### Leave Duration Options:
- **full-day**: Full day leave
- **half-first**: First half of day
- **half-second**: Second half of day

#### Leave Statistics Available:
- **Pending Approvals**: Count of requests with status="pending"
- **Approved Leave**: Count of approved requests
- **Total Leave Days Taken**: Sum of duration (in days equivalent)
- **Leave by Type**: Breakdown by LeaveType (CL, SL, PL, etc.)
- **Upcoming Leave**: Leave requests for future dates
- **Leave Request Rate**: Average per team member per period

#### Related Model: `LeaveBalance` (ILeaveBalance interface)
- **user**: User reference
- **year**: Year (e.g., 2024)
- **leaveType**: Reference to LeaveType
- **totalAllocated**: Total leave allocated in minutes
- **used**: Leave used in minutes
- Index: (user, year, leaveType) - unique

#### Leave Balance Calculations:
```
Remaining Balance = totalAllocated - used (in minutes)
Usage Percentage = (used / totalAllocated) * 100
Remaining Days = Remaining Balance / (8 * 60 minutes per working day)
```

#### Related Model: `LeaveType` (ILeaveType interface)
- **code**: Leave code (CL, SL, PL, LWP, etc.)
- **name**: Leave type name
- **annualQuota**: Annual quota in minutes
- **carryForward**: Can unused leave be carried forward?
- **requiresApproval**: Does it need manager approval?
- **isActive**: Is this leave type currently active?

#### Leave Management API:
- `GET /api/leaves` - List leave requests
- Related endpoints in `/api/leaves/` directory
- `GET /api/reports/breaks` - Break analysis
- `GET /api/reports/timesheet` - Timesheet summaries

---

## 5. ATTENDANCE LOG MODEL

### Model: `AttendanceLog` (IAttendanceLog interface)

#### Key Fields Available:
- **_id**: Record identifier
- **userId**: Reference to User
- **checkInTime**: Check-in timestamp (Date)
- **checkOutTime**: Check-out timestamp (Date or null)
- **breaks**: Array of break periods (breakStart, breakEnd)
- **status**: "IN" | "BREAK" | "OUT"
- **lastActivityAt**: Last activity timestamp
- **date**: Date string (YYYY-MM-DD) - indexed for lookups
- **totalWorkMs**: Work duration in milliseconds
- **overtimeMs**: Overtime in milliseconds
- **totalBreakMs**: Total break time in milliseconds
- **createdAt/updatedAt**: Record timestamps

#### Attendance Statistics:
- **Daily Attendance Rate**: (present count / total team) * 100
- **Break Statistics**: Total breaks, average break duration
- **Overtime Tracking**: Total overtime hours per employee
- **Attendance Pattern**: Present/absent trends over time

#### Unique Constraint:
- One attendance log per user per day: `(userId, date)` is unique

---

## 6. EMPLOYEE MONITOR MODEL

### Model: `EmployeeMonitor` (IEmployeeMonitor interface)

#### Key Fields Available:
- **userId**: User identifier (string indexed)
- **date**: Date (YYYY-MM-DD, indexed)
- **time**: Time (HH:mm:ss)
- **imageUrl**: Screenshot URL
- **mouseClicks**: Number of mouse clicks
- **mouseMovements**: Number of mouse movements
- **keyPresses**: Number of key presses
- **activeSeconds**: Active work seconds
- **idleSeconds**: Idle/break seconds
- **timezone**: User timezone
- **status**: Activity status (ONLINE, OFFLINE, ON_BREAK, CHECKED_OUT)
- **sessionTime**: Total session time (HH:mm:ss)
- **breakTime**: Total break time (HH:mm:ss)
- **meetingTime**: Meeting time duration
- **appUsage**: Map of application usage (minutes per app)
- **projects**: Array of projects worked on with hours

#### Activity Level Metrics:
- **Activity Intensity**: Based on clicks, movements, key presses
- **Idle Percentage**: (idleSeconds / total session) * 100
- **Active Percentage**: (activeSeconds / total session) * 100
- **App Usage Distribution**: Which applications used most
- **Project Time Distribution**: Time spent on each project

#### Key Utility Functions Available:
- **getMonitorStats()**: Aggregate monitor metrics for a date range
- **getDayMonitorStats()**: Get stats for a single day
- **timeToMinutes()**: Parse HH:mm:ss to minutes

#### Aggregation Available:
- Group by userId and date
- Calculate work vs break breakdown
- Determine activity intensity levels (1-6 scale)
- Identify rest days and holidays

---

## 7. SUBTASK MODEL

### Model: `SubTask` (ISubTask interface)

#### Key Fields:
- **key**: Unique subtask key
- **title**: Subtask title
- **description**: Subtask description
- **parentTask**: Reference to Task
- **parentIssueType**: "epic" | "story" | "task"
- **assignee**: User assigned to subtask
- **status**: "todo" | "in_progress" | "in_review" | "done" | "blocked"
- **priority**: "low" | "medium" | "high" | "critical"
- **estimatedTime**: Estimated time in minutes
- **loggedTime**: Actual time logged in minutes
- **progressPercent**: Completion percentage
- **dueDate**: Deadline

#### Subtask-Level Metrics:
- Can track detailed breakdown of parent tasks
- Time tracking at subtask level
- Status tracking for detailed progress
- Blocked subtask identification

---

## 8. SPRINT MODEL

### Model: `Sprint` (ISprint interface)

#### Key Fields:
- **project**: Reference to Project
- **name**: Sprint name
- **goal**: Sprint goal/description
- **status**: "planning" | "active" | "completed" | "cancelled"
- **startDate**: Sprint start date
- **endDate**: Sprint end date
- **issues**: Array of Task references
- **capacity**: Story point capacity
- **velocity**: Completed story points
- **completedAt**: Completion timestamp

#### Sprint Metrics:
- **Velocity**: Story points completed per sprint
- **Capacity vs Velocity**: Planned vs actual completion
- **Sprint Completion Rate**: (completed tasks / total tasks) * 100
- **Sprint Progress**: Daily/weekly progress tracking

---

## 9. ACTIVITY LOG & AUDIT TRAIL

### Model: `Activity` (IActivity interface)
- Tracks task changes: status, assignee, comments
- **action**: Type of action (CREATED, STATUS_CHANGED, ASSIGNEE_CHANGED, etc.)
- **oldValue/newValue**: Before/after values
- **timestamp**: When change occurred

### Model: `TaskActivityLog`
- Detailed audit trail for task modifications
- Tracks workflow transitions
- Records user actions and changes

---

## 10. CALCULATED METRICS & KPIs AVAILABLE

### Team Performance Metrics:
1. **Task Completion Rate**
   - Formula: (Done Tasks / Total Tasks) * 100
   - By status breakdown: backlog, todo, in_progress, qa, done

2. **Delivery Velocity**
   - Tasks completed per sprint/week
   - Story points completed per sprint

3. **Task Burn-down**
   - Daily task status changes
   - Sprint progress visualization

4. **Overdue Tasks**
   - Tasks with dueDate < today and status != "done"
   - Count and percentage of team

### Time & Attendance Metrics:
1. **Team Attendance Rate**
   - Present / Total Team * 100
   - Today's attendance: active, on-break, checked-out, absent

2. **Average Hours Worked**
   - Per day: totalWorkMinutes / 60
   - Per week/month: sum of daily hours

3. **Overtime Tracking**
   - Weekly overtime (hours > 40)
   - Monthly overtime aggregation
   - Overtime flags on sessions

4. **On-Time Arrival Rate**
   - (Sessions without lateClockIn / Total Sessions) * 100

5. **Break Patterns**
   - Average break duration
   - Break frequency
   - Total break time per day

### Leave & Absence Metrics:
1. **Pending Leave Approvals**
   - Count of "pending" status requests
   - By manager/team

2. **Leave Balance Usage**
   - Used / Allocated * 100
   - Remaining balance per type
   - By leave type (CL, SL, PL, etc.)

3. **Leave Trends**
   - Most common leave type used
   - Upcoming leave schedule
   - Team coverage during leaves

### Quality Metrics:
1. **Task Priority Distribution**
   - Count by Critical, High, Medium, Low
   - Percentage of each in team assignments

2. **Task Type Breakdown**
   - Task, Bug, Improvement counts
   - Bug count as percentage of total

3. **Time Estimation Accuracy**
   - Actual vs Estimated time ratio
   - Over/under-estimates percentage

### Project Health Metrics:
1. **Project Status Summary**
   - Active, On Hold, Completed, Archived counts

2. **Project Progress**
   - Completion percentage per project
   - Task distribution by status

3. **Team Capacity**
   - Active projects per person
   - Task load distribution

---

## 11. EXISTING API AGGREGATION ENDPOINTS

### Reports API:
- `/api/reports/route.ts` - Main reports endpoint with aggregations for:
  - Date range filtering
  - Department filtering
  - User-specific reports
  - Daily intensity calculations
  - Payroll hours calculations

### Time Tracking APIs:
- `/api/time-tracking/summary` - Worked, break, overtime hours
- `/api/time-tracking/monthly` - Monthly summaries
- `/api/time-tracking/weekly` - Weekly summaries
- `/api/time-tracking/distribution` - Usage distribution
- `/api/time-tracking/graph` - Graph data

### Attendance APIs:
- `/api/attendance/route.ts` - Attendance aggregations
- `/api/reports/attendance` - Attendance reports
- `/api/reports/overtime` - Overtime analysis

### Leave Management:
- `/api/leaves/` - Leave request endpoints

---

## 12. DATA ACCESS PATTERNS FOR MANAGER DASHBOARD

### Current Dashboard Implementation (ManagerDashboard.tsx):

**Already Implemented:**
- Team size and members (via User.find with manager filter)
- Today's attendance from EmployeeMonitor
- Pending leave requests (LeaveRequest by user and status)
- Active projects (Project.countDocuments by status and members)
- Team task distribution by status (Task.aggregate by status)
- Live team activity (EmployeeMonitor grouping by user)

**Query Patterns Used:**
```javascript
// Team members
User.find({ manager: userId, isDeleted: false, isActive: true })

// Today's attendance
EmployeeMonitor.aggregate([
  { $match: { userId: { $in: teamIds }, date: dateStr } },
  { $group: { _id: "$userId", latestStatus: { $first: "$status" } } }
])

// Task distribution
Task.aggregate([
  { $match: { assignee: { $in: teamIds }, isDeleted: false } },
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

### Expandable Metrics:
- Pending approvals count
- Time worked this week/month
- Upcoming leaves
- Overdue tasks
- High priority tasks
- Team efficiency metrics
- Project progress by project
- Sprint velocity trends

---

## SUMMARY: Available Metrics for Manager Dashboard

| Category | Metric | Source Model | Calculation |
|----------|--------|--------------|-------------|
| **Tasks** | Completion Rate | Task | done / total * 100 |
| | Overdue Count | Task | count where dueDate < today |
| | Priority Distribution | Task | count by priority |
| | By Status | Task | count by status |
| **Time** | Worked Hours | TimeSession | sum(totalWorkMinutes) / 60 |
| | Overtime | TimeSession | sum(isOvertime) / 60 |
| | Efficiency | TimeSession | worked / (8*team_size) * 100 |
| **Attendance** | Rate | AttendanceLog, EmployeeMonitor | present / total * 100 |
| | Late Arrivals | TimeSession | count(lateClockIn) |
| **Leave** | Pending | LeaveRequest | count(status=pending) |
| | Balance Usage | LeaveBalance | used / allocated * 100 |
| | Upcoming | LeaveRequest | count(future dates) |
| **Projects** | Active Count | Project | count(status=active) |
| | Progress | Task | done / total per project |
| **Activity** | Changes | Activity | count by action/date |

---

## RECOMMENDATIONS FOR DASHBOARD EXPANSION

1. **Add KPI Cards**: Implement trending metrics (↑/↓ indicators)
2. **Time Tracking Widget**: Show team hours worked this week
3. **Leave Calendar**: Display upcoming leave with team coverage
4. **Task Burn-down Chart**: Sprint progress visualization
5. **Priority Matrix**: High-priority task tracking
6. **Resource Utilization**: Team capacity vs workload
7. **Performance Trends**: Weekly/monthly comparisons
8. **Risk Indicators**: Overdue tasks, blocked tasks, late arrivals

