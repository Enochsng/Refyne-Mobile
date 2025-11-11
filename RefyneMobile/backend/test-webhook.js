const { handlePaymentIntentSucceeded } = require('./routes/webhooks');

// Mock payment intent data for testing
const mockPaymentIntent = {
  id: 'pi_test_1234567890',
  amount: 4000, // $40
  currency: 'cad',
  status: 'succeeded',
  metadata: {
    coachId: 'coach_123',
    coachName: 'Test Coach',
    sport: 'golf',
    packageType: 'package',
    packageId: '1',
    packagePrice: '4000',
    clips: '5',
    days: '3',
    platformFee: '600',
    transferAmount: '3400',
    paymentType: 'regular',
    playerId: 'player_123',
    playerName: 'Test Player'
  },
  customer: 'cus_test_123'
};

async function testWebhook() {
  try {
    console.log('🧪 Testing webhook payment processing...');
    console.log('Mock payment intent:', JSON.stringify(mockPaymentIntent, null, 2));
    
    // Import the webhook handler function
    const { handlePaymentIntentSucceeded } = require('./routes/webhooks');
    
    // Test the payment success handler
    await handlePaymentIntentSucceeded(mockPaymentIntent);
    
    console.log('✅ Webhook test completed successfully!');
    console.log('Check your database for:');
    console.log('- New coaching session');
    console.log('- New conversation');
    console.log('- Welcome message');
    
  } catch (error) {
    console.error('❌ Webhook test failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testWebhook();
