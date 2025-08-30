-- Master Migration: 000_master_migration.sql
-- Description: Complete database setup for Task Manager Backend
-- This file combines all migrations (001-004) for easy setup
-- Date: 2024-01-01
-- Author: Task Manager Backend

-- =====================================================
-- MIGRATION 001: Initial Schema
-- =====================================================

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

-- =====================================================
-- MIGRATION 002: Hierarchical Tasks
-- =====================================================

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

-- =====================================================
-- MIGRATION 003: AI Enhancement Support
-- =====================================================

-- Add AI enhancement fields to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS ai_enhanced_title TEXT,
ADD COLUMN IF NOT EXISTS ai_enhanced_description TEXT,
ADD COLUMN IF NOT EXISTS ai_enhancement_notes TEXT,
ADD COLUMN IF NOT EXISTS ai_enhancement_status TEXT DEFAULT 'not_enhanced' CHECK (ai_enhancement_status IN ('not_enhanced', 'enhanced', 'enhancement_failed')),
ADD COLUMN IF NOT EXISTS ai_enhancement_metadata JSONB;

-- Add index for AI enhancement status queries
CREATE INDEX IF NOT EXISTS idx_tasks_ai_enhancement_status ON tasks(ai_enhancement_status);

-- Create AI enhancement queue table for processing
CREATE TABLE IF NOT EXISTS ai_enhancement_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enhancement_type TEXT NOT NULL CHECK (enhancement_type IN ('enhance', 'split')),
  status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  n8n_webhook_url TEXT,
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for AI enhancement queue
CREATE INDEX IF NOT EXISTS idx_ai_enhancement_queue_task_id ON ai_enhancement_queue(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_enhancement_queue_user_id ON ai_enhancement_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_enhancement_queue_status ON ai_enhancement_queue(status);
CREATE INDEX IF NOT EXISTS idx_ai_enhancement_queue_created_at ON ai_enhancement_queue(created_at);

-- Enable RLS on AI enhancement queue
ALTER TABLE ai_enhancement_queue ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for AI enhancement queue
CREATE POLICY "Users can view their own AI enhancement queue items" ON ai_enhancement_queue
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI enhancement queue items" ON ai_enhancement_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI enhancement queue items" ON ai_enhancement_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI enhancement queue items" ON ai_enhancement_queue
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at for AI enhancement queue
CREATE TRIGGER update_ai_enhancement_queue_updated_at 
    BEFORE UPDATE ON ai_enhancement_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION 004: Chatbot Integration
-- =====================================================

-- Create chatbot interactions table
CREATE TABLE IF NOT EXISTS chatbot_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('whatsapp', 'web', 'api')),
  platform TEXT NOT NULL,
  message_content TEXT NOT NULL,
  bot_response TEXT,
  task_created_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chatbot interactions
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_user_id ON chatbot_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_session_id ON chatbot_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_message_type ON chatbot_interactions(message_type);
CREATE INDEX IF NOT EXISTS idx_chatbot_interactions_created_at ON chatbot_interactions(created_at);

-- Enable RLS on chatbot interactions
ALTER TABLE chatbot_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chatbot interactions
CREATE POLICY "Users can view their own chatbot interactions" ON chatbot_interactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chatbot interactions" ON chatbot_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chatbot interactions" ON chatbot_interactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chatbot interactions" ON chatbot_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- Create WhatsApp integrations table
CREATE TABLE IF NOT EXISTS whatsapp_integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  evolution_api_url TEXT NOT NULL,
  evolution_api_key TEXT NOT NULL,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for WhatsApp integrations
CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_user_id ON whatsapp_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_phone_number ON whatsapp_integrations(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_integrations_is_active ON whatsapp_integrations(is_active);

-- Enable RLS on WhatsApp integrations
ALTER TABLE whatsapp_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for WhatsApp integrations
CREATE POLICY "Users can view their own WhatsApp integrations" ON whatsapp_integrations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own WhatsApp integrations" ON whatsapp_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own WhatsApp integrations" ON whatsapp_integrations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own WhatsApp integrations" ON whatsapp_integrations
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at for chatbot interactions
CREATE TRIGGER update_chatbot_interactions_updated_at 
    BEFORE UPDATE ON chatbot_interactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to update updated_at for WhatsApp integrations
CREATE TRIGGER update_whatsapp_integrations_updated_at 
    BEFORE UPDATE ON whatsapp_integrations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FINAL SETUP AND COMMENTS
-- =====================================================

-- Add comprehensive comments for documentation
COMMENT ON TABLE tasks IS 'Main tasks table for user task management with hierarchical support';
COMMENT ON COLUMN tasks.parent_task_id IS 'References the parent task ID. Allows for hierarchical task organization.';
COMMENT ON COLUMN tasks.ai_enhanced_title IS 'AI-enhanced version of the task title';
COMMENT ON COLUMN tasks.ai_enhanced_description IS 'AI-enhanced version of the task description';
COMMENT ON COLUMN tasks.ai_enhancement_notes IS 'Notes about the AI enhancement process';
COMMENT ON COLUMN tasks.ai_enhancement_status IS 'Current status of AI enhancement';
COMMENT ON COLUMN tasks.ai_enhancement_metadata IS 'Additional metadata from AI enhancement';

COMMENT ON TABLE ai_enhancement_queue IS 'Queue for processing AI enhancement requests';
COMMENT ON TABLE chatbot_interactions IS 'Stores chatbot interaction history and responses';
COMMENT ON TABLE whatsapp_integrations IS 'Stores WhatsApp integration configuration for users';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database setup completed successfully! All tables, indexes, and policies have been created.';
    RAISE NOTICE 'Tables created: tasks, ai_enhancement_queue, chatbot_interactions, whatsapp_integrations';
    RAISE NOTICE 'RLS policies enabled for all tables';
    RAISE NOTICE 'Indexes created for optimal performance';
END $$;
