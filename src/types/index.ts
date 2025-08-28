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
  user_id: string;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high";

export interface CreateTaskRequest {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
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
