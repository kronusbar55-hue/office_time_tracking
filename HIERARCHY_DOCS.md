# Issue Hierarchy & Sub-Tasks Documentation

Complete guide for the multi-level issue hierarchy system with sub-tasks, dependencies, checklists, and rollup logic.

## Table of Contents

1. [Hierarchy Structure](#hierarchy-structure)
2. [Sub-Task Management](#sub-task-management)
3. [Checklists](#checklists)
4. [Dependencies & Links](#dependencies--links)
5. [Status Rollup](#status-rollup)
6. [Automation Rules](#automation-rules)
7. [Bulk Operations](#bulk-operations)
8. [Reports](#reports)
9. [API Reference](#api-reference)

---

## Hierarchy Structure

### Five-Level Hierarchy

```
Level 1: Epic (EPIC-#)
  ├── Level 2: Story (STORY-#)
  │     ├── Level 3: Task (TASK-#)
  │     │     ├── Level 4: Sub-Task (TASK-1)
  │     │     ├── Sub-Task (TASK-2)
  │     │     └── Sub-Task (TASK-3)
  │     └── Task 2
  └── Story 2
```

### Rules

- **Epics** can contain multiple Stories
- **Stories** can contain multiple Tasks
- **Tasks** can contain multiple Sub-Tasks
- **Sub-Tasks** cannot exist without a parent Task
- **Completion %** rolls up from Sub-Tasks → Tasks → Stories → Epics
- **Parent auto-closes** when all Sub-Tasks are marked Done

### Data Relationships

- Each Task/SubTask stores `parentTask` reference
- `IssueHierarchy` model tracks the full path for quick lookups
- Progress calculated via `progressPercent` field

---

## Sub-Task Management

### Creating Sub-Tasks

**POST** `/api/jira/subtasks`

```json
{
  "parentTaskId": "64abc123...",
  "title": "Implement authentication",
  "description": "Add JWT-based auth",
  "assignee": "64user456...",
  "priority": "high",
  "dueDate": "2024-02-15",
  "estimatedTime": 480,
  "labels": ["backend", "security"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "64subtask789...",
    "key": "TASK-1",
    "title": "Implement authentication",
    "status": "todo",
    "parentKey": "TASK"
  }
}
```

### Listing Sub-Tasks

**GET** `/api/jira/subtasks?parentTaskId=64abc123...&status=in_progress`

Query Parameters:
- `parentTaskId` (required)
- `status` (optional): filter by status
- `assignee` (optional): filter by user
- `limit` (optional): max 100, default 50
- `offset` (optional): pagination

**Response:**
```json
{
  "success": true,
  "data": {
    "parentTaskId": "64abc123...",
    "total": 5,
    "completed": 2,
    "completionPercent": 40,
    "subtasks": [
      {
        "id": "64subtask1...",
        "key": "TASK-1",
        "title": "...",
        "status": "done",
        "priority": "high",
        "assignee": { "firstName": "John", "lastName": "Doe" },
        "dueDate": "2024-02-15T00:00:00Z",
        "estimatedTime": 480,
        "loggedTime": 520,
        "progressPercent": 100
      }
    ]
  }
}
```

### Getting Sub-Task Details

**GET** `/api/jira/subtasks/64subtask789...`

Returns complete sub-task with:
- Full task details
- Parent task reference
- Watchers
- Attachments
- Activity timestamps

### Updating Sub-Tasks

**PUT** `/api/jira/subtasks/64subtask789...`

```json
{
  "title": "Updated title",
  "status": "in_progress",
  "priority": "critical",
  "assignee": "64newuser...",
  "dueDate": "2024-02-20",
  "estimatedTime": 600,
  "loggedTime": 120,
  "labels": ["urgent", "backend"]
}
```

Automatically:
- Updates parent completion %
- Triggers automation rules
- Creates audit log
- Notifies assignee if changed

### Deleting Sub-Tasks

**DELETE** `/api/jira/subtasks/64subtask789...`

Soft-deletes (marks `isDeleted: true`):
- Sub-task remains in database for audit trail
- Removed from parent's child count
- Recalculates parent progress
- Creates deletion audit log

---

## Checklists

Lightweight to-do items within issues (both Tasks and Sub-Tasks)

### Creating Checklist Item

**POST** `/api/jira/checklists`

```json
{
  "issueId": "64abc123...",
  "action": "add_item",
  "item": {
    "title": "Design schema",
    "assignee": "64user456...",
    "dueDate": "2024-02-10"
  }
}
```

### Toggle Checklist Item

**POST** `/api/jira/checklists`

```json
{
  "issueId": "64abc123...",
  "action": "toggle_item",
  "itemId": "64checkitem..."
}
```

Auto-updates progress: `progressPercent = (completedItems / totalItems) * 100`

### Remove Checklist Item

**POST** `/api/jira/checklists`

```json
{
  "issueId": "64abc123...",
  "action": "remove_item",
  "itemId": "64checkitem..."
}
```

### Reorder Checklist Items

**POST** `/api/jira/checklists`

```json
{
  "issueId": "64abc123...",
  "action": "reorder",
  "items": [
    { "_id": "item1", "order": 0 },
    { "_id": "item2", "order": 1 },
    { "_id": "item3", "order": 2 }
  ]
}
```

### Get Checklist

**GET** `/api/jira/checklists?issueId=64abc123...`

Returns all checklist items with completion stats:
```json
{
  "items": [
    {
      "id": "...",
      "title": "Design schema",
      "completed": true,
      "assignee": { "firstName": "John", "lastName": "Doe" },
      "dueDate": "2024-02-10T00:00:00Z",
      "order": 0
    }
  ],
  "totalItems": 3,
  "completedItems": 1,
  "progressPercent": 33
}
```

---

## Dependencies & Links

### Issue Dependencies (Same Project)

**POST** `/api/jira/dependencies`

```json
{
  "sourceIssueId": "64abc123...",
  "targetIssueId": "64def456...",
  "type": "blocks",
  "description": "Cannot start API until schema is done"
}
```

**Dependency Types:**
- `blocks` - Source issue blocks target
- `is_blocked_by` - Source is blocked by target
- `relates_to` - Thematic relationship
- `duplicates` - Source is duplicate of target
- `clones` - Source cloned from target
- `depends_on` - Source depends on target

When `blocks` is created:
- Target issue assignee gets notified
- Dashboard flags the issue as blocked
- Workflow prevents work starting

### Cross-Project Links

**POST** `/api/jira/dependencies` (same endpoint)

```json
{
  "sourceIssueId": "proj1_task123...",
  "targetIssueId": "proj2_task456...",
  "type": "relates_to"
}
```

Automatically uses `IssueLink` model for cross-project tracking.

### Get Issue Dependencies

**GET** `/api/jira/dependencies?issueId=64abc123...&direction=both`

Parameters:
- `issueId` (required)
- `direction` (optional): `inbound`, `outbound`, `both`

**Response:**
```json
{
  "issueId": "64abc123...",
  "outbound": [
    {
      "id": "...",
      "targetKey": "PROJ-42",
      "targetTitle": "API Implementation",
      "targetStatus": "in_progress",
      "type": "blocks",
      "description": "Blocks API work"
    }
  ],
  "inbound": [
    {
      "id": "...",
      "sourceKey": "PROJ-41",
      "sourceTitle": "Schema Design",
      "type": "blocks"
    }
  ],
  "crossProjectOutbound": [...],
  "crossProjectInbound": [...]
}
```

### Update Dependency Status

**PUT** `/api/jira/dependencies`

```json
{
  "dependencyId": "64dep123...",
  "status": "resolved"
}
```

Changes status from `active` to `resolved` (no longer blocking).

### Delete Dependency

**DELETE** `/api/jira/dependencies?dependencyId=64dep123...`

---

## Status Rollup

### Auto-Calculation

Parent progress is automatically recalculated when:
- Sub-task status changes
- Sub-task is created/deleted
- Parent is accessed

**Formula:**
```
progressPercent = (completedSubTasks / totalSubTasks) * 100
```

### Auto-Close Parents

When all sub-tasks reach `done` status:
1. Parent automatically moves to `done`
2. Progress becomes 100%
3. `progressPercent` field updated
4. Watchers notified
5. Parent can auto-close its parent recursively

**Trigger Condition:**
```typescript
IF (subtasks with status != "done") == 0
THEN parent.status = "done"
```

### Recalculate Endpoint

**POST** `/api/jira/hierarchy`

```json
{
  "action": "recalculate",
  "issueId": "64abc123..."
}
```

Actions:
- `recalculate` - Recompute progress from sub-tasks
- `auto_close_parents` - Close parent chains if conditions met
- `rollup_progress` - Propagate progress up hierarchy

---

## Automation Rules

### Create Hierarchy Automation

**POST** `/api/jira/hierarchy-automation`

```json
{
  "projectId": "64proj123...",
  "name": "Auto-create sub-tasks for bugs",
  "trigger": "task_created",
  "taskTypeFilter": "bug",
  "templateId": "64template...",
  "description": "Automatically creates sub-tasks from template when bug is created"
}
```

### Available Triggers

- `task_created` - When any task/issue is created
- `subtask_status_changed` - When sub-task status changes
- `all_subtasks_done` - When all children complete

### Available Actions

- `create_subtasks` - Apply template to create children
- `auto_assign_subtasks` - Auto-assign based on rules
- `close_parent` - Auto-close parent when children done
- `notify` - Send notifications

### Auto-Assignment Rules

```json
{
  "projectId": "64proj123...",
  "name": "Bug fix workflow",
  "trigger": "task_created",
  "templateId": "64template...",
  "autoAssignRules": {
    "0": "64backend_user...",  // First sub-task
    "1": "64qa_user...",       // Second sub-task
    "2": "64frontend_user..."  // Third sub-task
  }
}
```

### Sub-Task Templates

**POST** `/api/jira/subtask-templates`

```json
{
  "projectId": "64proj123...",
  "name": "Bug Fix Template",
  "description": "Standard steps for fixing bugs",
  "triggeredBy": "task_created",
  "taskTypeFilter": "bug",
  "subtasks": [
    {
      "title": "Reproduce issue",
      "description": "...",
      "priority": "high",
      "estimatedMinutes": 120
    },
    {
      "title": "Fix code",
      "priority": "high",
      "estimatedMinutes": 240
    },
    {
      "title": "Write tests",
      "priority": "medium",
      "estimatedMinutes": 180
    },
    {
      "title": "Deploy fix",
      "priority": "high",
      "estimatedMinutes": 60
    }
  ]
}
```

**GET** `/api/jira/subtask-templates?projectId=64proj123...&trigger=task_created`

Lists all active templates for a project and trigger.

**PUT** `/api/jira/subtask-templates`

```json
{
  "templateId": "64template...",
  "parentTaskId": "64task...",
  "assignees": {
    "0": "64user1...",
    "1": "64user2..."
  }
}
```

Applies template to create sub-tasks.

---

## Bulk Operations

### Bulk Update Sub-Tasks

**POST** `/api/jira/bulk-operations`

```json
{
  "issueIds": [
    "64subtask1...",
    "64subtask2...",
    "64subtask3..."
  ],
  "operation": "change_status",
  "data": {
    "status": "in_progress"
  }
}
```

**Supported Operations:**
- `assign` - Bulk assign
- `change_status` - Change status
- `add_label` - Add label to all
- `remove_label` - Remove label from all
- `move_parent` - Move to different parent
- `delete` - Soft delete all

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": "change_status",
    "totalRequested": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "issueId": "...",
        "key": "TASK-1",
        "success": true
      }
    ]
  }
}
```

### Get Bulk Operation History

**GET** `/api/jira/bulk-operations?issueId=64abc123...`

Returns recent bulk operations affecting an issue.

---

## Reports

### Hierarchy Progress Report

**GET** `/api/jira/hierarchy-reports?type=hierarchy_progress&projectId=64proj...`

Shows completion % for each issue with sub-tasks:

```json
{
  "type": "hierarchy_progress",
  "data": [
    {
      "issueKey": "EPIC-1",
      "issueType": "epic",
      "totalSubTasks": 12,
      "completedSubTasks": 5,
      "inProgressSubTasks": 4,
      "blockingSubTasks": 1,
      "completionPercent": 42
    }
  ]
}
```

### Blocked Tasks Report

**GET** `/api/jira/hierarchy-reports?type=blocked_tasks&projectId=64proj...`

```json
{
  "type": "blocked_tasks",
  "totalBlocked": 5,
  "criticalBlockers": 2,
  "data": [
    {
      "blockedIssueKey": "TASK-42",
      "blockedIssueTitle": "API Development",
      "blockerKey": "TASK-41",
      "blockerTitle": "Schema Design",
      "blockerPriority": "high",
      "blockingDays": 3
    }
  ]
}
```

### Sub-Task Distribution Report

**GET** `/api/jira/hierarchy-reports?type=subtask_distribution`

Shows how sub-tasks are distributed across team:

```json
{
  "type": "subtask_distribution",
  "assigneeMetrics": [
    {
      "assignee": "John Doe",
      "total": 12,
      "done": 8,
      "inProgress": 3,
      "blocked": 1,
      "highPriority": 5,
      "completionPercent": 67
    }
  ]
}
```

### Dependency Chain Report

**GET** `/api/jira/hierarchy-reports?type=dependency_chain&issueId=64abc...`

Shows all dependencies affecting an issue:

```json
{
  "type": "dependency_chain",
  "issueId": "...",
  "blockedBy": [
    {
      "sourceKey": "TASK-41",
      "sourceStatus": "in_progress",
      "type": "blocks"
    }
  ],
  "blocks": [
    {
      "targetKey": "TASK-43",
      "targetStatus": "todo",
      "type": "blocks"
    }
  ]
}
```

### Completion Timeline Report

**GET** `/api/jira/hierarchy-reports?type=completion_timeline`

Shows when sub-tasks were completed:

```json
{
  "type": "completion_timeline",
  "totalCompleted": 45,
  "timeline": [
    {
      "period": "Week 5 of 2024",
      "completedCount": 8
    },
    {
      "period": "Week 6 of 2024",
      "completedCount": 12
    }
  ]
}
```

### Sub-Task Time Tracking Report

**GET** `/api/jira/hierarchy-reports?type=subtask_time_tracking`

Aggregates time logged per sub-task:

```json
{
  "type": "subtask_time_tracking",
  "totalLogged": 3600,
  "totalBillable": 2880,
  "entries": [
    {
      "issueId": "...",
      "totalMinutes": 480,
      "billableMinutes": 360,
      "totalHours": 8,
      "billableHours": 6,
      "logCount": 3
    }
  ]
}
```

---

## API Reference Summary

### Sub-Tasks
- `POST /api/jira/subtasks` - Create
- `GET /api/jira/subtasks?parentTaskId=...` - List
- `GET /api/jira/subtasks/[id]` - Get single
- `PUT /api/jira/subtasks/[id]` - Update
- `DELETE /api/jira/subtasks/[id]` - Delete

### Checklists
- `POST /api/jira/checklists` - Create/manage items
- `GET /api/jira/checklists?issueId=...` - Get checklist

### Dependencies
- `POST /api/jira/dependencies` - Create
- `GET /api/jira/dependencies?issueId=...` - Get
- `PUT /api/jira/dependencies` - Update status
- `DELETE /api/jira/dependencies?dependencyId=...` - Delete

### Bulk Operations
- `POST /api/jira/bulk-operations` - Execute
- `GET /api/jira/bulk-operations?issueId=...` - History

### Templates
- `POST /api/jira/subtask-templates` - Create
- `GET /api/jira/subtask-templates?projectId=...` - List
- `PUT /api/jira/subtask-templates` - Apply
- `DELETE /api/jira/subtask-templates?templateId=...` - Delete

### Hierarchy
- `POST /api/jira/hierarchy` - Recalculate/auto-close
- `GET /api/jira/hierarchy?issueId=...` - Get tree structure

### Automation
- `POST /api/jira/hierarchy-automation` - Create rule
- `GET /api/jira/hierarchy-automation?projectId=...` - List
- `PUT /api/jira/hierarchy-automation` - Update
- `DELETE /api/jira/hierarchy-automation?ruleId=...` - Delete

### Reports
- `GET /api/jira/hierarchy-reports?type=...` - Various reports

---

## Common Workflows

### Bug Triage → Fix Workflow

1. **Create Bug Issue**
   ```
   POST /api/jira/issues
   { type: "bug", priority: "high" }
   ```

2. **Automation applies template** (auto-created sub-tasks):
   - Reproduce issue
   - Fix code
   - Write tests
   - Deploy

3. **Team picks up sub-tasks**
   ```
   PUT /api/jira/subtasks/[id]
   { assignee: "dev_user", status: "in_progress" }
   ```

4. **Progress auto-rolls up**
   - Parent shows 25% complete
   - Watchers notified of progress

5. **When done**
   ```
   PUT /api/jira/subtasks/[id]
   { status: "done" }
   ```
   - All sub-tasks done → parent auto-closes
   - Automatic notifications sent
   - Reports updated

### Epic Planning Workflow

1. **Create Epic with Stories**
   ```
   Epic PROJ-1
   ├── Story PROJ-10 (Frontend)
   ├── Story PROJ-20 (Backend)
   └── Story PROJ-30 (Testing)
   ```

2. **Add Tasks to Stories**
   ```
   Story PROJ-10
   ├── Task PROJ-11 (UI Design)
   ├── Task PROJ-12 (API Integration)
   └── Task PROJ-13 (Testing)
   ```

3. **Add Sub-Tasks to Tasks**
   ```
   Task PROJ-11
   ├── Sub-Task PROJ-11-1 (Wireframes)
   ├── Sub-Task PROJ-11-2 (Design)
   └── Sub-Task PROJ-11-3 (Review)
   ```

4. **Dashboard shows**
   - Epic 15% complete (2/12 tasks done)
   - Story 30% complete (3/10 sub-tasks done)
   - Task 100% complete (1/1 sub-task done)

---

## Best Practices

1. **Use Dependencies** for cross-team coordination
2. **Create Templates** for repetitive work (bugs, features)
3. **Set Realistic Estimates** on sub-tasks for burndown accuracy
4. **Use Checklists** for lightweight tasks (code review, QA)
5. **Monitor Blocked Tasks** - they're priorities
6. **Review Reports Weekly** - catch progress issues early
7. **Set Automation Rules** - reduce manual work
8. **Tag with Labels** - easier searching and filtering

---

See [Main API Documentation](./JIRA_API_DOCS.md) for other features.
