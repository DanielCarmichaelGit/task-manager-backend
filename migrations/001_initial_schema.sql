-- Migration: 001_initial_schema.sql
-- Description: Initial database schema for task management system
-- Date: 2024-01-01
-- Author: Task Manager Backend

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

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

-- Add comments for documentation
COMMENT ON TABLE tasks IS 'Main tasks table for user task management';
COMMENT ON COLUMN tasks.id IS 'Unique identifier for the task';
COMMENT ON COLUMN tasks.title IS 'Task title/name';
COMMENT ON COLUMN tasks.description IS 'Detailed task description';
COMMENT ON COLUMN tasks.status IS 'Current status of the task';
COMMENT ON COLUMN tasks.priority IS 'Priority level of the task';
COMMENT ON COLUMN tasks.due_date IS 'When the task is due';
COMMENT ON COLUMN tasks.estimated_hours IS 'Estimated time to complete in hours';
COMMENT ON COLUMN tasks.actual_hours IS 'Actual time spent in hours';
COMMENT ON COLUMN tasks.progress_percentage IS 'Completion percentage (0-100)';
COMMENT ON COLUMN tasks.tags IS 'Array of tags for categorizing tasks';
COMMENT ON COLUMN tasks.assignee_id IS 'User assigned to the task (optional)';
COMMENT ON COLUMN tasks.user_id IS 'Owner of the task';
COMMENT ON COLUMN tasks.created_at IS 'When the task was created';
COMMENT ON COLUMN tasks.updated_at IS 'When the task was last updated';
