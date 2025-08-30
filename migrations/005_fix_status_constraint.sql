-- Migration: 005_fix_status_constraint.sql
-- Description: Fix status constraint to match TypeScript types
-- Date: 2024-08-28
-- Author: Task Manager Backend

-- Drop the existing status check constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Add the correct status check constraint that matches TypeScript types
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('not_started', 'planning', 'in_progress', 'review', 'testing', 'completed', 'on_hold', 'cancelled', 'deferred', 'blocked'));

-- Update any existing tasks with invalid status values to 'not_started'
UPDATE tasks SET status = 'not_started' WHERE status NOT IN ('not_started', 'planning', 'in_progress', 'review', 'testing', 'completed', 'on_hold', 'cancelled', 'deferred', 'blocked');
