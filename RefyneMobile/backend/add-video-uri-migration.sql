-- Migration to add video_uri column to messages table
-- Run this script in your Supabase SQL Editor

-- Add the missing video_uri column to the messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS video_uri TEXT;

-- Add a comment to document the column
COMMENT ON COLUMN messages.video_uri IS 'URI/path to video file for video messages';

-- Create an index on video_uri for better performance when filtering video messages
CREATE INDEX IF NOT EXISTS idx_messages_video_uri ON messages(video_uri) WHERE video_uri IS NOT NULL;

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
  AND column_name = 'video_uri';

-- Show the updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;

-- Success message
SELECT 'video_uri column added to messages table successfully!' as status;
