-- Database Setup Script for Refyne Mobile
-- Run this script in your Supabase SQL Editor

-- Create coach_connect_accounts table
CREATE TABLE IF NOT EXISTS coach_connect_accounts (
  id SERIAL PRIMARY KEY,
  coach_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
  account_type VARCHAR(50) DEFAULT 'express',
  country VARCHAR(2) NOT NULL,
  email VARCHAR(255) NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  business_profile JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create coaching_sessions table
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id VARCHAR(255) PRIMARY KEY,
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  coach_name VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  package_type VARCHAR(50) NOT NULL,
  package_id INTEGER,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'cad',
  clips_remaining INTEGER NOT NULL,
  clips_uploaded INTEGER DEFAULT 0,
  session_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payment_transfers table
CREATE TABLE IF NOT EXISTS payment_transfers (
  id SERIAL PRIMARY KEY,
  transfer_id VARCHAR(255) UNIQUE NOT NULL,
  payment_intent_id VARCHAR(255) NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  coach_account_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'cad',
  platform_fee INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
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
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  sender_id VARCHAR(255) NOT NULL,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('player', 'coach', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  video_uri TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint after both tables are created
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_conversation_id 
FOREIGN KEY (conversation_id) 
REFERENCES conversations(id) 
ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coach_connect_accounts_coach_id ON coach_connect_accounts(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_connect_accounts_stripe_account_id ON coach_connect_accounts(stripe_account_id);

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_coach_id ON coaching_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_payment_intent_id ON coaching_sessions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_status ON coaching_sessions(status);

CREATE INDEX IF NOT EXISTS idx_payment_transfers_coach_id ON payment_transfers(coach_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_payment_intent_id ON payment_transfers(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_status ON payment_transfers(status);

CREATE INDEX IF NOT EXISTS idx_conversations_player_id ON conversations(player_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_video_uri ON messages(video_uri) WHERE video_uri IS NOT NULL;

-- Success message
SELECT 'Database tables created successfully!' as status;