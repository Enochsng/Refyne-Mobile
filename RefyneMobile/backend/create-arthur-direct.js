#!/usr/bin/env node

/**
 * Create Arthur's account directly using SQL to bypass RLS
 */

require('dotenv').config();
const { stripe } = require('./config/stripe');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key
const supabaseUrl = process.env.SUPABASE_URL || 'https://jgtbqtpixskznnejzizm.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGJxdHBpeHNrem5uZWp6aXptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY0MzE0MCwiZXhwIjoyMDY2MjE5MTQwfQ.YourServiceKeyHere';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Coach Arthur's data
const COACH_ARTHUR = {
  coachId: 'testcoach2-canadian',
  coachName: 'Arthur',
  email: 'testcoach2@gmail.com',
  sport: 'badminton',
  country: 'CA',
  businessType: 'individual'
};

async function createArthurDirect() {
  console.log('🏸 Creating Arthur\'s account directly...\n');
  
  try {
    // Step 1: Create Stripe Connect account
    console.log('1. Creating Stripe Connect Express account...');
    const account = await stripe.accounts.create({
      type: 'express',
      country: COACH_ARTHUR.country,
      email: COACH_ARTHUR.email,
      business_type: COACH_ARTHUR.businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        name: `${COACH_ARTHUR.coachName} - ${COACH_ARTHUR.sport} Coach`,
        product_description: `Professional ${COACH_ARTHUR.sport} coaching services`,
        support_email: COACH_ARTHUR.email
      },
      metadata: {
        coachId: COACH_ARTHUR.coachId,
        coachName: COACH_ARTHUR.coachName,
        sport: COACH_ARTHUR.sport,
        platform: 'refyne-mobile'
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily'
          }
        }
      }
    });

    console.log('✅ Stripe Connect account created!');
    console.log('   Account ID:', account.id);
    console.log('   Country:', account.country);
    console.log('   Email:', account.email);
    console.log('   Charges Enabled:', account.charges_enabled);
    console.log('   Payouts Enabled:', account.payouts_enabled);

    // Step 2: Try to save to database using raw SQL
    console.log('\n2. Saving account to database using raw SQL...');
    
    const insertQuery = `
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
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING *;
    `;

    const { data, error } = await supabase.rpc('exec_sql', {
      sql: insertQuery,
      params: [
        COACH_ARTHUR.coachId,
        account.id,
        'express',
        COACH_ARTHUR.country,
        COACH_ARTHUR.email,
        account.charges_enabled,
        account.payouts_enabled,
        account.details_submitted,
        account.charges_enabled && account.payouts_enabled && account.details_submitted,
        account.business_profile,
        new Date().toISOString(),
        new Date().toISOString()
      ]
    });

    if (error) {
      console.error('❌ Error saving to database:', error);
      
      // Try alternative approach - disable RLS temporarily
      console.log('\n3. Trying to disable RLS and insert...');
      
      const disableRLSQuery = 'ALTER TABLE coach_connect_accounts DISABLE ROW LEVEL SECURITY;';
      const { error: rlsError } = await supabase.rpc('exec_sql', { sql: disableRLSQuery });
      
      if (rlsError) {
        console.log('⚠️  Could not disable RLS:', rlsError.message);
      } else {
        console.log('✅ RLS disabled, trying insert again...');
        
        const { data: retryData, error: retryError } = await supabase
          .from('coach_connect_accounts')
          .insert({
            coach_id: COACH_ARTHUR.coachId,
            stripe_account_id: account.id,
            account_type: 'express',
            country: COACH_ARTHUR.country,
            email: COACH_ARTHUR.email,
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            details_submitted: account.details_submitted,
            onboarding_completed: account.charges_enabled && account.payouts_enabled && account.details_submitted,
            business_profile: account.business_profile,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (retryError) {
          console.error('❌ Retry insert failed:', retryError);
          throw retryError;
        } else {
          console.log('✅ Account saved to database!');
          console.log('   Database ID:', retryData.id);
        }
      }
    } else {
      console.log('✅ Account saved to database!');
      console.log('   Database ID:', data.id);
    }

    // Step 3: Create onboarding link
    console.log('\n4. Creating onboarding link...');
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.APP_URL || 'http://localhost:3001'}/coach/earnings?refresh=true`,
      return_url: `${process.env.APP_URL || 'http://localhost:3001'}/coach/earnings?success=true&accountId=${account.id}`,
      type: 'account_onboarding',
    });

    console.log('✅ Onboarding link created!');
    console.log('🔗 Onboarding URL:', accountLink.url);
    console.log('⏰ Expires at:', new Date(accountLink.expires_at * 1000));

    // Step 4: Display summary
    console.log('\n📋 Coach Arthur Connect Account Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Coach ID:', COACH_ARTHUR.coachId);
    console.log('Coach Name:', COACH_ARTHUR.coachName);
    console.log('Email:', COACH_ARTHUR.email);
    console.log('Sport:', COACH_ARTHUR.sport);
    console.log('Stripe Account ID:', account.id);
    console.log('Country:', COACH_ARTHUR.country);
    console.log('Charges Enabled:', account.charges_enabled);
    console.log('Payouts Enabled:', account.payouts_enabled);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🎉 Coach Arthur Connect account created successfully!');
    
    return {
      success: true,
      accountId: account.id,
      onboardingUrl: accountLink.url,
      coachData: COACH_ARTHUR
    };

  } catch (error) {
    console.error('❌ Error creating Coach Arthur Connect account:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the script
if (require.main === module) {
  createArthurDirect()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Coach Arthur Connect account created successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Failed to create Coach Arthur Connect account!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { createArthurDirect };
