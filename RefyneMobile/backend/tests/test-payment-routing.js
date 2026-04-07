// Test script to check payment routing
const { getCoachConnectAccountId } = require('../services/database');

async function testPaymentRouting() {
  console.log('🧪 Testing payment routing for different coaches...\n');
  
  const testCoaches = [
    'e9f47d75-cd92-4a0f-810c-7258ea03d47f', // Enokski
    'test_coach', // Test Coach
    'daniel', // Daniel
    'some-unknown-coach' // Unknown coach
  ];
  
  for (const coachId of testCoaches) {
    console.log(`Testing coach ID: ${coachId}`);
    try {
      const stripeAccountId = await getCoachConnectAccountId(coachId);
      if (stripeAccountId) {
        console.log(`✅ Found Stripe account: ${stripeAccountId}`);
      } else {
        console.log(`❌ No Stripe account found`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    console.log('---');
  }
}

// Test the payment routing
testPaymentRouting().catch(console.error);
