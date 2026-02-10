# Jira Module API Documentation

Complete REST API documentation for the task/issue management module.

## Authentication
All endpoints require a JWT token in the `auth_token` cookie. Include the cookie with each request.

## Base URL
```
/api/jira
```

---

## Projects

### Create Project
**POST** `/projects`

Create a new project with auto-scaffolded statuses, issue types, and workflows.

**Request:**
```json
{
  "name": "Project Name",
  "key": "PROJ",  // auto-generated if not provided
  "description": "Project description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64abc123...",
    "name": "Project Name",
    "key": "PROJ",
    "defaultStatusesCreated": 7,
    "defaultIssueTypesCreated": 6,
    "defaultWorkflowCreated": true
  }
}
```

### List Projects
**GET** `/projects`

List all projects the user is a member of.

**Query Parameters:**
- `skip` (optional): Number of projects to skip (default: 0)
- `limit` (optional): Number of projects to return (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "...",
        "name": "Project Name",
        "key": "PROJ",
        "memberCount": 5,
        "issueCount": 42
      }
    ],
    "total": 10
  }
}
```

---

## Issues

### Create Issue
**POST** `/issues`

Create a new issue/task in a project.

**Request:**
```json
{
  "projectId": "64abc123...",
  "summary": "Fix login bug",
  "description": "Users cannot login with email",
  "type": "bug",  // epic, story, task, subtask, bug, improvement
  "priority": "high",  // low, medium, high, critical
  "assignee": "64def456...",  // optional
  "labels": ["urgent", "backend"],  // optional
  "estimatedTime": 480  // minutes (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64ghi789...",
    "key": "PROJ-42",
    "summary": "Fix login bug",
    "status": "backlog"
  }
}
```

### List Issues
**GET** `/issues`

List issues with optional filtering.

**Query Parameters:**
- `projectId` (required): Project ID to filter by
- `assignee` (optional): Filter by assignee user ID
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `labels` (optional): Comma-separated labels to filter by
- `type` (optional): Filter by issue type
- `skip` (optional): Default 0
- `limit` (optional): Default 50

**Response:**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "...",
        "key": "PROJ-42",
        "summary": "Fix login bug",
        "type": "bug",
        "status": "in_progress",
        "priority": "high",
        "assignee": { "firstName": "John", "lastName": "Doe" }
      }
    ],
    "total": 15
  }
}
```

### Get Issue Details
**GET** `/issues/[id]`

Get complete details of a single issue including comments, time logs, watchers.

**Response:**
```json
{
  "success": true,
  "data": {
    "issue": {
      "id": "...",
      "key": "PROJ-42",
      "summary": "Fix login bug",
      "description": "...",
      "type": "bug",
      "status": "in_progress",
      "priority": "high",
      "assignee": { "firstName": "John", "lastName": "Doe" },
      "totalTimeSpent": 240,  // minutes
      "estimatedTime": 480,
      "created": "2024-01-15T10:00:00Z",
      "updated": "2024-01-16T14:30:00Z"
    },
    "comments": [
      {
        "id": "...",
        "content": "Fixed in PR #123",
        "author": { "firstName": "Jane", "lastName": "Smith" },
        "createdAt": "2024-01-16T14:30:00Z",
        "likes": 2,
        "replies": []
      }
    ],
    "timeLogs": [
      {
        "id": "...",
        "timeSpent": 120,
        "isBillable": true,
        "description": "Debugging session",
        "loggedBy": { "firstName": "John", "lastName": "Doe" },
        "loggedDate": "2024-01-16T14:00:00Z"
      }
    ],
    "watchers": [],
    "activityLog": []
  }
}
```

### Update Issue
**PUT** `/issues/[id]`

Update issue fields (status, assignee, priority, labels, etc.).

**Request:**
```json
{
  "summary": "Updated summary",
  "status": "in_progress",
  "assignee": "64def456...",
  "priority": "critical",
  "labels": ["urgent", "blocker"],
  "estimatedTime": 600
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "key": "PROJ-42",
    "summary": "Updated summary",
    "status": "in_progress"
  }
}
```

### Delete Issue
**DELETE** `/issues/[id]`

Permanently delete an issue and all related comments/time logs.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64ghi789..."
  }
}
```

---

## Comments

### Add Comment
**POST** `/issues/comments`

Add a comment or reply to an issue.

**Request:**
```json
{
  "issueId": "64ghi789...",
  "content": "This is a comment @john",
  "parentCommentId": "64jkl012..."  // optional - for threaded replies
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64mno345...",
    "content": "This is a comment @john",
    "authorId": "64def456..."
  }
}
```

### Get Issue Comments
**GET** `/issues/comments?issueId=64ghi789...`

Retrieve all comments on an issue.

**Response:**
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": "...",
        "content": "...",
        "author": { "firstName": "John", "lastName": "Doe" },
        "createdAt": "2024-01-16T14:30:00Z",
        "likes": 2,
        "isEdited": false,
        "replies": []
      }
    ]
  }
}
```

---

## Time Logging

### Log Time
**POST** `/issues/time-logs`

Log time spent on an issue.

**Request:**
```json
{
  "issueId": "64ghi789...",
  "timeSpentMinutes": 120,
  "description": "Debugging and fixing",
  "isBillable": true,
  "loggedDate": "2024-01-16T14:00:00Z"  // optional, defaults to today
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "timeSpent": 120,
    "isBillable": true
  }
}
```

### Get Time Logs
**GET** `/issues/time-logs?issueId=64ghi789...`

Retrieve all time logs for an issue.

**Response:**
```json
{
  "success": true,
  "data": {
    "timeLogs": [
      {
        "id": "...",
        "timeSpent": 120,
        "isBillable": true,
        "description": "...",
        "loggedBy": { "firstName": "John", "lastName": "Doe" },
        "loggedDate": "2024-01-16T14:00:00Z"
      }
    ],
    "summary": {
      "totalMinutes": 480,
      "totalBillableMinutes": 360,
      "totalHours": 8.0
    }
  }
}
```

---

## Sprints

### Create Sprint
**POST** `/sprints`

Create a new sprint.

**Request:**
```json
{
  "projectId": "64abc123...",
  "name": "Sprint 1",
  "goal": "Implement user authentication",
  "startDate": "2024-02-01T00:00:00Z",
  "endDate": "2024-02-14T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64pqr678...",
    "name": "Sprint 1",
    "status": "planning",
    "capacity": 0
  }
}
```

### List Sprints
**GET** `/sprints?projectId=64abc123...`

List all sprints in a project.

**Response:**
```json
{
  "success": true,
  "data": {
    "sprints": [
      {
        "id": "...",
        "name": "Sprint 1",
        "status": "active",
        "goal": "...",
        "issueCount": 8,
        "completedCount": 3
      }
    ]
  }
}
```

### Start Sprint
**PUT** `/sprints`

Start a sprint (change status from planning to active).

**Request:**
```json
{
  "action": "start",
  "sprintId": "64pqr678..."
}
```

**Response:**
```json
{
  "success": true,
  "data": { "status": "active" }
}
```

### Add Issue to Sprint
**PUT** `/sprints`

Add an issue to a sprint.

**Request:**
```json
{
  "action": "add_issue",
  "sprintId": "64pqr678...",
  "issueId": "64ghi789..."
}
```

### Complete Sprint
**PUT** `/sprints`

Complete a sprint and calculate velocity.

**Request:**
```json
{
  "action": "complete",
  "sprintId": "64pqr678..."
}
```

---

## Boards

### Get Board
**GET** `/boards?projectId=64abc123...&type=kanban`

Get board with columns and issues.

**Query Parameters:**
- `projectId` (required): Project ID
- `type` (optional): `kanban` or `scrum` (default: kanban)
- `sprintId` (optional): For scrum boards

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Project Board",
    "type": "kanban",
    "columns": [
      {
        "id": "backlog",
        "name": "Backlog",
        "status": "backlog",
        "wipLimit": 20,
        "issues": [
          {
            "id": "...",
            "key": "PROJ-42",
            "summary": "Fix login bug",
            "priority": "high"
          }
        ]
      },
      {
        "id": "in_progress",
        "name": "In Progress",
        "status": "in_progress",
        "wipLimit": 5,
        "issues": []
      }
    ]
  }
}
```

### Move Issue on Board
**PUT** `/boards`

Drag and drop an issue to a different column.

**Request:**
```json
{
  "action": "move_issue",
  "issueId": "64ghi789...",
  "fromColumn": "backlog",
  "toColumn": "in_progress"
}
```

**Response:**
```json
{
  "success": true,
  "data": { "status": "in_progress" }
}
```

---

## Workflows

### List Workflows
**GET** `/workflows?projectId=64abc123...`

List all workflows available in a project.

**Response:**
```json
{
  "success": true,
  "data": {
    "workflows": [
      {
        "id": "...",
        "name": "Default Workflow",
        "statusCount": 5,
        "transitionCount": 8
      }
    ]
  }
}
```

### Get Workflow Details
**GET** `/workflows?projectId=64abc123...&workflowId=64stu901...`

Get complete workflow with statuses and transitions.

**Response:**
```json
{
  "success": true,
  "data": {
    "workflow": {
      "id": "...",
      "name": "Default Workflow",
      "order": 0,
      "statuses": [
        { "id": "backlog", "name": "Backlog", "category": "to_do" },
        { "id": "in_progress", "name": "In Progress", "category": "in_progress" }
      ],
      "transitions": [
        {
          "id": "...",
          "fromStatus": "backlog",
          "toStatus": "in_progress",
          "allowedRoles": ["manager", "developer"]
        }
      ]
    }
  }
}
```

### Create Workflow
**POST** `/workflows`

Create a custom workflow.

**Request:**
```json
{
  "projectId": "64abc123...",
  "name": "Custom Workflow",
  "statuses": [
    { "name": "Backlog", "category": "to_do" },
    { "name": "In Progress", "category": "in_progress" }
  ],
  "transitions": [
    {
      "fromStatus": "backlog",
      "toStatus": "in_progress",
      "allowedRoles": ["manager", "developer"]
    }
  ]
}
```

---

## Reports

### Generate Report
**GET** `/reports?projectId=64abc123...&type=velocity`

Generate various reports.

**Query Parameters:**
- `projectId` (required): Project ID
- `type` (required): Report type
  - `velocity`: Completed story points per sprint
  - `burndown`: Tasks/points completed over time
  - `workload`: Tasks assigned per team member
  - `time_tracking`: Hours logged per user
  - `issue_breakdown`: Issues by type, priority, status
- `sprintId` (optional): For sprint-specific reports
- `startDate` (optional): YYYY-MM-DD format
- `endDate` (optional): YYYY-MM-DD format

**Response (Velocity):**
```json
{
  "success": true,
  "data": {
    "type": "velocity",
    "projectKey": "PROJ",
    "sprints": [
      {
        "id": "...",
        "name": "Sprint 1",
        "plannedPoints": 40,
        "completedPoints": 38,
        "velocity": 38
      },
      {
        "id": "...",
        "name": "Sprint 2",
        "plannedPoints": 35,
        "completedPoints": 35,
        "velocity": 35
      }
    ],
    "averageVelocity": 36.5
  }
}
```

---

## Automations

### Create Automation Rule
**POST** `/automations`

Create an automation rule that executes on specific triggers.

**Request:**
```json
{
  "projectId": "64abc123...",
  "name": "Auto-assign high priority bugs",
  "trigger": "task_created",
  "conditions": {
    "type": "bug",
    "priority": "high"
  },
  "actions": [
    {
      "type": "auto_assign",
      "config": { "userId": "64def456..." }
    },
    {
      "type": "notify",
      "config": {
        "userId": "64def456...",
        "title": "Bug assigned to you",
        "message": "A high-priority bug has been assigned to you"
      }
    }
  ]
}
```

**Available Triggers:**
- `task_created`: When a new issue is created
- `status_changed`: When issue status changes
- `assigned`: When an issue is assigned
- `pr_merged`: When a PR is merged
- `due_soon`: When due date is approaching

**Available Actions:**
- `auto_assign`: Automatically assign to a user
- `change_status`: Automatically change status
- `notify`: Send notification
- `add_label`: Add a label
- `move_to_sprint`: Move to a sprint

### List Automation Rules
**GET** `/automations?projectId=64abc123...`

List all automation rules for a project.

---

## Notifications

### Get Notifications
**GET** `/notifications`

Get notifications for the current user.

**Query Parameters:**
- `unreadOnly` (optional): Show only unread (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "...",
        "type": "issue_assigned",
        "title": "Issue assigned to you",
        "message": "PROJ-42 has been assigned to you",
        "isRead": false,
        "createdAt": "2024-01-16T14:30:00Z"
      }
    ],
    "unreadCount": 3
  }
}
```

### Mark as Read
**PUT** `/notifications`

Mark one or more notifications as read.

**Request:**
```json
{
  "markAllAsRead": true
  // OR
  "notificationIds": ["...", "..."]
}
```

### Delete Notifications
**DELETE** `/notifications`

Delete notifications.

**Request:**
```json
{
  "deleteAll": true
  // OR
  "notificationIds": ["...", "..."]
}
```

---

## Search

### Advanced Search
**GET** `/search?q=assignee:me AND status:in_progress`

Search issues using JQL-like syntax.

**Query Parameters:**
- `q` (required): Search query
- `projectId` (optional): Limit to project
- `limit` (optional): Max results (default 50)
- `offset` (optional): Pagination offset (default 0)

**Supported Filters:**
- `assignee:me` - Issues assigned to you
- `assignee:unassigned` - Unassigned issues
- `status:VALUE` - Filter by status
- `priority:VALUE` - Filter by priority
- `type:VALUE` - Filter by issue type
- `label:VALUE` - Filter by label
- `created:>2024-01-01` - Created after date
- `updated:<2024-01-31` - Updated before date
- `"search text"` - Full text search in summary/description

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "assignee:me",
    "total": 15,
    "results": [
      {
        "id": "...",
        "key": "PROJ-42",
        "summary": "Fix login bug",
        "status": "in_progress",
        "priority": "high"
      }
    ]
  }
}
```

---

## Personal Dashboard

### Get Personal Dashboard Data
**GET** `/me`

Get personalized dashboard data: my issues, activity, notifications, projects.

**Response:**
```json
{
  "success": true,
  "data": {
    "myIssues": [...],
    "issueStats": {
      "total": 8,
      "byStatus": {
        "in_progress": 3,
        "todo": 5
      }
    },
    "recentActivity": [...],
    "unreadNotifications": [...],
    "unreadCount": 2,
    "activeSprints": [...],
    "myProjects": [...]
  }
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "error details"
}
```

Common HTTP Status Codes:
- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (not authenticated)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error

---

## Rate Limiting

- Standard rate limit: 1000 requests per hour per user
- Search endpoints: 100 requests per minute
- File uploads: 100MB max per file

---

## WebSocket Events (Coming Soon)

Real-time updates for board changes:
```
/api/jira/ws
Events:
- issue_created
- issue_updated
- issue_moved
- comment_added
- board_updated
```

---

## Changelog

### v1.0.0 (Initial Release)
- Core issue/task management (CRUD)
- Sprint planning and execution
- Kanban/Scrum boards
- Custom workflows
- Time tracking and reporting
- Comment threads
- Automation rules
- Notifications
- Advanced search
- Personal dashboard
