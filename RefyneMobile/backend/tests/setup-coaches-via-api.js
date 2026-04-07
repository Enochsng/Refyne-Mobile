const fetch = require('node-fetch');

// Configuration for creating Stripe Connect accounts
const COACHES_TO_SETUP = [
  {
    coachId: 'e9f47d75-cd92-4a0f-810c-7258ea03d47f', // Enokski - Golf coach
    coachName: 'Enokski',
    email: 'enokski@refyne.com',
    sport: 'golf',
    country: 'CA',
    businessType: 'individual'
  },
  {
    coachId: 'test_coach', // Test Coach
    coachName: 'Test Coach', 
    email: 'testcoach@refyne.com',
    sport: 'golf',
    country: 'CA',
    businessType: 'individual'
  }
];

async function createCoachConnectAccountViaAPI(coachData) {
  console.log(`🏸 Creating Stripe Connect account for ${coachData.coachName} via API...`);
  
  try {
    const response = await fetch('http://localhost:3001/api/connect/create-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(coachData)
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ Stripe Connect account created successfully!');
      console.log('   Account ID:', result.account.id);
      console.log('   Country:', result.account.country);
      console.log('   Email:', result.account.email);
      console.log('   Charges Enabled:', result.account.charges_enabled);
      console.log('   Payouts Enabled:', result.account.payouts_enabled);
      
      return {
        success: true,
        account: result.account
      };
    } else {
      console.error('❌ Failed to create Stripe Connect account:', result.error || result.message);
      return {
        success: false,
        error: result.error || result.message
      };
    }
  } catch (error) {
    console.error('❌ Error creating Stripe Connect account:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function setupAllCoachesViaAPI() {
  console.log('🚀 Starting Stripe Connect account setup for all coaches via API...\n');
  
  const results = [];
  
  for (const coachData of COACHES_TO_SETUP) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Setting up: ${coachData.coachName} (${coachData.sport})`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await createCoachConnectAccountViaAPI(coachData);
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
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  });
  
  const successCount = results.filter(r => r.result.success).length;
  console.log(`\n📈 Results: ${successCount}/${results.length} coaches set up successfully`);
  
  if (successCount > 0) {
    console.log('\n🎉 Next steps:');
    console.log('1. Run: node list-coaches-for-stripe-setup.js (to verify accounts were created)');
    console.log('2. Test payments to ensure money goes to the correct accounts');
    console.log('3. If needed, create onboarding links for coaches to complete their setup');
  }
}

// Main execution
async function main() {
  await setupAllCoachesViaAPI();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createCoachConnectAccountViaAPI,
  setupAllCoachesViaAPI
};
