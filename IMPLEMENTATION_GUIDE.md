# Check-In/Check-Out Implementation Guide

## Quick Start

### 1. Database Models
✅ **TimeSession** - Enhanced with role and tracking fields
✅ **CheckInOut** - New historical tracking model

### 2. API Routes
✅ `/api/checkin-checkout/stats` - Dashboard statistics
✅ `/api/checkin-checkout/list` - Paginated records
✅ `/api/checkin-checkout/analytics` - Comprehensive analytics
✅ `/api/checkin-checkout/save` - Save session records
✅ `/api/checkin-checkout/today-summary` - Today's summary for dashboard

### 3. Components
✅ `CheckInOutList` - Recent records display
✅ `CheckInOutStatCards` - KPI cards
✅ `CheckInOutCharts` - Analytics visualizations
✅ `CheckInOutTable` - Detailed table view

### 4. Pages
✅ `/check-in-out` - Main dashboard
✅ `/check-in-out/reports` - Detailed reports

### 5. Navigation
✅ Updated `lib/roles.ts` with navigation entry

## Integration Points

### Clock-Out Hook
When user clocks out, the system:
1. Updates TimeSession with clock-out time
2. Calculates work hours, overtime, attendance
3. Saves to CheckInOut collection
4. Returns metrics in response

**File:** `app/api/time-entries/clock-out/route.ts`

### Dashboard Integration
Display today's summary on dashboard:
```typescript
import CheckInOutStatCards from "@/components/time-tracking/CheckInOutStatCards";

// Use in dashboard
<CheckInOutStatCards period="today" />
```

## Role-Based Permissions

### Employee
- View own records only
- See personal statistics
- View trends (personal)

### Manager
- View team members' records
- Add notes/comments
- Generate team reports
- Monitor attendance

### HR
- View all employees' records
- Generate organization-wide reports
- Export data
- Set policies

### Admin
- Full access to all features
- Configure system
- Manage policies

## Calculations Explained

### 1. Work Minutes
```
Work Minutes = Total Time - Break Time
```

### 2. Attendance Percentage
```
Attendance % = (Work Minutes / 480) * 100
- 100% = 8 hours worked
- < 100% = Early checkout
- > 100% = Overtime worked
```

### 3. Late Check-In Detection
```
Late = Clock-in time > 09:00
```

### 4. Overtime Detection
```
Overtime = Work Time > 9 hours (540 minutes)
Overtime Minutes = Work Time - 540
```

## Key Features

### Real-Time Calculations
- Automatic detection of issues
- Instant metric calculations
- Updated on session completion

### Historical Tracking
- All sessions permanently recorded
- Trend analysis
- Performance metrics

### Analytics
- Daily/weekly/monthly/quarterly reports
- Role-based insights
- Attendance trends
- Overtime analysis

### Visualizations
- Bar charts for daily hours
- Progress bars for role breakdown
- Issue distribution charts
- KPI summary cards

## API Response Examples

### Stats Endpoint
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalRecords": 50,
      "checkedIn": 5,
      "checkedOut": 45,
      "totalWorkHours": 385,
      "averageWorkHours": 7.7,
      "overtimeCount": 8,
      "lateCheckInCount": 12,
      "averageAttendance": 96.25
    },
    "roleStats": {
      "employee": { "count": 40, "totalHours": 308 },
      "manager": { "count": 8, "totalHours": 64 }
    }
  }
}
```

### Analytics Endpoint
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRecords": 200,
      "totalWorkHours": 1520,
      "totalOvertimeHours": 48,
      "averageWorkHoursPerDay": 7.6,
      "averageAttendanceRate": 95.5,
      "uniqueEmployees": 25
    },
    "daily": {
      "2026-02-01": { "worked": 192, "count": 25, "overtime": 3 }
    },
    "roleBreakdown": {
      "employee": { "count": 150, "hours": 1140, "overtime": 30 }
    },
    "issues": {
      "late": 30,
      "earlyOut": 45,
      "overtime": 48
    }
  }
}
```

## Testing Checklist

### ✅ Clock-In/Clock-Out
- [ ] Clock-in saves correctly
- [ ] Clock-out saves to CheckInOut
- [ ] Calculations are accurate
- [ ] Metrics are returned

### ✅ API Endpoints
- [ ] /stats returns correct data
- [ ] /list handles pagination
- [ ] /analytics shows trends
- [ ] /today-summary works

### ✅ Components
- [ ] Cards display correctly
- [ ] Charts render properly
- [ ] Table sort/filter works
- [ ] Lists update on refresh

### ✅ Pages
- [ ] Main dashboard loads
- [ ] Reports page works
- [ ] Export to CSV functions
- [ ] Role-based access enforced

### ✅ Calculations
- [ ] Work hours calculated
- [ ] Overtime detected
- [ ] Late check-in flagged
- [ ] Early check-out flagged
- [ ] Attendance % correct

## Database Migrations

No migrations needed - new model is separate from existing data.

### Existing Data
- Old time entries continue to work
- New sessions use CheckInOut model
- No data loss

### Data Migration (Optional)
To migrate historical TimeSession data to CheckInOut:

```typescript
// Migration script
const sessions = await TimeSession.find({
  clockOut: { $exists: true, $ne: null }
});

for (const session of sessions) {
  const workMinutes = (session.clockOut - session.clockIn) / 60000 
    - (session.totalBreakMinutes || 0);
  
  await CheckInOut.create({
    user: session.user,
    userRole: "employee", // Fetch from User if needed
    date: session.date,
    clockIn: session.clockIn,
    clockOut: session.clockOut,
    workMinutes,
    breakMinutes: session.totalBreakMinutes || 0,
    isLateCheckIn: session.clockIn.getHours() > 9,
    isEarlyCheckOut: workMinutes < 480,
    isOvertime: workMinutes > 540
  });
}
```

## Troubleshooting

### Issue: No records showing
- Check user has checked in/out
- Verify date range filter
- Check role-based permissions

### Issue: Wrong calculations
- Verify break times are set correctly
- Check timezone handling
- Review calculation logic

### Issue: Missing role data
- Ensure user role is set in User model
- Check role field in CheckInOut
- Run calculation update

### Issue: Slow queries
- Verify indexes created
- Check date range filtering
- Consider archiving old data

## Performance Tips

### Indexing
All recommended indexes are in place:
- User + Date (most common query)
- Role + Date (for role-based reports)
- Date alone (for period queries)

### Query Optimization
- Use date range filters
- Implement pagination
- Cache frequently accessed data
- Archive old records quarterly

## Maintenance

### Database Cleanup
For optimal performance, consider:
- Archiving records older than 2 years
- Rebuilding indexes quarterly
- Checking for orphaned records

### Regular Tasks
- Export monthly reports
- Review compliance
- Update policies
- Monitor overtime trends

## Support

For issues or questions:
1. Check calculations in `/api/checkin-checkout/` routes
2. Review component implementation
3. Verify role-based access in getUserQuery()
4. Check date formatting (YYYY-MM-DD)
