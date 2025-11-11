-- Setup script for conversations and messages tables
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist (in reverse order to handle dependencies)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Create conversations table
CREATE TABLE conversations (
  id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
  player_name VARCHAR(255) NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  coach_name VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  session_id VARCHAR(255),
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  player_unread_count INTEGER DEFAULT 0,
  coach_unread_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, coach_id, session_id)
);

-- Create messages table
CREATE TABLE messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('player', 'coach', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  video_uri TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_player_id ON conversations(player_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Disable RLS for now (we'll enable it later with proper policies)
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions to the service role
GRANT ALL ON conversations TO service_role;
GRANT ALL ON messages TO service_role;

-- Grant permissions to authenticated users
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;

-- Grant permissions to anon users (for development)
GRANT ALL ON conversations TO anon;
GRANT ALL ON messages TO anon;
