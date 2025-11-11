// Test script to make a payment request and see what coach ID is used
const fetch = require('node-fetch');

async function testPaymentRequest() {
  console.log('🧪 Testing payment request to see what coach ID is used...\n');
  
  // Test payment to Daniel (badminton coach)
  const paymentData = {
    coachId: 'daniel',
    coachName: 'Daniel',
    sport: 'badminton',
    packageType: 'package',
    packageId: 2,
    customerEmail: 'test@example.com',
    customerName: 'Test Player',
    playerId: 'test_player',
    playerName: 'Test Player'
  };
  
  console.log('Making payment request with data:', paymentData);
  
  try {
    const response = await fetch('http://localhost:3001/api/payments/create-destination-charge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentData)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Payment request successful!');
      console.log('Response:', JSON.stringify(result, null, 2));
    } else {
      console.log('❌ Payment request failed:');
      console.log('Status:', response.status);
      console.log('Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error('❌ Error making payment request:', error.message);
  }
}

// Test the payment request
testPaymentRequest().catch(console.error);
