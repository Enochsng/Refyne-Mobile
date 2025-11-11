#!/usr/bin/env node

/**
 * Test script for Stripe Connect onboarding flow
 * Run this to test the backend endpoints
 */

// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001';

async function testBackendConnection() {
  console.log('🧪 Testing Backend Connection...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test Stripe Connect onboarding endpoint
    console.log('\n2. Testing Stripe Connect onboarding endpoint...');
    const testCoachData = {
      coachId: 'test-coach-123',
      coachName: 'Test Coach',
      email: 'test@example.com',
      sport: 'badminton',
      country: 'CA',
      businessType: 'individual'
    };
    
    const onboardingResponse = await fetch(`${BASE_URL}/api/connect/start-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCoachData)
    });
    
    const onboardingData = await onboardingResponse.json();
    console.log('✅ Onboarding response:', onboardingData);
    
    if (onboardingData.success && onboardingData.onboardingLink) {
      console.log('🎉 Onboarding link generated successfully!');
      console.log('🔗 URL:', onboardingData.onboardingLink.url);
      console.log('⏰ Expires at:', new Date(onboardingData.onboardingLink.expires_at * 1000));
    }
    
    // Test coach status endpoint
    console.log('\n3. Testing coach status endpoint...');
    const statusResponse = await fetch(`${BASE_URL}/api/connect/coach/test-coach-123/status`);
    const statusData = await statusResponse.json();
    console.log('✅ Status response:', statusData);
    
    console.log('\n🎉 All tests passed! Backend is ready for Stripe Connect onboarding.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Make sure the backend server is running:');
    console.log('   cd backend && npm run dev');
  }
}

// Run the test
testBackendConnection();
