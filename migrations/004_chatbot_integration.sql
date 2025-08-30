-- Migration: 004_chatbot_integration.sql
-- Description: Add chatbot integration and WhatsApp message processing support
-- Date: 2024-01-01
-- Author: Task Manager Backend

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

-- Add comments for chatbot integration
COMMENT ON TABLE chatbot_interactions IS 'Stores chatbot interaction history and responses';
COMMENT ON COLUMN chatbot_interactions.session_id IS 'Unique session identifier for the conversation';
COMMENT ON COLUMN chatbot_interactions.message_type IS 'Type of message (whatsapp, web, api)';
COMMENT ON COLUMN chatbot_interactions.platform IS 'Platform where the interaction occurred';
COMMENT ON COLUMN chatbot_interactions.message_content IS 'Content of the user message';
COMMENT ON COLUMN chatbot_interactions.bot_response IS 'Response from the chatbot';
COMMENT ON COLUMN chatbot_interactions.task_created_id IS 'Reference to task created from this interaction';

COMMENT ON TABLE whatsapp_integrations IS 'Stores WhatsApp integration configuration for users';
COMMENT ON COLUMN whatsapp_integrations.phone_number IS 'WhatsApp phone number for the integration';
COMMENT ON COLUMN whatsapp_integrations.evolution_api_url IS 'Evolution API endpoint URL';
COMMENT ON COLUMN whatsapp_integrations.evolution_api_key IS 'Evolution API authentication key';
COMMENT ON COLUMN whatsapp_integrations.webhook_url IS 'Webhook URL for receiving messages';
COMMENT ON COLUMN whatsapp_integrations.is_active IS 'Whether the integration is currently active';
