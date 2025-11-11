const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jgtbqtpixskznnejzizm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGJxdHBpeHNrem5uZWp6aXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NDMxNDAsImV4cCI6MjA2NjIxOTE0MH0.JNIqkK1XyD8wigL4hA2yD__FRjkFqOTUWTggw2_9ixs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupConversationsTables() {
  try {
    console.log('Setting up conversations and messages tables...');

    // Test connection
    const { data, error } = await supabase
      .from('conversations')
      .select('count')
      .limit(1);

    if (error && error.code === 'PGRST116') {
      console.log('Tables do not exist, creating them...');
      
      // Since we can't create tables via the client, we'll just test if we can insert
      console.log('Please run the SQL script in your Supabase dashboard first.');
      console.log('SQL script location: setup-conversations-database.sql');
      return;
    }

    if (error) {
      console.error('Error testing connection:', error);
      return;
    }

    console.log('Tables exist, testing insert...');

    // Test insert
    const testConversation = {
      id: 'test_conv_' + Date.now(),
      player_id: 'test_player',
      coach_id: 'test_coach',
      coach_name: 'Test Coach',
      sport: 'golf',
      session_id: 'test_session',
      last_message: null,
      last_message_at: null,
      player_unread_count: 0,
      coach_unread_count: 0,
      status: 'active'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('conversations')
      .insert(testConversation)
      .select();

    if (insertError) {
      console.error('Insert test failed:', insertError);
      console.log('This suggests RLS policies are blocking the insert.');
      console.log('Please run the SQL script to disable RLS or set up proper policies.');
    } else {
      console.log('Insert test successful!');
      
      // Clean up test data
      await supabase
        .from('conversations')
        .delete()
        .eq('id', testConversation.id);
      
      console.log('Test data cleaned up.');
    }

  } catch (err) {
    console.error('Setup failed:', err);
  }
}

// Run the setup
setupConversationsTables().then(() => {
  console.log('Setup completed.');
  process.exit(0);
}).catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
