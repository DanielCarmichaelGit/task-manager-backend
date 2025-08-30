# Task Manager Backend API - Complete Documentation

## Base URLs

- **Development**: `http://localhost:3021`
- **Production**: `https://your-heroku-app-name.herokuapp.com`

## Authentication

All protected endpoints need this header:

```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### Auth Routes

- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/profile` - Get profile
- `PUT /api/auth/profile` - Update profile

### Task Routes

- `GET /api/tasks` - Get all tasks (with optional children)
- `GET /api/tasks/:id` - Get single task
- `GET /api/tasks/:id/children` - Get child tasks for a parent
- `GET /api/tasks/:id/with-children` - Get task with all its children
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/status` - Change status
- `POST /api/tasks/:id/enhance-ai` - Enhance task with AI or split into subtasks
- `GET /api/tasks/:id/enhance-ai/status` - Get AI enhancement status (SSE)

### System Routes

- `GET /health` - Server status
- `GET /` - API info

---

## Request Bodies

### POST /api/auth/register

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "user_metadata": {
    "full_name": "John Doe"
  }
}
```

### POST /api/auth/login

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### PUT /api/auth/profile

**Body:**

```json
{
  "user_metadata": {
    "full_name": "John Doe Updated",
    "avatar_url": "https://example.com/avatar.jpg"
  }
}
```

### POST /api/tasks

**Body:**

```json
{
  "title": "Complete project proposal",
  "description": "Write up the technical requirements and timeline",
  "status": "pending",
  "priority": "high",
  "due_date": "2024-01-15T23:59:59Z",
  "parent_task_id": "optional-parent-task-uuid"
}
```

### PUT /api/tasks/:id

**Body:** (same as POST, all fields optional)

```json
{
  "title": "Updated task title",
  "status": "in_progress",
  "parent_task_id": "new-parent-task-uuid"
}
```

### PATCH /api/tasks/:id/status

**Body:**

```json
{
  "status": "completed"
}
```

### POST /api/tasks/:id/enhance-ai

**Body:**

```json
{
  "enhancement_type": "enhance"
}
```

**Or for splitting:**

```json
{
  "enhancement_type": "split"
}
```

**Response for Enhancement:**

```json
{
  "success": true,
  "message": "Task enhanced successfully with AI",
  "data": {
    "id": "task-uuid",
    "title": "Original title",
    "description": "Original description",
    "enhanced_title": "[Enhanced] Original title",
    "enhanced_description": "Enhanced description with AI improvements",
    "ai_enhancement_notes": "Title and description enhanced for clarity and actionability"
  }
}
```

**Response for Splitting:**

```json
{
  "success": true,
  "message": "Task split into 4 subtasks",
  "data": {
    "parent_task_id": "original-task-uuid",
    "subtasks": [
      {
        "title": "Research Task Name",
        "description": "Conduct initial research and gather information",
        "estimated_effort": "2-3 hours",
        "priority": "medium"
      },
      {
        "title": "Plan Task Name",
        "description": "Create detailed plan and timeline",
        "estimated_effort": "1-2 hours",
        "priority": "high"
      }
    ],
    "split_reasoning": "Task has been intelligently split into logical subtasks covering research, planning, execution, and review phases."
  }
}
```

### GET /api/tasks/:id/enhance-ai/status

**Server-Sent Events (SSE) endpoint for real-time AI enhancement status**

**Headers:**

```
Accept: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Response Format:**

```
event: status
data: {"status": "processing", "progress": 25, "message": "Analyzing task content..."}

event: status
data: {"status": "processing", "progress": 75, "message": "Generating enhanced content..."}

event: complete
data: {"status": "completed", "result": {...}}

event: error
data: {"status": "error", "message": "AI enhancement failed"}
```

**Event Types:**

- `status` - Progress updates during processing
- `complete` - Enhancement completed successfully
- `error` - Enhancement failed or timed out

---

## AI Enhancement Timeout Handling

### Timeout Configuration

- **Request Timeout**: 30 seconds for initial request
- **AI Processing Timeout**: 60 seconds for OpenAI API calls
- **SSE Connection Timeout**: 120 seconds for real-time updates

### Timeout Scenarios

#### 1. **Request Timeout (30s)**

If the initial request takes longer than 30 seconds:

```json
{
  "success": false,
  "error": "Request Timeout",
  "message": "Request timed out. Use GET /api/tasks/:id/enhance-ai/status for real-time updates.",
  "request_id": "uuid-for-tracking"
}
```

#### 2. **AI Processing Timeout (60s)**

If OpenAI processing takes longer than 60 seconds:

```json
{
  "success": false,
  "error": "AI Processing Timeout",
  "message": "AI enhancement is taking longer than expected. Check status endpoint for updates.",
  "request_id": "uuid-for-tracking"
}
```

#### 3. **SSE Connection Timeout (120s)**

If SSE connection exceeds 120 seconds:

```
event: timeout
data: {"status": "timeout", "message": "Connection timed out. Reconnect to continue monitoring."}
```

### Recommended Implementation

#### Frontend Timeout Handling

```javascript
// Initial request with timeout
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(`/api/tasks/${taskId}/enhance-ai`, {
    method: "POST",
    body: JSON.stringify({ enhancement_type: "enhance" }),
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  // Handle response
} catch (error) {
  if (error.name === "AbortError") {
    // Request timed out, switch to SSE monitoring
    monitorEnhancementStatus(taskId);
  }
}

// SSE monitoring for real-time updates
function monitorEnhancementStatus(taskId) {
  const eventSource = new EventSource(`/api/tasks/${taskId}/enhance-ai/status`);

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // Update UI with real-time status
  };

  eventSource.onerror = () => {
    // Handle connection errors
    eventSource.close();
  };
}
```

#### Fallback Strategy

1. **Initial Request**: Try POST with 30s timeout
2. **On Timeout**: Switch to SSE monitoring
3. **SSE Monitoring**: Real-time updates until completion
4. **Reconnection**: Auto-reconnect if SSE connection drops

---

## Query Parameters

### GET /api/tasks

- `with_children=true` - Include child tasks for each task
- `limit=N` - Limit the number of tasks returned (e.g., `limit=15`)

**Examples:**

```
GET /api/tasks?with_children=true
GET /api/tasks?limit=15
GET /api/tasks?with_children=true&limit=10
```

**Response includes:**

- `tasks` - Array of tasks
- `limit` - Applied limit (null if no limit)
- `total_count` - Number of tasks returned

---

## Parent-Child Task Relationships

### Creating Child Tasks

To create a child task, include the `parent_task_id` field:

```json
{
  "title": "Subtask 1",
  "description": "This is a child of the main task",
  "parent_task_id": "uuid-of-parent-task"
}
```

### Getting Child Tasks

- `GET /api/tasks/:id/children` - Get only the child tasks
- `GET /api/tasks/:id/with-children` - Get parent task with all children included

### Task Hierarchy

- Tasks can have multiple children
- Maximum nesting depth: 3 levels
- Circular references are prevented
- Deleting a parent task sets `parent_task_id` to NULL for children

---

## AI Enhancement Features

### Task Enhancement

The AI enhancement feature can improve task clarity and actionability:

- **Enhanced Titles**: Make task titles more specific and actionable
- **Enhanced Descriptions**: Add context, steps, and success criteria
- **Smart Formatting**: Structure descriptions for better readability

### Task Splitting

The AI can intelligently split complex tasks into manageable subtasks:

- **Research Phase**: Initial information gathering and analysis
- **Planning Phase**: Strategy development and timeline creation
- **Execution Phase**: Main implementation work
- **Review Phase**: Quality assurance and validation

### How It Works

1. **Enhance Mode**: AI analyzes the task and improves title/description
2. **Split Mode**: AI determines optimal subtask breakdown and creates child tasks
3. **Automatic Updates**: Enhanced content is saved directly to the database
4. **Hierarchical Structure**: Split tasks maintain parent-child relationships

### AI Enhancement Examples

- **Before**: "Build website"
- **After Enhancement**: "[Enhanced] Build company website with modern design and responsive layout"
- **After Splitting**: Creates 4 subtasks covering research, planning, development, and testing

**Note**: Current implementation uses mock AI responses. In production, integrate with OpenAI GPT, Claude, or similar AI services for real intelligent enhancement.

---

## Task Status Options

- `pending`, `in_progress`, `completed`, `cancelled`

## Task Priority Options

- `low`, `medium`, `high`

---

## Response Formats

### Single Task

```json
{
  "task": {
    "id": "uuid",
    "title": "Task title",
    "description": "Task description",
    "status": "pending",
    "priority": "medium",
    "due_date": "2024-01-15T23:59:59Z",
    "user_id": "user-uuid",
    "parent_task_id": "parent-uuid-or-null",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
  }
}
```

### Task with Children

```json
{
  "task": {
    "id": "uuid",
    "title": "Parent task",
    "description": "Main task description",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2024-01-15T23:59:59Z",
    "user_id": "user-uuid",
    "parent_task_id": null,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "children": [
      {
        "id": "child-uuid",
        "title": "Child task",
        "description": "Subtask description",
        "status": "pending",
        "priority": "medium",
        "parent_task_id": "parent-uuid",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z"
      }
    ],
    "child_count": 1
  }
}
```

### Child Tasks Only

```json
{
  "children": [
    {
      "id": "child-uuid",
      "title": "Child task",
      "status": "pending",
      "priority": "medium",
      "parent_task_id": "parent-uuid",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "parent_task_id": "parent-uuid"
}
```

---

## Error Responses

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common errors:

- `400 Bad Request` - Invalid data or missing required fields
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - Task not found
- `500 Internal Server Error` - Server-side error

---

## Database Schema Update

To enable parent-child relationships, run this SQL in your Supabase database:

```sql
-- Add parent_task_id column to existing tasks table
ALTER TABLE tasks
ADD COLUMN parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Prevent circular references
ALTER TABLE tasks
ADD CONSTRAINT check_no_self_reference
CHECK (parent_task_id != id);
```

---

## Usage Examples

### 1. Create a parent task

```bash
POST /api/tasks
{
  "title": "Build Website",
  "description": "Create company website",
  "status": "pending",
  "priority": "high"
}
```

### 2. Create a child task

```bash
POST /api/tasks
{
  "title": "Design Homepage",
  "description": "Create homepage mockup",
  "status": "pending",
  "priority": "medium",
  "parent_task_id": "parent-task-uuid-from-step-1"
}
```

### 3. Get parent task with all children

```bash
GET /api/tasks/parent-task-uuid/with-children
```

### 4. Get only child tasks

```bash
GET /api/tasks/parent-task-uuid/children
```

### 5. Get all tasks with children included

```bash
GET /api/tasks?with_children=true
```

### 6. Enhance a task with AI

```bash
POST /api/tasks/task-uuid/enhance-ai
{
  "enhancement_type": "enhance"
}
```

### 7. Split a task into subtasks using AI

```bash
POST /api/tasks/task-uuid/enhance-ai
{
  "enhancement_type": "split"
}
```

---

## Frontend Implementation Notes

1. **Task Tree Structure** - Use the `with_children` parameter to build hierarchical UI
2. **Nested Display** - Show parent tasks with expandable child sections
3. **Drag & Drop** - Allow users to drag tasks to change parent-child relationships
4. **Breadcrumb Navigation** - Show task hierarchy path
5. **Progress Calculation** - Calculate overall progress based on parent and child completion

This API now supports full hierarchical task management with parent-child relationships!
