# Task Manager Backend

A robust Node.js/Express backend with Supabase integration, featuring JWT authentication middleware and comprehensive security measures. Designed for deployment on Heroku.

## Features

- 🔐 **JWT Authentication** with Supabase
- 🛡️ **Security Middleware** including rate limiting, CORS, and Helmet
- 📝 **Task Management API** with full CRUD operations
- 🚀 **Heroku Ready** with Procfile and app.json
- 📊 **Health Monitoring** endpoints
- 🔒 **User Isolation** - users can only access their own data
- ⚡ **Performance** with compression and optimized queries

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT
- **Security**: Helmet, CORS, Rate Limiting
- **Deployment**: Heroku

## Prerequisites

- Node.js 18+ installed
- Supabase account and project
- Heroku account (for deployment)

## Quick Start

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

Create the following table in your Supabase project:

```sql
-- Create tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only see their own tasks
CREATE POLICY "Users can only access their own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

### 4. Run Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

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

| Method | Endpoint                | Description        | Auth Required |
| ------ | ----------------------- | ------------------ | ------------- |
| GET    | `/api/tasks`            | Get all user tasks | Yes           |
| GET    | `/api/tasks/:id`        | Get specific task  | Yes           |
| POST   | `/api/tasks`            | Create new task    | Yes           |
| PUT    | `/api/tasks/:id`        | Update task        | Yes           |
| DELETE | `/api/tasks/:id`        | Delete task        | Yes           |
| PATCH  | `/api/tasks/:id/status` | Update task status | Yes           |

### System

| Method | Endpoint  | Description     | Auth Required |
| ------ | --------- | --------------- | ------------- |
| GET    | `/health` | Health check    | No            |
| GET    | `/`       | API information | No            |

## Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Request/Response Examples

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
  "due_date": "2024-01-15T23:59:59Z"
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
    "created_at": "2024-01-01T10:00:00Z",
    "updated_at": "2024-01-01T10:00:00Z"
  }
}
```

## Security Features

- **Rate Limiting**: Configurable rate limits for API endpoints
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Input Validation**: Request body validation
- **User Isolation**: Row-level security in database
- **JWT Verification**: Secure token validation

## Deployment to Heroku

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

## Environment Variables

| Variable                    | Description               | Required | Default             |
| --------------------------- | ------------------------- | -------- | ------------------- |
| `SUPABASE_URL`              | Supabase project URL      | Yes      | -                   |
| `SUPABASE_ANON_KEY`         | Supabase anonymous key    | Yes      | -                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | No       | -                   |
| `PORT`                      | Server port               | No       | 3000                |
| `NODE_ENV`                  | Environment               | No       | development         |
| `JWT_SECRET`                | JWT secret                | No       | auto-generated      |
| `RATE_LIMIT_WINDOW_MS`      | Rate limit window         | No       | 900000 (15 min)     |
| `RATE_LIMIT_MAX_REQUESTS`   | Max requests per window   | No       | 100                 |
| `ALLOWED_ORIGINS`           | CORS allowed origins      | No       | localhost:3000,3001 |

## Development

### Scripts

```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run tests
```

### Project Structure

```
src/
├── config/          # Configuration files
│   └── supabase.js  # Supabase client setup
├── middleware/      # Express middleware
│   ├── auth.js      # Authentication middleware
│   └── security.js  # Security middleware
├── routes/          # API route handlers
│   ├── auth.js      # Authentication routes
│   └── tasks.js     # Task management routes
└── server.js        # Main server file
```

## Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:

- Create an issue in the repository
- Check the Supabase documentation
- Review the Express.js documentation

## Changelog

### v1.0.0

- Initial release
- JWT authentication with Supabase
- Task management API
- Security middleware
- Heroku deployment ready
