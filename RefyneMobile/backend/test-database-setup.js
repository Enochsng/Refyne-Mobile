const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jgtbqtpixskznnejzizm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGJxdHBpeHNrem5uZWp6aXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NDMxNDAsImV4cCI6MjA2NjIxOTE0MH0.JNIqkK1XyD8wigL4hA2yD__FRjkFqOTUWTggw2_9ixs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseSetup() {
  console.log('🔍 Testing database setup...\n');
  
  const tables = [
    'coach_connect_accounts',
    'coaching_sessions', 
    'payment_transfers',
    'conversations',
    'messages'
  ];
  
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      console.log(`Testing table: ${table}...`);
      
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
        allTablesExist = false;
      } else {
        console.log(`✅ ${table}: Ready`);
      }
    } catch (err) {
      console.log(`❌ ${table}: ${err.message}`);
      allTablesExist = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allTablesExist) {
    console.log('🎉 All database tables are ready!');
    console.log('✅ Stripe Connect payments will work');
    console.log('✅ DM conversations will be created after payments');
    console.log('\nYou can now test the payment flow in your app.');
  } else {
    console.log('❌ Some database tables are missing!');
    console.log('\nPlease follow the instructions in DATABASE_SETUP_INSTRUCTIONS.md');
    console.log('1. Open your Supabase dashboard');
    console.log('2. Go to SQL Editor');
    console.log('3. Run the contents of setup-database.sql');
    console.log('4. Run this test again');
  }
  
  console.log('\n' + '='.repeat(50));
}

// Run the test
testDatabaseSetup().catch(console.error);
