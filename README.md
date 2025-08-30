# Task Manager Backend

A robust Node.js/Express backend with Supabase integration, featuring JWT authentication middleware, AI-powered task enhancement, hierarchical task management, and comprehensive security measures. Designed for deployment on Heroku.

## ✨ Features

- 🔐 **JWT Authentication** with Supabase
- 🛡️ **Security Middleware** including rate limiting, CORS, and Helmet
- 📝 **Task Management API** with full CRUD operations
- 🤖 **AI Enhancement** - enhance task clarity or split into subtasks
- 🌳 **Hierarchical Tasks** - parent-child relationships for complex projects
- 🚀 **Heroku Ready** with optimized deployment
- 📊 **Health Monitoring** endpoints
- 🔒 **User Isolation** - users can only access their own data
- ⚡ **Performance** with compression and optimized queries

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **Security**: Helmet, CORS, Rate Limiting
- **Deployment**: Heroku

## 📋 Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Heroku account (for deployment)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd task-manager-backend
npm install
```

### 2. Environment Setup

Copy the environment example file and configure your Supabase credentials:

```bash
cp env.example .env
```

Edit `.env` with your Supabase project details:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3000
NODE_ENV=development
```

### 3. Supabase Database Setup

Run this SQL in your Supabase SQL editor to create the complete database schema:

```sql
-- Create tasks table with parent-child support
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  estimated_hours INTEGER,
  actual_hours INTEGER,
  progress_percentage INTEGER DEFAULT 0,
  tags TEXT[],
  assignee_id UUID REFERENCES auth.users(id),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own tasks
CREATE POLICY "Users can only access their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Add constraint to prevent circular references
ALTER TABLE tasks ADD CONSTRAINT check_no_self_reference
CHECK (parent_task_id != id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 4. Run Development Server

```bash
npm run dev
```

The server will start on an available port (usually `http://localhost:3001`)

## 🔌 API Endpoints

### Authentication

| Method | Endpoint             | Description          | Auth Required |
| ------ | -------------------- | -------------------- | ------------- |
| POST   | `/api/auth/register` | User registration    | No            |
| POST   | `/api/auth/login`    | User login           | No            |
| POST   | `/api/auth/logout`   | User logout          | Yes           |
| GET    | `/api/auth/profile`  | Get user profile     | Yes           |
| PUT    | `/api/auth/profile`  | Update user profile  | Yes           |
| POST   | `/api/auth/refresh`  | Refresh access token | No            |

### Tasks

| Method | Endpoint                       | Description                  | Auth Required |
| ------ | ------------------------------ | ---------------------------- | ------------- |
| GET    | `/api/tasks`                   | Get all user tasks           | Yes           |
| GET    | `/api/tasks/:id`               | Get specific task            | Yes           |
| GET    | `/api/tasks/:id/children`      | Get child tasks for a parent | Yes           |
| GET    | `/api/tasks/:id/with-children` | Get task with all children   | Yes           |
| POST   | `/api/tasks`                   | Create new task              | Yes           |
| PUT    | `/api/tasks/:id`               | Update task                  | Yes           |
| DELETE | `/api/tasks/:id`               | Delete task                  | Yes           |
| PATCH  | `/api/tasks/:id/status`        | Update task status           | Yes           |
| POST   | `/api/tasks/:id/enhance-ai`    | Enhance task with AI         | Yes           |

### System

| Method | Endpoint  | Description     | Auth Required |
| ------ | --------- | --------------- | ------------- |
| GET    | `/health` | Health check    | No            |
| GET    | `/`       | API information | No            |

## 🤖 AI Enhancement Features

### OpenAI Integration

The backend now includes real AI enhancement capabilities using OpenAI's GPT-4 model:

- **Task Enhancement**: Improves task titles and descriptions for clarity and actionability
- **Task Splitting**: Intelligently breaks down complex tasks into logical subtasks
- **Zod Validation**: Ensures type safety and data integrity throughout the process
- **Fallback Handling**: Graceful degradation if AI responses can't be parsed

### How It Works

1. **Enhancement Mode** (`enhancement_type: "enhance"`):

   - Sends task to OpenAI with specific enhancement prompts
   - Receives improved title and description
   - Updates database with enhanced content
   - Tracks enhancement status and metadata

2. **Split Mode** (`enhancement_type: "split"`):
   - Analyzes complex task using AI
   - Creates 3-6 logical subtasks with descriptions
   - Assigns priorities and effort estimates
   - Maintains parent-child relationships
   - Updates parent task status

### API Usage

```bash
# Enhance a task
POST /api/tasks/:id/enhance-ai
{
  "enhancement_type": "enhance"
}

# Split a task into subtasks
POST /api/tasks/:id/enhance-ai
{
  "enhancement_type": "split"
}
```

### Environment Setup

To use AI enhancement features:

1. **Get OpenAI API Key**:

   - Sign up at [OpenAI Platform](https://platform.openai.com/)
   - Generate an API key
   - Add to your `.env` file: `OPENAI_API_KEY=your_key_here`

2. **Install Dependencies**:
   ```bash
   npm install openai zod
   ```

### AI Prompt Engineering

The system uses carefully crafted prompts for:

- **Task Enhancement**: Focus on clarity, actionability, and professional language
- **Task Splitting**: Consider workflow progression, effort estimation, and priority assignment
- **Response Parsing**: Structured JSON responses with fallback handling

### Error Handling

- **API Failures**: Graceful fallback to basic enhancement
- **Parsing Errors**: Uses raw AI response as fallback
- **Rate Limiting**: Respects OpenAI API limits
- **Validation**: Zod schemas ensure data integrity

## 🌳 Hierarchical Task Management

### Parent-Child Relationships

- Tasks can have multiple child tasks
- Maximum nesting depth: 3 levels
- Circular references are prevented
- Deleting a parent task sets `parent_task_id` to NULL for children

### Query Parameters

```bash
# Get all tasks with children included
GET /api/tasks?with_children=true

# Get only child tasks for a specific parent
GET /api/tasks/:id/children

# Get parent task with all children
GET /api/tasks/:id/with-children
```

## 🔐 Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

**Important**: After registration, users must confirm their email before logging in. Supabase sends a confirmation email automatically.

## 📝 Request/Response Examples

### Create Task

**Request:**

```bash
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Complete project documentation",
  "description": "Write comprehensive API documentation",
  "priority": "high",
  "due_date": "2024-01-15T23:59:59Z",
  "parent_task_id": "optional-parent-uuid"
}
```

**Response:**

```json
{
  "message": "Task created successfully",
  "task": {
    "id": "uuid-here",
    "title": "Complete project documentation",
    "description": "Write comprehensive API documentation",
    "status": "pending",
    "priority": "high",
    "due_date": "2024-01-15T23:59:59Z",
    "user_id": "user-uuid",
    "parent_task_id": null,
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

### Create Child Task

```bash
POST /api/tasks
{
  "title": "Research phase",
  "description": "Gather requirements and research",
  "parent_task_id": "parent-task-uuid"
}
```

## 🛡️ Security Features

- **Rate Limiting**: Configurable rate limits for API endpoints
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Input Validation**: Request body validation
- **User Isolation**: Row-level security in database
- **JWT Verification**: Secure token validation

## 🚀 Deployment to Heroku

### 1. Install Heroku CLI

```bash
# macOS
brew install heroku/brew/heroku

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

### 2. Login to Heroku

```bash
heroku login
```

### 3. Create Heroku App

```bash
heroku create your-app-name
```

### 4. Set Environment Variables

```bash
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_ANON_KEY=your_supabase_anon_key
heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
heroku config:set NODE_ENV=production
```

### 5. Deploy

```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### 6. Open App

```bash
heroku open
```

## 🔧 Environment Variables

| Variable                    | Description                       | Required | Default             |
| --------------------------- | --------------------------------- | -------- | ------------------- |
| `SUPABASE_URL`              | Supabase project URL              | Yes      | -                   |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key            | Yes      | -                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key         | No       | -                   |
| `OPENAI_API_KEY`            | OpenAI API key for AI enhancement | Yes      | -                   |
| `PORT`                      | Server port                       | No       | 3000                |
| `NODE_ENV`                  | Environment                       | No       | development         |
| `JWT_SECRET`                | JWT secret                        | No       | auto-generated      |
| `RATE_LIMIT_WINDOW_MS`      | Rate limit window                 | No       | 900000 (15 min)     |
| `RATE_LIMIT_MAX_REQUESTS`   | Max requests per window           | No       | 100                 |
| `ALLOWED_ORIGINS`           | CORS allowed origins              | No       | localhost:3000,3001 |

## 💻 Development

### Scripts

```bash
npm start          # Start production server (built TypeScript)
npm run dev        # Start development server with nodemon and ts-node
npm run build      # Build TypeScript to JavaScript
npm test           # Run tests
```

### Project Structure

```
src/
├── types/           # TypeScript type definitions
│   └── index.ts     # All application types
├── config/          # Configuration files
│   └── supabase.ts  # Supabase client setup
├── middleware/      # Express middleware
│   ├── auth.ts      # Authentication middleware
│   └── security.ts  # Security middleware
├── routes/          # API route handlers
│   ├── auth.ts      # Authentication routes
│   └── tasks.ts     # Task management routes
└── server.ts        # Main server file

dist/                # Compiled JavaScript (generated)
```

## 🧪 Testing

```bash
npm test
```

## 📚 API Documentation

For complete API documentation, see `API_DOCUMENTATION.md` in the project root.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

- Create an issue in the repository
- Check the Supabase documentation
- Review the Express.js documentation

## 📋 Changelog

### v1.1.0

- Added AI enhancement features (enhance/split tasks)
- Added hierarchical task management (parent-child relationships)
- Enhanced database schema with parent_task_id support
- Added new API endpoints for child tasks and AI enhancement

### v1.0.0

- Initial release
- JWT authentication with Supabase
- Task management API
- Security middleware
- Heroku deployment ready

## 🔍 Troubleshooting

### Common Issues

1. **"Route not found" errors**: Check that Supabase environment variables are set correctly
2. **Database constraint violations**: Ensure your database schema matches the provided SQL
3. **Port conflicts**: The server automatically finds an available port in development
4. **Email confirmation required**: Users must confirm their email after registration before logging in

### Debug Mode

The server includes comprehensive logging. Check your terminal for:

- Supabase configuration status
- Route loading information
- Request/response details
- AI enhancement processing logs

---

## ⏱️ Timeout Handling & Real-Time Updates

### Timeout Configuration

- **Request Timeout**: 30 seconds for initial request
- **AI Processing Timeout**: 60 seconds for OpenAI API calls
- **SSE Connection Timeout**: 120 seconds for real-time updates

### Server-Sent Events (SSE)

For long-running AI operations, the backend provides real-time status updates:

```javascript
// Monitor AI enhancement status in real-time
const eventSource = new EventSource(`/api/tasks/${taskId}/enhance-ai/status`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Status update:", data);

  if (data.status === "completed") {
    eventSource.close();
    // Handle completion
  }
};

eventSource.onerror = () => {
  eventSource.close();
  // Handle connection errors
};
```

### Fallback Strategy

1. **Initial Request**: Try POST with 30s timeout
2. **On Timeout**: Switch to SSE monitoring
3. **Real-Time Updates**: Monitor progress until completion
4. **Auto-Reconnection**: Handle connection drops gracefully

### Error Handling

- **API Failures**: Graceful fallback to basic enhancement
- **Parsing Errors**: Uses raw AI response as fallback
- **Rate Limiting**: Respects OpenAI API limits
- **Validation**: Zod schemas ensure data integrity
- **Timeouts**: Automatic status updates and graceful degradation
