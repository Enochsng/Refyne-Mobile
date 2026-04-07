#!/usr/bin/env node

/**
 * Manually insert Arthur's data using a workaround for RLS
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://jgtbqtpixskznnejzizm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGJxdHBpeHNrem5uZWp6aXptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY0MzE0MCwiZXhwIjoyMDY2MjE5MTQwfQ.YourServiceKeyHere';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Arthur's data (using the Stripe account ID from the previous attempt)
const ARTHUR_DATA = {
  coach_id: 'testcoach2-canadian',
  stripe_account_id: 'acct_1SGR6LBgZHtIf0z1', // From the previous Stripe account creation
  account_type: 'express',
  country: 'CA',
  email: 'testcoach2@gmail.com',
  charges_enabled: false,
  payouts_enabled: false,
  details_submitted: false,
  onboarding_completed: false,
  business_profile: {
    name: 'Arthur - badminton Coach',
    product_description: 'Professional badminton coaching services',
    support_email: 'testcoach2@gmail.com'
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

async function insertArthurManual() {
  console.log('🏸 Manually inserting Arthur\'s data...\n');
  
  try {
    // Method 1: Try using the service role client with auth bypass
    console.log('1. Attempting direct insert with service role...');
    
    const { data, error } = await supabase
      .from('coach_connect_accounts')
      .insert(ARTHUR_DATA)
      .select()
      .single();

    if (error) {
      console.log('❌ Direct insert failed:', error.message);
      
      // Method 2: Try using SQL function
      console.log('\n2. Attempting SQL function approach...');
      
      const sqlQuery = `
        INSERT INTO coach_connect_accounts (
          coach_id, 
          stripe_account_id, 
          account_type, 
          country, 
          email, 
          charges_enabled, 
          payouts_enabled, 
          details_submitted, 
          onboarding_completed, 
          business_profile, 
          created_at, 
          updated_at
        ) VALUES (
          '${ARTHUR_DATA.coach_id}',
          '${ARTHUR_DATA.stripe_account_id}',
          '${ARTHUR_DATA.account_type}',
          '${ARTHUR_DATA.country}',
          '${ARTHUR_DATA.email}',
          ${ARTHUR_DATA.charges_enabled},
          ${ARTHUR_DATA.payouts_enabled},
          ${ARTHUR_DATA.details_submitted},
          ${ARTHUR_DATA.onboarding_completed},
          '${JSON.stringify(ARTHUR_DATA.business_profile)}',
          '${ARTHUR_DATA.created_at}',
          '${ARTHUR_DATA.updated_at}'
        ) RETURNING *;
      `;

      const { data: sqlData, error: sqlError } = await supabase.rpc('exec_sql', {
        sql: sqlQuery
      });

      if (sqlError) {
        console.log('❌ SQL function failed:', sqlError.message);
        
        // Method 3: Provide manual SQL instructions
        console.log('\n3. Manual SQL approach required...');
        console.log('\n📝 Please run this SQL in your Supabase dashboard:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(sqlQuery);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        return {
          success: false,
          requiresManual: true,
          sqlQuery: sqlQuery,
          message: 'Please run the SQL query manually in Supabase dashboard'
        };
      } else {
        console.log('✅ SQL function succeeded!');
        console.log('   Database ID:', sqlData.id);
      }
    } else {
      console.log('✅ Direct insert succeeded!');
      console.log('   Database ID:', data.id);
    }

    // Verify the insert
    console.log('\n4. Verifying Arthur\'s data...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('coach_connect_accounts')
      .select('*')
      .eq('coach_id', ARTHUR_DATA.coach_id)
      .single();

    if (verifyError) {
      console.log('❌ Verification failed:', verifyError.message);
    } else {
      console.log('✅ Arthur\'s data verified:');
      console.log('   Coach ID:', verifyData.coach_id);
      console.log('   Stripe Account ID:', verifyData.stripe_account_id);
      console.log('   Email:', verifyData.email);
      console.log('   Country:', verifyData.country);
      console.log('   Created At:', verifyData.created_at);
    }

    return {
      success: true,
      data: verifyData || data || sqlData
    };

  } catch (error) {
    console.error('❌ Error inserting Arthur\'s data:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the script
if (require.main === module) {
  insertArthurManual()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Arthur\'s data inserted successfully!');
        process.exit(0);
      } else if (result.requiresManual) {
        console.log('\n⚠️  Manual SQL execution required!');
        console.log('Please run the provided SQL in your Supabase dashboard.');
        process.exit(0);
      } else {
        console.log('\n❌ Failed to insert Arthur\'s data!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { insertArthurManual };
