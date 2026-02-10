# Check-In/Check-Out Module Documentation

## Overview
A comprehensive check-in/check-out module has been implemented for the office management system with role-based access, database persistence, real-time calculations, and advanced analytics with graphs and dashboards.

## Database Models

### 1. **TimeSession** (Enhanced)
**File:** `models/TimeSession.ts`

Enhanced the existing TimeSession model with additional fields:
- `userRole` - Track the role of the user at check-in time
- `location` - Optional location where user clocked in
- `deviceType` - Type of device used (web, mobile, kiosk)
- `notes` - Additional notes from the session
- `isOvertime` - Boolean indicating if work time exceeded 9 hours
- `lateClockIn` - Boolean indicating if check-in was after 9 AM
- `earlyClockOut` - Boolean indicating if checkout was before 5 PM

### 2. **CheckInOut** (New Model)
**File:** `models/CheckInOut.ts`

New model for historical tracking and analytics:
- `user` - Reference to User
- `userRole` - Role of user when checked in
- `date` - YYYY-MM-DD format
- `clockIn` - Timestamp of check-in
- `clockOut` - Timestamp of check-out (optional)
- `workMinutes` - Net work minutes (total - breaks)
- `breakMinutes` - Total break time
- `location` - Check-in location
- `deviceType` - Device used (web, mobile, kiosk)
- `notes` - Session notes
- `isOvertime` - Overtime indicator
- `isLateCheckIn` - Late check-in indicator
- `isEarlyCheckOut` - Early check-out indicator
- `attendancePercentage` - Calculated as (workMinutes / 480) * 100
- `overtimeMinutes` - Minutes over 9-hour threshold

**Indexes:**
- `user + date`
- `userRole + date`
- `date`
- `isOvertime`

## API Routes

### 1. **GET /api/checkin-checkout/stats**
Get check-in/check-out statistics for dashboard with optional role filtering.

**Parameters:**
- `period` - today, week, month (default: month)
- `role` - Filter by role (admin, hr, manager, employee)

**Response includes:**
- Total records, checked in/out counts
- Total and average work hours
- Overtime count, late check-ins, early check-outs
- Average attendance percentage
- Role-based statistics

### 2. **GET /api/checkin-checkout/list**
Get paginated list of check-in/check-out records with role-based access control.

**Parameters:**
- `page` - Page number (default: 1)
- `limit` - Records per page (default: 20)
- `startDate` - Start date filter
- `endDate` - End date filter
- `role` - Filter by role
- `userId` - Filter by user ID
- `sortBy` - Sort field (date, workMinutes, attendancePercentage)
- `sortOrder` - asc or desc

**Access Control:**
- Employees: See only their own records
- Managers: See their team's records
- HR/Admin: See all records

### 3. **GET /api/checkin-checkout/analytics**
Get comprehensive analytics and trends for check-in/check-out data.

**Parameters:**
- `period` - week, month, quarter, year (default: month)
- `role` - Filter by role
- `userId` - Filter by user

**Response includes:**
- Summary (total records, hours, overtime, etc.)
- Daily breakdown (worked hours, count, overtime)
- Role breakdown (count, hours, overtime)
- Issues distribution (late, early out, overtime)
- Date range

### 4. **POST /api/checkin-checkout/save**
Save completed check-in/check-out sessions to historical records.

**Body:**
- `timeSessionId` - Optional session ID to save

**Calculations:**
- Work minutes (total - breaks)
- Late check-in detection (after 9 AM)
- Early check-out detection (< 8 hours)
- Overtime detection (> 9 hours)
- Attendance percentage

### 5. **GET /api/checkin-checkout/today-summary**
Get today's check-in/check-out summary for dashboard widgets.

**Response includes:**
- Total records for today
- Checked in/out counts
- Average work hours
- Issues (late, early out, overtime)
- Role-based summary

## Components

### 1. **CheckInOutList** 
**File:** `components/time-tracking/CheckInOutList.tsx`

Client component displaying recent check-in/out records with:
- Status indicators (checked in/out)
- Issue badges (late, early, overtime)
- Sorting by date/time/hours
- Responsive card layout
- User avatar display

### 2. **CheckInOutStatCards**
**File:** `components/time-tracking/CheckInOutStatCards.tsx`

Dashboard cards showing KPIs:
- Checked in count
- Total work hours with average
- Late check-ins
- Overtime count
- Average attendance percentage
- Early check-outs

Color-coded cards for quick insights.

### 3. **CheckInOutCharts**
**File:** `components/time-tracking/CheckInOutCharts.tsx`

Analytics visualizations:
- **Daily Work Hours Chart** - Last 14 days with color coding
- **Role Breakdown** - Hours by role with progress bars
- **Issues Distribution** - Late, early out, overtime breakdown
- **Summary Stats** - Unique employees, total records, averages

### 4. **CheckInOutTable**
**File:** `components/time-tracking/CheckInOutTable.tsx`

Detailed records table with:
- Pagination (customizable page size)
- Sortable columns (date, hours, attendance)
- Filters (by role, status)
- Responsive design
- Status badges
- Issue indicators

## Pages

### 1. **Check-In/Out Dashboard**
**File:** `app/check-in-out/page.tsx`

Main dashboard with three view modes:

**Summary View:**
- KPI cards (period: today, week, month)
- Recent check-ins list

**Detailed View:**
- Full records table with pagination
- Advanced filtering and sorting

**Analytics View:**
- Comprehensive charts and graphs
- Daily trends
- Role breakdown
- Issues analysis

### 2. **Reports Page**
**File:** `app/check-in-out/reports/page.tsx`

Role-based reports with:
- Date range picker
- Role filter
- Report types (summary, detailed, comparison)
- CSV export functionality
- Role-based statistics table
- Detailed records view
- Analytics dashboard

## Updated Files

### 1. **lib/roles.ts**
Added check-in/out navigation entry:
```typescript
{ label: "Check-In/Out", href: "/check-in-out", icon: "checkin", allowed: [ROLES.ADMIN, ROLES.HR, ROLES.MANAGER] }
```

### 2. **app/api/time-entries/clock-out/route.ts**
Enhanced to:
- Import CheckInOut model
- Calculate metrics (late, early, overtime, attendance)
- Save to CheckInOut collection on clock-out
- Return calculated metrics in response

## Features

### ✅ Calculations
- **Work Hours**: Total time minus breaks
- **Attendance %**: (Work minutes / 480) * 100
- **Overtime Detection**: Work > 9 hours
- **Late Check-in**: Clock in after 9 AM
- **Early Check-out**: Work < 8 hours

### ✅ Role-Based Access
- **Admin**: Full access to all records and reports
- **HR**: Full access to all records and reports
- **Manager**: Access to team members' records
- **Employee**: Access to own records only

### ✅ Data Persistence
- All check-in/out sessions saved to CheckInOut collection
- Historical data available for analysis
- Automatic calculations on each session completion

### ✅ Visualization
- Daily work hours charts
- Role-based breakdown charts
- Issues distribution charts
- Summary statistics cards
- Color-coded status indicators

### ✅ Analytics
- Period-based analysis (week, month, quarter, year)
- Role-based statistics
- Daily trends
- Issues detection and reporting
- Attendance rate calculations

### ✅ Reporting
- CSV export functionality
- Role-based filtering
- Date range selection
- Multiple report types (summary, detailed, comparison)

## Usage

### For Employees
1. Navigate to **Check-In/Out** page
2. View personal check-in/out records
3. See work hours and attendance stats
4. View personal analytics

### For Managers
1. Navigate to **Check-In/Out** page
2. Access team members' records
3. Monitor team attendance and work hours
4. Identify issues (late, early, overtime)
5. Generate team reports

### For HR/Admin
1. Navigate to **Check-In/Out** > **Reports**
2. Filter by department/role
3. Select date range
4. Choose report type
5. Export data as CSV
6. View comprehensive analytics

## Calculations & Logic

### Attendance Percentage
```
attendancePercentage = min(100, (workMinutes / 480) * 100)
```

### Late Check-In
```
isLateCheckIn = clockInHour > 9 OR (clockInHour === 9 AND clockInMinute > 0)
```

### Early Check-Out
```
isEarlyCheckOut = workMinutes < 480
```

### Overtime
```
isOvertime = workMinutes > 540
overtimeMinutes = workMinutes > 540 ? workMinutes - 540 : 0
```

## Database Indexes
Optimized for fast queries:
- User + Date combinations
- Role + Date for role-based reports
- Date range queries
- Overtime filtering

## Future Enhancements
- Geolocation tracking
- Biometric integration
- Mobile app support
- Email notifications
- Auto-clock-out functionality
- Flexible work hours configuration
- Shift management
- Team leaderboards
