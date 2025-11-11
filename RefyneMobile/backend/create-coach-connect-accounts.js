const { stripe } = require('./config/stripe');
const { saveCoachConnectAccount } = require('./services/database');

// Configuration for creating Stripe Connect accounts
// Based on the coaches found in your system
const COACHES_TO_SETUP = [
  {
    coachId: 'e9f47d75-cd92-4a0f-810c-7258ea03d47f', // Enokski - Golf coach
    coachName: 'Enokski',
    email: 'enokski@refyne.com', // Update with actual email if needed
    sport: 'golf',
    country: 'CA',
    businessType: 'individual'
  },
  {
    coachId: 'test_coach', // Test Coach
    coachName: 'Test Coach', 
    email: 'testcoach@refyne.com', // Update with actual email if needed
    sport: 'golf',
    country: 'CA',
    businessType: 'individual'
  }
  // Add more coaches as needed
];

async function createCoachConnectAccount(coachData) {
  console.log(`🏸 Creating Stripe Connect account for ${coachData.coachName}...`);
  
  try {
    // Step 1: Create Stripe Connect account
    console.log('1. Creating Stripe Connect Express account...');
    const account = await stripe.accounts.create({
      type: 'express',
      country: coachData.country,
      email: coachData.email,
      business_type: coachData.businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        name: `${coachData.coachName} - ${coachData.sport} Coach`,
        product_description: `Professional ${coachData.sport} coaching services`,
        support_email: coachData.email
      },
      metadata: {
        coachId: coachData.coachId,
        coachName: coachData.coachName,
        sport: coachData.sport,
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

    // Step 2: Save to database
    console.log('\n2. Saving account to database...');
    await saveCoachConnectAccount({
      coachId: coachData.coachId,
      stripeAccountId: account.id,
      accountType: account.type,
      country: account.country,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingCompleted: false,
      businessProfile: account.business_profile
    });

    console.log('✅ Account saved to database successfully!');
    
    // Step 3: Create onboarding link
    console.log('\n3. Creating onboarding link...');
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'http://localhost:3001/reauth',
      return_url: 'http://localhost:3001/return',
      type: 'account_onboarding',
    });

    console.log('✅ Onboarding link created!');
    console.log('   Onboarding URL:', accountLink.url);
    
    return {
      account,
      accountLink,
      success: true
    };

  } catch (error) {
    console.error('❌ Error creating Connect account:', error);
    return {
      error: error.message,
      success: false
    };
  }
}

async function setupAllCoaches() {
  console.log('🚀 Starting Stripe Connect account setup for all coaches...\n');
  
  const results = [];
  
  for (const coachData of COACHES_TO_SETUP) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Setting up: ${coachData.coachName} (${coachData.sport})`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await createCoachConnectAccount(coachData);
    results.push({
      coach: coachData,
      result
    });
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 SETUP SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  results.forEach(({ coach, result }, index) => {
    console.log(`\n${index + 1}. ${coach.coachName} (${coach.sport})`);
    if (result.success) {
      console.log(`   ✅ Success: ${result.account.id}`);
      console.log(`   🔗 Onboarding: ${result.accountLink.url}`);
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.result.success).length;
  console.log(`\n📈 Results: ${successCount}/${results.length} coaches set up successfully`);
  
  if (successCount > 0) {
    console.log('\n🎉 Next steps:');
    console.log('1. Share the onboarding links with each coach');
    console.log('2. Coaches complete their Stripe Connect onboarding');
    console.log('3. Test payments to ensure money goes to the correct accounts');
  }
}

// Helper function to list existing coaches from database
async function listExistingCoaches() {
  console.log('📋 Listing existing coaches in database...');
  
  try {
    const { supabase } = require('./services/database');
    const { data, error } = await supabase
      .from('coach_connect_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching coaches:', error);
      return;
    }
    
    if (data.length === 0) {
      console.log('No coaches found in database.');
      return;
    }
    
    console.log(`\nFound ${data.length} coach(es) in database:`);
    data.forEach((coach, index) => {
      console.log(`\n${index + 1}. ${coach.coach_id}`);
      console.log(`   Stripe Account: ${coach.stripe_account_id}`);
      console.log(`   Email: ${coach.email}`);
      console.log(`   Country: ${coach.country}`);
      console.log(`   Charges Enabled: ${coach.charges_enabled}`);
      console.log(`   Payouts Enabled: ${coach.payouts_enabled}`);
      console.log(`   Onboarding Completed: ${coach.onboarding_completed}`);
      console.log(`   Created: ${coach.created_at}`);
    });
    
  } catch (error) {
    console.error('Error listing coaches:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'list':
      await listExistingCoaches();
      break;
    case 'setup':
      await setupAllCoaches();
      break;
    default:
      console.log('Usage:');
      console.log('  node create-coach-connect-accounts.js list   - List existing coaches');
      console.log('  node create-coach-connect-accounts.js setup  - Create Connect accounts for all coaches');
      console.log('\nBefore running setup:');
      console.log('1. Update the COACHES_TO_SETUP array with your actual coach data');
      console.log('2. Make sure your Stripe keys are configured in .env');
      console.log('3. Ensure your database is set up and accessible');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createCoachConnectAccount,
  setupAllCoaches,
  listExistingCoaches
};
