-- Migration script to add player_name column to existing conversations table
-- Run this in your Supabase SQL Editor

-- Add the player_name column to the conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS player_name VARCHAR(255);

-- Update existing records with a default player name
-- This will set all existing conversations to have 'Player' as the default name
UPDATE conversations 
SET player_name = 'Player' 
WHERE player_name IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE conversations 
ALTER COLUMN player_name SET NOT NULL;

-- Add an index for better performance when querying by player_name
CREATE INDEX IF NOT EXISTS idx_conversations_player_name ON conversations(player_name);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'conversations' 
AND column_name = 'player_name';
