-- Migration: 003_ai_enhancement_support.sql
-- Description: Add AI enhancement support and tracking fields
-- Date: 2024-01-01
-- Author: Task Manager Backend

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

-- Add comments for AI enhancement fields
COMMENT ON COLUMN tasks.ai_enhanced_title IS 'AI-enhanced version of the task title';
COMMENT ON COLUMN tasks.ai_enhanced_description IS 'AI-enhanced version of the task description';
COMMENT ON COLUMN tasks.ai_enhancement_notes IS 'Notes about the AI enhancement process';
COMMENT ON COLUMN tasks.ai_enhancement_status IS 'Current status of AI enhancement';
COMMENT ON COLUMN tasks.ai_enhancement_metadata IS 'Additional metadata from AI enhancement';

COMMENT ON TABLE ai_enhancement_queue IS 'Queue for processing AI enhancement requests';
COMMENT ON COLUMN ai_enhancement_queue.task_id IS 'Reference to the task being enhanced';
COMMENT ON COLUMN ai_enhancement_queue.enhancement_type IS 'Type of enhancement (enhance or split)';
COMMENT ON COLUMN ai_enhancement_queue.status IS 'Current processing status';
COMMENT ON COLUMN ai_enhancement_queue.n8n_webhook_url IS 'N8N webhook URL for processing';
COMMENT ON COLUMN ai_enhancement_queue.retry_count IS 'Number of retry attempts';
COMMENT ON COLUMN ai_enhancement_queue.error_message IS 'Error message if processing failed';
