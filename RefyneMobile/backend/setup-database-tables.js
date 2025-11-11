const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jgtbqtpixskznnejzizm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGJxdHBpeHNrem5uZWp6aXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NDMxNDAsImV4cCI6MjA2NjIxOTE0MH0.JNIqkK1XyD8wigL4hA2yD__FRjkFqOTUWTggw2_9ixs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupDatabaseTables() {
  try {
    console.log('Setting up database tables...');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'setup-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.includes('SELECT'));
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        console.log(`SQL: ${statement.substring(0, 100)}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
          
          if (error) {
            console.error(`Error executing statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`Exception executing statement ${i + 1}:`, err.message);
          // Continue with other statements
        }
      }
    }
    
    console.log('🎉 Database setup completed!');
    
    // Test the tables by trying to query them
    console.log('\nTesting database tables...');
    
    const tables = ['coach_connect_accounts', 'coaching_sessions', 'payment_transfers', 'conversations', 'messages'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Ready`);
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabaseTables();