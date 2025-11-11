#!/usr/bin/env node

/**
 * Test script to create a Canadian Stripe Connect Express account
 * for testing payment distribution functionality
 */

require('dotenv').config();

const BASE_URL = 'http://localhost:3001';

// Canadian test data
const CANADIAN_TEST_DATA = {
  coachId: 'testcoach2-canadian',
  coachName: 'Test Coach 2',
  email: 'testcoach2@gmail.com',
  sport: 'badminton',
  country: 'CA', // Canada
  businessType: 'individual',
  
  // Canadian test phone number (format: +1-XXX-XXX-XXXX)
  phone: '+1-416-555-0123',
  
  // Canadian test SIN (Social Insurance Number) - 9 digits
  // Note: This is a test SIN for development purposes only
  sin: '123456789',
  
  // Canadian address
  address: {
    line1: '123 Test Street',
    line2: 'Unit 456',
    city: 'Toronto',
    state: 'ON', // Ontario
    postal_code: 'M5V 3A8', // Canadian postal code format
    country: 'CA'
  },
  
  // Date of birth for testing
  dob: {
    day: 15,
    month: 6,
    year: 1985
  }
};

async function createCanadianTestAccount() {
  console.log('🇨🇦 Creating Canadian Test Stripe Connect Account...\n');
  
  try {
    // Step 1: Create the Connect account
    console.log('1. Creating Stripe Connect Express account...');
    const accountData = {
      coachId: CANADIAN_TEST_DATA.coachId,
      coachName: CANADIAN_TEST_DATA.coachName,
      email: CANADIAN_TEST_DATA.email,
      sport: CANADIAN_TEST_DATA.sport,
      country: CANADIAN_TEST_DATA.country,
      businessType: CANADIAN_TEST_DATA.businessType
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/connect/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(accountData)
    });
    
    const createResult = await createResponse.json();
    
    if (!createResult.success) {
      throw new Error(`Failed to create account: ${createResult.message}`);
    }
    
    console.log('✅ Account created successfully!');
    console.log('   Account ID:', createResult.account.id);
    console.log('   Country:', createResult.account.country);
    console.log('   Email:', createResult.account.email);
    console.log('   Charges Enabled:', createResult.account.charges_enabled);
    console.log('   Payouts Enabled:', createResult.account.payouts_enabled);
    
    const accountId = createResult.account.id;
    
    // Step 2: Update account with Canadian test data
    console.log('\n2. Updating account with Canadian test data...');
    const updateData = {
      individual: {
        first_name: 'Test',
        last_name: 'Coach',
        email: CANADIAN_TEST_DATA.email,
        phone: CANADIAN_TEST_DATA.phone,
        address: CANADIAN_TEST_DATA.address,
        dob: CANADIAN_TEST_DATA.dob
      },
      business_profile: {
        name: `${CANADIAN_TEST_DATA.coachName} - ${CANADIAN_TEST_DATA.sport} Coach`,
        support_email: CANADIAN_TEST_DATA.email,
        support_phone: CANADIAN_TEST_DATA.phone
      }
    };
    
    const updateResponse = await fetch(`${BASE_URL}/api/connect/account/${accountId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData)
    });
    
    const updateResult = await updateResponse.json();
    
    if (!updateResult.success) {
      console.warn('⚠️  Account update failed:', updateResult.message);
      console.log('   Continuing with basic account...');
    } else {
      console.log('✅ Account updated with Canadian test data!');
    }
    
    // Step 3: Create onboarding link
    console.log('\n3. Creating onboarding link...');
    const onboardingResponse = await fetch(`${BASE_URL}/api/connect/start-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(accountData)
    });
    
    const onboardingResult = await onboardingResponse.json();
    
    if (!onboardingResult.success) {
      throw new Error(`Failed to create onboarding link: ${onboardingResult.message}`);
    }
    
    console.log('✅ Onboarding link created!');
    console.log('🔗 Onboarding URL:', onboardingResult.onboardingLink.url);
    console.log('⏰ Expires at:', new Date(onboardingResult.onboardingLink.expires_at * 1000));
    
    // Step 4: Check account status
    console.log('\n4. Checking account status...');
    const statusResponse = await fetch(`${BASE_URL}/api/connect/coach/${CANADIAN_TEST_DATA.coachId}/status`);
    const statusResult = await statusResponse.json();
    
    if (statusResult.success) {
      console.log('✅ Account status retrieved:');
      console.log('   Coach ID:', statusResult.account.coachId);
      console.log('   Stripe Account ID:', statusResult.account.stripeAccountId);
      console.log('   Country:', statusResult.account.country);
      console.log('   Onboarding Completed:', statusResult.account.onboardingCompleted);
      console.log('   Charges Enabled:', statusResult.account.chargesEnabled);
      console.log('   Payouts Enabled:', statusResult.account.payoutsEnabled);
    }
    
    // Step 5: Display test information
    console.log('\n📋 Test Account Information:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Coach Email:', CANADIAN_TEST_DATA.email);
    console.log('Coach ID:', CANADIAN_TEST_DATA.coachId);
    console.log('Stripe Account ID:', accountId);
    console.log('Country:', CANADIAN_TEST_DATA.country);
    console.log('Phone:', CANADIAN_TEST_DATA.phone);
    console.log('SIN (Test):', CANADIAN_TEST_DATA.sin);
    console.log('Address:', `${CANADIAN_TEST_DATA.address.line1}, ${CANADIAN_TEST_DATA.address.city}, ${CANADIAN_TEST_DATA.address.state} ${CANADIAN_TEST_DATA.address.postal_code}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    console.log('\n🎉 Canadian test account created successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Open the onboarding URL in a browser');
    console.log('2. Complete the Stripe Connect onboarding process');
    console.log('3. Use the account ID for testing payment distributions');
    console.log('4. Test with Canadian payment methods and bank accounts');
    
    return {
      success: true,
      accountId,
      onboardingUrl: onboardingResult.onboardingLink.url,
      testData: CANADIAN_TEST_DATA
    };
    
  } catch (error) {
    console.error('❌ Error creating Canadian test account:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Make sure the backend server is running: cd backend && npm run dev');
    console.log('2. Check that Stripe test keys are configured in .env');
    console.log('3. Verify the database is set up correctly');
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Additional helper function to test payment distribution
async function testPaymentDistribution(accountId) {
  console.log('\n🧪 Testing Payment Distribution...');
  
  try {
    // This would be used after the account is fully onboarded
    const testPaymentData = {
      coachId: CANADIAN_TEST_DATA.coachId,
      coachName: CANADIAN_TEST_DATA.coachName,
      sport: CANADIAN_TEST_DATA.sport,
      packageType: 'package',
      packageId: 1,
      customerEmail: 'testplayer@example.com',
      customerName: 'Test Player'
    };
    
    console.log('📝 Test payment data prepared:');
    console.log('   Coach Account ID:', accountId);
    console.log('   Package: Badminton Package 1 ($47.25 CAD)');
    console.log('   Customer: testplayer@example.com');
    console.log('\n💡 To test payment distribution:');
    console.log('1. Complete the Stripe Connect onboarding first');
    console.log('2. Use the create-destination-charge endpoint');
    console.log('3. Monitor transfers and payouts');
    
  } catch (error) {
    console.error('❌ Error preparing payment test:', error.message);
  }
}

// Run the test
if (require.main === module) {
  createCanadianTestAccount()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Test completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Test failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = {
  createCanadianTestAccount,
  testPaymentDistribution,
  CANADIAN_TEST_DATA
};
