// Script to insert Stripe Connect accounts directly into the database
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://jgtbqtpixskznnejzizm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGJxdHBpeHNrem5uZWp6aXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NDMxNDAsImV4cCI6MjA2NjIxOTE0MH0.JNIqkK1XyD8wigL4hA2yD__FRjkFqOTUWTggw2_9ixs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function insertStripeAccounts() {
  console.log('🏸 Inserting Stripe Connect accounts into database...');
  
  try {
    // Insert Enokski's account
    console.log('\n1. Inserting Enokski\'s account...');
    const { data: enokskiData, error: enokskiError } = await supabase
      .from('coach_connect_accounts')
      .upsert({
        coach_id: 'e9f47d75-cd92-4a0f-810c-7258ea03d47f',
        stripe_account_id: 'acct_1SGRN1PYPuQf9f7C',
        account_type: 'express',
        country: 'CA',
        email: 'enokski@refyne.com',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true,
        onboarding_completed: true,
        business_profile: {
          name: 'Enokski - Golf Coach',
          product_description: 'Professional golf coaching services',
          support_email: 'enokski@refyne.com'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'coach_id'
      })
      .select();

    if (enokskiError) {
      console.error('❌ Error inserting Enokski\'s account:', enokskiError);
    } else {
      console.log('✅ Enokski\'s account inserted successfully');
    }

    // Insert Test Coach's account
    console.log('\n2. Inserting Test Coach\'s account...');
    const { data: testCoachData, error: testCoachError } = await supabase
      .from('coach_connect_accounts')
      .upsert({
        coach_id: 'test_coach',
        stripe_account_id: 'acct_1SIEReB5O9eEg5ZD',
        account_type: 'express',
        country: 'CA',
        email: 'testcoach@refyne.com',
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        onboarding_completed: false,
        business_profile: {
          name: 'Test Coach - Golf Coach',
          product_description: 'Professional golf coaching services',
          support_email: 'testcoach@refyne.com'
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'coach_id'
      })
      .select();

    if (testCoachError) {
      console.error('❌ Error inserting Test Coach\'s account:', testCoachError);
    } else {
      console.log('✅ Test Coach\'s account inserted successfully');
    }

    // Verify the insertions
    console.log('\n3. Verifying accounts in database...');
    const { data: allAccounts, error: verifyError } = await supabase
      .from('coach_connect_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (verifyError) {
      console.error('❌ Error verifying accounts:', verifyError);
    } else {
      console.log('📊 Current accounts in database:');
      allAccounts.forEach((account, index) => {
        console.log(`\n${index + 1}. Coach ID: ${account.coach_id}`);
        console.log(`   Stripe Account: ${account.stripe_account_id}`);
        console.log(`   Email: ${account.email}`);
        console.log(`   Onboarding Completed: ${account.onboarding_completed}`);
      });
    }

    console.log('\n🎉 Setup complete! Now test payments to ensure they go to the correct accounts.');

  } catch (error) {
    console.error('❌ Script failed:', error.message);
  }
}

// Main execution
async function main() {
  await insertStripeAccounts();
}

if (require.main === module) {
  main();
}

module.exports = { insertStripeAccounts };
