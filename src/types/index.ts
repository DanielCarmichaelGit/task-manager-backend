import { User } from "@supabase/supabase-js";

// User types
export interface UserProfile {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

// Task types
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  user_id: string;
  parent_task_id?: string; // New: allows tasks to have parent tasks
  created_at: string;
  updated_at: string;
}

export type TaskStatus =
  | "not_started"
  | "planning"
  | "in_progress"
  | "review"
  | "testing"
  | "completed"
  | "on_hold"
  | "cancelled"
  | "deferred"
  | "blocked";
export type TaskPriority = "low" | "medium" | "high";

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  parent_task_id?: string; // New: optional parent task ID
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  parent_task_id?: string; // New: can update parent task
}

// New: Interface for tasks with children
export interface TaskWithChildren extends Task {
  children?: Task[];
  child_count?: number;
}

// New: Interface for getting child tasks
export interface GetChildTasksRequest {
  parent_task_id: string;
}

export interface UpdateTaskStatusRequest {
  status: TaskStatus;
}

// Auth types
export interface RegisterRequest {
  email: string;
  password: string;
  user_metadata?: Record<string, any>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface UpdateProfileRequest {
  user_metadata: Record<string, any>;
}

// API Response types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  error?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  session: any;
}

export interface TasksResponse {
  tasks: Task[];
}

export interface TaskResponse {
  task: Task;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
}

// Express types
export interface AuthenticatedRequest extends Request {
  user: User;
  token: string;
}

// Supabase types
export interface SupabaseConfig {
  supabase: any;
  supabaseAdmin: any;
}

// New interfaces for AI enhancement
export interface AIEnhancementRequest {
  enhancement_type: "enhance" | "split";
  task_id: string;
}

export interface AIEnhancedTask {
  id: string;
  title: string;
  description?: string;
  enhanced_title?: string;
  enhanced_description?: string;
  ai_enhancement_notes?: string;
}

export interface AISplitTask {
  parent_task_id: string;
  subtasks: Array<{
    title: string;
    description?: string;
    estimated_effort?: string;
    priority?: TaskPriority;
  }>;
  split_reasoning?: string;
}

export interface AIEnhancementResponse {
  success: boolean;
  message: string;
  data?: AIEnhancedTask | AISplitTask;
  error?: string;
}
