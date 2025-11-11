# Database Setup Guide

This guide will help you set up the required database tables in Supabase for the Stripe Connect coach flow.

## Prerequisites

1. Supabase project created
2. Database URL and service key available
3. Backend environment variables configured

## Required Tables

Run these SQL commands in your Supabase SQL Editor to create the necessary tables:

### 1. Coach Connect Accounts Table

```sql
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coach_connect_accounts_coach_id ON coach_connect_accounts(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_connect_accounts_stripe_account_id ON coach_connect_accounts(stripe_account_id);
```

### 2. Coaching Sessions Table

```sql
CREATE TABLE IF NOT EXISTS coaching_sessions (
  id VARCHAR(255) PRIMARY KEY,
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  coach_name VARCHAR(255) NOT NULL,
  sport VARCHAR(50) NOT NULL,
  package_type VARCHAR(50) NOT NULL,
  package_id INTEGER,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  clips_remaining INTEGER NOT NULL,
  clips_uploaded INTEGER DEFAULT 0,
  session_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_coach_id ON coaching_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_payment_intent_id ON coaching_sessions(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_status ON coaching_sessions(status);
```

### 3. Payment Transfers Table

```sql
CREATE TABLE IF NOT EXISTS payment_transfers (
  id SERIAL PRIMARY KEY,
  transfer_id VARCHAR(255) UNIQUE NOT NULL,
  payment_intent_id VARCHAR(255) NOT NULL,
  coach_id VARCHAR(255) NOT NULL,
  coach_account_id VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  platform_fee INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payment_transfers_coach_id ON payment_transfers(coach_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_transfer_id ON payment_transfers(transfer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_payment_intent_id ON payment_transfers(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_transfers_status ON payment_transfers(status);
```

### 4. Conversations Table

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id VARCHAR(255) PRIMARY KEY,
  player_id VARCHAR(255) NOT NULL,
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_player_id ON conversations(player_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coach_id ON conversations(coach_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at);
```

### 5. Messages Table

```sql
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR(255) NOT NULL,
  sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('player', 'coach', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
```

## Environment Variables

Add these to your backend `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# App Configuration
APP_URL=http://localhost:3001
```

## Row Level Security (RLS)

For production, you should enable Row Level Security on these tables:

### Coach Connect Accounts RLS

```sql
-- Enable RLS
ALTER TABLE coach_connect_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can only see their own account
CREATE POLICY "Coaches can view own account" ON coach_connect_accounts
  FOR SELECT USING (coach_id = auth.uid()::text);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON coach_connect_accounts
  FOR ALL USING (auth.role() = 'service_role');
```

### Coaching Sessions RLS

```sql
-- Enable RLS
ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can see sessions for their coach_id
CREATE POLICY "Coaches can view own sessions" ON coaching_sessions
  FOR SELECT USING (coach_id = auth.uid()::text);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON coaching_sessions
  FOR ALL USING (auth.role() = 'service_role');
```

### Payment Transfers RLS

```sql
-- Enable RLS
ALTER TABLE payment_transfers ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches can see their own transfers
CREATE POLICY "Coaches can view own transfers" ON payment_transfers
  FOR SELECT USING (coach_id = auth.uid()::text);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON payment_transfers
  FOR ALL USING (auth.role() = 'service_role');
```

### Conversations RLS

```sql
-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Players can see conversations where they are the player
CREATE POLICY "Players can view own conversations" ON conversations
  FOR SELECT USING (player_id = auth.uid()::text);

-- Policy: Coaches can see conversations where they are the coach
CREATE POLICY "Coaches can view own conversations" ON conversations
  FOR SELECT USING (coach_id = auth.uid()::text);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON conversations
  FOR ALL USING (auth.role() = 'service_role');
```

### Messages RLS

```sql
-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations" ON messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations 
      WHERE player_id = auth.uid()::text OR coach_id = auth.uid()::text
    )
  );

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON messages
  FOR ALL USING (auth.role() = 'service_role');
```

## Testing the Setup

After creating the tables, you can test the setup by:

1. Starting your backend server
2. Making a request to create a coach Connect account
3. Checking the database to see if the account was saved

### Test API Endpoints

```bash
# Test coach account creation
curl -X POST http://localhost:3001/api/connect/start-onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "coachId": "test-coach-123",
    "coachName": "Test Coach",
    "email": "test@example.com",
    "sport": "badminton",
    "country": "CA",
    "businessType": "individual"
  }'

# Test getting coach status
curl http://localhost:3001/api/connect/coach/test-coach-123/status
```

## Database Functions (Optional)

You can create some useful database functions:

### Function to get coach earnings summary

```sql
CREATE OR REPLACE FUNCTION get_coach_earnings_summary(coach_id_param TEXT)
RETURNS TABLE (
  total_earnings BIGINT,
  total_sessions INTEGER,
  pending_amount BIGINT,
  completed_transfers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(pt.amount), 0) as total_earnings,
    COUNT(DISTINCT cs.id) as total_sessions,
    COALESCE(SUM(CASE WHEN pt.status = 'pending' THEN pt.amount ELSE 0 END), 0) as pending_amount,
    COUNT(CASE WHEN pt.status = 'completed' THEN 1 END) as completed_transfers
  FROM payment_transfers pt
  LEFT JOIN coaching_sessions cs ON pt.coach_id = cs.coach_id
  WHERE pt.coach_id = coach_id_param;
END;
$$ LANGUAGE plpgsql;
```

## Monitoring and Maintenance

### Useful Queries

```sql
-- Check coach account statuses
SELECT 
  coach_id,
  stripe_account_id,
  charges_enabled,
  payouts_enabled,
  onboarding_completed,
  created_at
FROM coach_connect_accounts
ORDER BY created_at DESC;

-- Check recent coaching sessions
SELECT 
  id,
  coach_name,
  sport,
  amount,
  status,
  created_at
FROM coaching_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Check transfer statuses
SELECT 
  transfer_id,
  coach_id,
  amount,
  status,
  created_at
FROM payment_transfers
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Common Issues

1. **Permission Denied**: Make sure you're using the service role key for backend operations
2. **Table Not Found**: Ensure you've run the CREATE TABLE statements
3. **RLS Issues**: Check that your RLS policies are correctly configured
4. **Connection Issues**: Verify your Supabase URL and keys are correct

### Debug Mode

Enable debug logging in your backend by setting:

```env
NODE_ENV=development
DEBUG=supabase:*
```

This will help you see what's happening with database operations.
