-- Migration: 002_hierarchical_tasks.sql
-- Description: Add parent-child task relationships for hierarchical task management
-- Date: 2024-01-01
-- Author: Task Manager Backend

-- Add parent_task_id column to existing tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

-- Add index for better performance when querying child tasks
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Add constraint to prevent circular references (a task cannot be its own parent)
ALTER TABLE tasks 
ADD CONSTRAINT IF NOT EXISTS check_no_self_reference 
CHECK (parent_task_id != id);

-- Add constraint to prevent deep nesting (max 3 levels)
CREATE OR REPLACE FUNCTION check_task_depth() RETURNS TRIGGER AS $$
DECLARE
    depth INTEGER := 0;
    current_parent_id UUID := NEW.parent_task_id;
BEGIN
    -- Count the depth of parent tasks
    WHILE current_parent_id IS NOT NULL AND depth < 3 LOOP
        SELECT parent_task_id INTO current_parent_id 
        FROM tasks 
        WHERE id = current_parent_id;
        depth := depth + 1;
    END LOOP;
    
    -- If depth is 3 or more, prevent the insert/update
    IF depth >= 3 THEN
        RAISE EXCEPTION 'Task nesting depth cannot exceed 3 levels';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce depth limit
DROP TRIGGER IF EXISTS enforce_task_depth ON tasks;
CREATE TRIGGER enforce_task_depth
    BEFORE INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION check_task_depth();

-- Add comment to document the new column
COMMENT ON COLUMN tasks.parent_task_id IS 'References the parent task ID. Allows for hierarchical task organization.';

-- Update RLS policies to handle parent-child relationships
-- Users can view child tasks if they own the parent task
CREATE POLICY "Users can view child tasks of their own tasks" ON tasks
  FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM tasks parent 
      WHERE parent.id = tasks.parent_task_id 
      AND parent.user_id = auth.uid()
    )
  );

-- Users can create child tasks under their own tasks
CREATE POLICY "Users can create child tasks under their own tasks" ON tasks
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      parent_task_id IS NULL OR 
      EXISTS (
        SELECT 1 FROM tasks parent 
        WHERE parent.id = parent_task_id 
        AND parent.user_id = auth.uid()
      )
    )
  );

-- Users can update child tasks if they own the parent
CREATE POLICY "Users can update child tasks of their own tasks" ON tasks
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM tasks parent 
      WHERE parent.id = tasks.parent_task_id 
      AND parent.user_id = auth.uid()
    )
  );

-- Users can delete child tasks if they own the parent
CREATE POLICY "Users can delete child tasks of their own tasks" ON tasks
  FOR DELETE USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM tasks parent 
      WHERE parent.id = tasks.parent_task_id 
      AND parent.user_id = auth.uid()
    )
  );
