# Jira Module Quick Start Guide

## Overview

The Jira module is a complete task/issue management system similar to Atlassian Jira. It provides project management, sprint planning, boards, workflows, time tracking, and comprehensive reporting.

## Quick Start (5 minutes)

### 1. Create a Project

```bash
curl -X POST http://localhost:3000/api/jira/projects \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "name": "My First Project",
    "key": "PROJ",
    "description": "Testing the Jira module"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64abc123...",
    "name": "My First Project",
    "key": "PROJ",
    "defaultStatusesCreated": 7,
    "defaultIssueTypesCreated": 6
  }
}
```

### 2. Create an Issue

```bash
curl -X POST http://localhost:3000/api/jira/issues \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "projectId": "64abc123...",
    "summary": "Fix login bug",
    "description": "Users cannot login with email",
    "type": "bug",
    "priority": "high",
    "assignee": "64def456..."
  }'
```

### 3. View Issue Details

```bash
curl http://localhost:3000/api/jira/issues/64ghi789... \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

### 4. Log Time on Issue

```bash
curl -X POST http://localhost:3000/api/jira/issues/time-logs \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "issueId": "64ghi789...",
    "timeSpentMinutes": 120,
    "description": "Debugging and fixing",
    "isBillable": true
  }'
```

### 5. Add Comment

```bash
curl -X POST http://localhost:3000/api/jira/issues/comments \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "issueId": "64ghi789...",
    "content": "Fixed in PR #123 @john"
  }'
```

---

## Common Use Cases

### Get My Issues

```bash
curl "http://localhost:3000/api/jira/search?q=assignee:me" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

### Get High Priority Issues

```bash
curl "http://localhost:3000/api/jira/search?q=priority:high&projectId=PROJ_ID" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

### Create Sprint

```bash
curl -X POST http://localhost:3000/api/jira/sprints \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "projectId": "64abc123...",
    "name": "Sprint 1",
    "goal": "Implement user authentication",
    "startDate": "2024-02-01T00:00:00Z",
    "endDate": "2024-02-14T23:59:59Z"
  }'
```

### Get Board

```bash
curl "http://localhost:3000/api/jira/boards?projectId=64abc123...&type=kanban" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

### Move Issue on Board

```bash
curl -X PUT http://localhost:3000/api/jira/boards \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "action": "move_issue",
    "issueId": "64ghi789...",
    "fromColumn": "backlog",
    "toColumn": "in_progress"
  }'
```

### Create Automation Rule

```bash
curl -X POST http://localhost:3000/api/jira/automations \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "projectId": "64abc123...",
    "name": "Auto-assign bugs to QA",
    "trigger": "task_created",
    "conditions": {
      "type": "bug",
      "priority": "high"
    },
    "actions": [
      {
        "type": "auto_assign",
        "config": { "userId": "64qa_user..." }
      },
      {
        "type": "notify",
        "config": {
          "userIds": ["64qa_user..."],
          "title": "Bug assigned to you",
          "message": "A high priority bug was created",
          "channels": ["email", "in_app"]
        }
      }
    ]
  }'
```

### Get Velocity Report

```bash
curl "http://localhost:3000/api/jira/reports?projectId=64abc123...&type=velocity" \
  -H "Cookie: auth_token=YOUR_TOKEN"
```

---

## Key Concepts

### Issue Types

- **Epic** (Level 0): Highest level, contains stories
- **Story** (Level 1): User-facing feature
- **Task** (Level 2): Work to be done
- **Subtask** (Level 3): Sub-unit of a task
- **Bug**: Defect/issue
- **Improvement**: Enhancement/optimization

### Statuses

Default statuses are created automatically:
- **Backlog**: Not started
- **To Do**: Ready to start
- **In Progress**: Currently being worked on
- **In Review**: Pending review
- **Done**: Completed

### Priorities

- Low
- Medium
- High
- Critical

### Sprint States

- **Planning**: Sprint created, not started
- **Active**: Sprint in progress
- **Completed**: Sprint finished
- **Cancelled**: Sprint cancelled

### Board Types

- **Kanban**: Continuous flow, no sprints
- **Scrum**: Sprint-based, velocity tracking

---

## Advanced Features

### Custom Workflows

Create project-specific status flows:

```bash
curl -X POST http://localhost:3000/api/jira/workflows \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_token=YOUR_TOKEN" \
  -d '{
    "projectId": "64abc123...",
    "name": "Custom Workflow",
    "statuses": [
      { "name": "Backlog", "category": "to_do" },
      { "name": "Ready", "category": "to_do" },
      { "name": "In Progress", "category": "in_progress" },
      { "name": "Review", "category": "in_progress" },
      { "name": "Done", "category": "done" }
    ],
    "transitions": [
      {
        "fromStatus": "backlog",
        "toStatus": "ready",
        "allowedRoles": ["manager"]
      },
      {
        "fromStatus": "ready",
        "toStatus": "in_progress",
        "allowedRoles": ["developer", "manager"]
      }
    ]
  }'
```

### Search Syntax

Powerful search with JQL-like syntax:

```bash
# My open issues
/search?q=assignee:me

# High priority bugs in project
/search?q=type:bug AND priority:high&projectId=PROJ_ID

# Created this month
/search?q=created:>2024-01-01

# Specific issue summary
/search?q="login form"

# Combine conditions
/search?q=assignee:me AND status:in_progress AND priority:high
```

### Notifications

Multi-channel notifications:
- **email**: Send email notification
- **in_app**: Display in application
- **push**: Send push notification (FCM/APNS)
- **slack**: Post to Slack

### Time Tracking

Track time on issues for billing/reporting:

```bash
# Log 2 hours billable time
POST /jira/issues/time-logs
{
  "issueId": "...",
  "timeSpentMinutes": 120,
  "description": "Development",
  "isBillable": true
}
```

Then generate reports:

```bash
GET /jira/reports?type=time_tracking&projectId=...
```

---

## Integration Examples

### In React Components

```typescript
// Fetch user's issues
const [myIssues, setMyIssues] = useState([]);

useEffect(() => {
  fetch('/api/jira/search?q=assignee:me', {
    headers: {
      'Content-Type': 'application/json'
      // Cookie is sent automatically by browser
    }
  })
    .then(r => r.json())
    .then(data => setMyIssues(data.data.results));
}, []);

// Create issue
async function createIssue(summary, description) {
  const res = await fetch('/api/jira/issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      summary,
      description,
      type: 'task',
      priority: 'medium'
    })
  });
  return res.json();
}

// Move issue on board
async function moveIssue(issueId, toColumn) {
  const res = await fetch('/api/jira/boards', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'move_issue',
      issueId,
      toColumn
    })
  });
  return res.json();
}

// Log time
async function logTime(issueId, minutes, description) {
  const res = await fetch('/api/jira/issues/time-logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      issueId,
      timeSpentMinutes: minutes,
      description,
      isBillable: true
    })
  });
  return res.json();
}
```

### Using Automation Helper

```typescript
import {
  createAutoAssignRule,
  createNotificationRule,
  ConditionBuilder,
  ActionBuilder,
  validateAutomationRule
} from '@/lib/automationHelper';

// Create rule with builder pattern
const rule = {
  projectId: 'proj123',
  name: 'Auto-assign and notify on bug',
  trigger: 'task_created',
  conditions: new ConditionBuilder()
    .withType('bug')
    .withPriority('high')
    .build(),
  actions: new ActionBuilder()
    .autoAssign(qaUserId)
    .addLabel('urgent')
    .notify({
      userIds: [qaUserId],
      title: 'Critical bug assigned',
      message: 'A high-priority bug needs your attention',
      channels: ['email', 'in_app', 'push']
    })
    .build()
};

// Validate rule
const validation = validateAutomationRule(rule);
if (validation.valid) {
  // Submit to API
  const res = await fetch('/api/jira/automations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
}
```

---

## Permissions

### System Roles vs Project Roles

System roles:
- Super-Admin: Full access
- Admin: System management
- Project-Manager: Project creation/management
- Team-Lead: Team oversight
- Developer: Task execution
- QA: Testing and reporting
- Viewer: Read-only

Project roles (per project):
- Developer: Create/edit issues, log time
- QA: Testing, reporting
- Manager: Sprint planning, approvals
- Viewer: Read-only

### Permission Check

```typescript
// API automatically checks permissions
// If user lacks permission, returns 403 Forbidden
POST /api/jira/issues
{
  "projectId": "...",
  "summary": "...",
  // Requires: create_issue permission
}

// If denied:
{
  "success": false,
  "message": "Insufficient permissions for create_issue"
}
```

---

## Common Patterns

### Issue Lifecycle

1. Create issue (status: backlog)
2. Add to sprint (move to backlog in sprint)
3. Start work (change status: in_progress)
4. Add comments and time logs during work
5. Submit for review (change status: in_review)
6. Complete (change status: done)
7. Close issue (archive)

### Sprint Workflow

1. Create sprint (status: planning)
2. Add issues to sprint
3. Start sprint (status: active)
4. Team works on issues
5. Monitor burndown chart
6. Complete sprint (status: completed, velocity calculated)

### Automation Example: QA Workflow

```javascript
// Create automation rules for QA workflow
const qaWorkflow = [
  // When bug is created, send to QA
  createAutoAssignRule(
    projectId,
    "Route bugs to QA",
    { type: "bug" },
    qaTeamId
  ),

  // When status changes to in_review, notify reviewer
  {
    projectId,
    name: "Notify on review needed",
    trigger: "status_changed",
    conditions: { status: "in_review" },
    actions: [
      {
        type: "notify",
        config: {
          title: "Issue ready for review",
          message: "An issue is waiting for your review",
          channels: ["email", "in_app"]
        }
      }
    ]
  }
];
```

---

## Troubleshooting

### Issue Not Found

```
GET /api/jira/issues/invalid_id → 404 Not Found
```
Check that the issue ID is correct and the issue hasn't been deleted.

### Permission Denied

```
POST /api/jira/issues → 403 Forbidden
```
Check that you have the required role/permission. Admin can grant permissions.

### Invalid Status Transition

If a status transition is not allowed by workflow, the update fails. Check the workflow rules for allowed transitions.

### Automation Not Executing

- Check that the rule is `isActive: true`
- Verify conditions match (status, type, priority)
- Check action configurations are correct
- Look at audit logs for execution details

---

## Next Steps

1. **Build UI Components**: Create React components for boards, backlogs, reporting
2. **Set Up WebSocket**: Real-time board updates (see WebSocket section in API docs)
3. **Configure Integrations**: Email, Slack, file storage
4. **Create Dashboards**: Personal, sprint, team dashboards
5. **Set Up Reporting**: Custom reports and exports

---

## API Documentation

Full API documentation is available in [JIRA_API_DOCS.md](./JIRA_API_DOCS.md)

For the complete implementation details, see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## Support

- Check API response for error messages
- Review audit logs: `GET /api/audit-logs`
- Enable console logging for debugging
- Check browser DevTools for network requests
