# Office Time Tracking & Attendance

Internal web application for office time tracking, attendance, and productivity.

## Tech stack

- Next.js App Router (TypeScript)
- Tailwind CSS
- MongoDB with Mongoose
- JWT authentication

## 🔹 ADD THIS SECTION ONLY (DO NOT MODIFY ANY OTHER PART)

────────────────────────────────────
DETAILED DASHBOARD DESIGN & CONTENT (MANDATORY)
────────────────────────────────────

Each role must have a **distinct dashboard layout**, **distinct widgets**, and **role-specific data visibility**.
Dashboards must feel purpose-built, not reused with minor changes.

All dashboards should follow this layout structure:

* Top summary cards (KPIs)
* Middle actionable widgets
* Bottom detailed tables / insights
* Right-side or secondary panels only if useful
* No irrelevant data for any role

All dashboard data must come from **real APIs**, aggregated efficiently.

---

### 🔷 ADMIN DASHBOARD — FULL DETAILS

**Purpose:** System-wide visibility & control

**Top KPI Cards:**

* Total Employees (Active / Inactive)
* Checked In Today
* On Break
* Not Checked In
* Pending Leave Requests
* Timesheet Compliance %

**Middle Section:**

* Attendance Overview (Today)

	* Checked In / Checked Out / On Break / Absent
* Tasks Overview

	* Total tasks by status (Backlog / In Progress / Done)
* Projects Overview

	* Active projects
	* Delayed projects indicator

**Bottom Section:**

* Latest Leave Requests (table)
* Recent Announcements
* System Alerts / Warnings

**Admin Capabilities:**

* Click-through to any module
* View all data without restriction
* Drill-down support (employee → project → task)

---

### 🔷 MANAGER DASHBOARD — FULL DETAILS

**Purpose:** Team performance & delivery tracking

**Top KPI Cards:**

* Team Members Count
* Team Checked In Today
* Team On Break
* Pending Approvals (Leave + Timesheet)
* Active Projects

**Middle Section:**

* Team Attendance Status (Today)

	* List of team members with current state
* Project-wise Task Progress

	* Tasks grouped by project
	* Status breakdown per project

**Bottom Section:**

* Tasks Assigned Today / This Week
* Pending Leave Requests (Approve / Reject)
* Pending Timesheet Submissions

**Manager Restrictions:**

* Only sees assigned team members
* Cannot access system-wide employee data
* No system settings

---

### 🔷 HR DASHBOARD — FULL DETAILS

**Purpose:** Workforce management & compliance

**Top KPI Cards:**

* Total Employees
* Present Today
* Absent Today
* Late Check-ins
* Leave Requests Pending

**Middle Section:**

* Attendance Analytics

	* Daily attendance summary
	* Late arrivals
* Leave Statistics

	* Approved / Pending / Rejected
* Timesheet Compliance

	* Employees who haven’t submitted

**Bottom Section:**

* Employee List (summary view)
* Recent Announcements
* Attendance Irregularities

**HR Restrictions:**

* View-only for tasks and projects
* No task creation
* No system settings

---

### 🔷 EMPLOYEE DASHBOARD — FULL DETAILS

**Purpose:** Personal productivity & daily tracking

**Top KPI Cards:**

* Today Status (Checked In / On Break / Checked Out)
* Hours Logged This Week
* Pending Tasks
* Leave Balance

**Middle Section:**

* Today’s Time Tracking

	* Check-in time
	* Break duration
	* Check-out option
* Assigned Tasks (Project-wise)

	* Status update allowed if permitted

**Bottom Section:**

* Weekly Timesheet Summary
* Upcoming Leaves
* Announcements

**Employee Restrictions:**

* Can only see own data
* Cannot see team or system data
* No approvals or admin controls

---

### 🔷 COMMON DASHBOARD RULES (ALL ROLES)

* Dashboards must:

	* Load instantly
	* Show skeleton loaders
	* Fetch widgets in parallel
	* Fail gracefully if one widget API fails
* Widgets must be:

	* Clickable (navigate to module)
	* Role-aware
	* Minimal data payload
* No unused widgets
* No placeholder data
* No duplicated widgets across roles unless justified

---

### 🔷 DASHBOARD API STRUCTURE

* `/api/dashboard/admin`
* `/api/dashboard/manager`
* `/api/dashboard/hr`
* `/api/dashboard/employee`

Each API:

* Validates JWT
* Validates role
* Uses MongoDB aggregation
* Returns only required fields
* Optimized for performance

---

### 🔷 FINAL EXPECTATION (DASHBOARDS)

Each role should feel:

* Admin → System controller
* Manager → Team leader
* HR → Compliance manager
* Employee → Individual contributor

Dashboards must be:

* Accurate
* Fast
* Role-focused
* Scalable

	(See <attachments> above for file contents. You may not need to search or read the file again.)

