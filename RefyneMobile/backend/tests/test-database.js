const { supabase } = require('../services/database');

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection error:', error);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Check if conversations table exists
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('conversations')
      .select('count')
      .limit(1);
    
    if (conversationsError) {
      console.error('❌ Conversations table does not exist:', conversationsError.message);
      console.log('You need to create the conversations table in Supabase');
      return;
    }
    
    console.log('✅ Conversations table exists');
    
    // Check if messages table exists
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('count')
      .limit(1);
    
    if (messagesError) {
      console.error('❌ Messages table does not exist:', messagesError.message);
      console.log('You need to create the messages table in Supabase');
      return;
    }
    
    console.log('✅ Messages table exists');
    
    // Test creating a conversation
    const testConversationId = `test_conv_${Date.now()}`;
    const { data: testConv, error: testConvError } = await supabase
      .from('conversations')
      .insert({
        id: testConversationId,
        player_id: 'test_player',
        coach_id: 'test_coach',
        coach_name: 'Test Coach',
        sport: 'golf',
        session_id: 'test_session',
        status: 'active'
      })
      .select()
      .single();
    
    if (testConvError) {
      console.error('❌ Failed to create test conversation:', testConvError);
      return;
    }
    
    console.log('✅ Test conversation created successfully');
    
    // Clean up test data
    await supabase
      .from('conversations')
      .delete()
      .eq('id', testConversationId);
    
    console.log('✅ Test conversation cleaned up');
    console.log('🎉 Database is ready for DM creation!');
    
  } catch (error) {
    console.error('Database test failed:', error);
  }
}

testDatabase();
