// Script to add video_uri column to messages table
// Run this with: node run-video-uri-migration.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jgtbqtpixskznnejzizm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey || supabaseServiceKey.includes('YourServiceKeyHere')) {
  console.error('❌ SUPABASE_SERVICE_KEY is not properly configured in .env file');
  console.log('📝 Please add your Supabase service key to the .env file');
  console.log('📝 You can find it in your Supabase dashboard under Settings > API');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🔄 Starting video_uri column migration...');
    
    // Test if we can query the messages table
    console.log('🔍 Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot connect to messages table:', testError.message);
      throw testError;
    }
    
    console.log('✅ Database connection successful');
    
    // Try to insert a test message with video_uri to see if the column exists
    console.log('🔍 Checking if video_uri column exists...');
    const testMessageId = 'test_video_uri_check_' + Date.now();
    
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        id: testMessageId,
        conversation_id: 'test_conv',
        sender_id: 'test_sender',
        sender_type: 'system',
        content: 'Test message',
        message_type: 'text',
        video_uri: null
      });
    
    if (insertError) {
      if (insertError.message.includes('video_uri')) {
        console.log('❌ video_uri column does not exist - this is the problem!');
        console.log('📝 You need to run the SQL migration manually in your Supabase dashboard');
        console.log('📝 Run this SQL command:');
        console.log('   ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_uri TEXT;');
        console.log('   CREATE INDEX IF NOT EXISTS idx_messages_video_uri ON messages(video_uri) WHERE video_uri IS NOT NULL;');
        return;
      } else {
        console.error('❌ Unexpected error:', insertError.message);
        throw insertError;
      }
    } else {
      console.log('✅ video_uri column exists!');
      
      // Clean up the test message
      await supabase
        .from('messages')
        .delete()
        .eq('id', testMessageId);
      
      console.log('🎉 Migration check completed - video_uri column is already present');
    }
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
    console.log('📝 Please run the SQL migration manually in your Supabase dashboard:');
    console.log('   ALTER TABLE messages ADD COLUMN IF NOT EXISTS video_uri TEXT;');
    console.log('   CREATE INDEX IF NOT EXISTS idx_messages_video_uri ON messages(video_uri) WHERE video_uri IS NOT NULL;');
  }
}

// Run the migration
runMigration();
