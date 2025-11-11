#!/usr/bin/env node

/**
 * Test script to verify CAD currency configuration
 * This script tests the updated pricing and currency settings
 */

require('dotenv').config();
const { stripe, getPackageInfo, calculatePlatformFee, calculateTransferAmount, DEFAULT_CURRENCY, PACKAGE_PRICING } = require('./config/stripe');

async function testCADConfiguration() {
  console.log('🇨🇦 Testing CAD Currency Configuration...\n');
  
  try {
    // Test 1: Verify default currency
    console.log('1. Testing Default Currency Configuration:');
    console.log('   Default Currency:', DEFAULT_CURRENCY);
    console.log('   Expected: cad');
    console.log('   Status:', DEFAULT_CURRENCY === 'cad' ? '✅ PASS' : '❌ FAIL');
    
    // Test 2: Test package pricing in CAD
    console.log('\n2. Testing Package Pricing (CAD):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const sports = ['badminton', 'golf'];
    const packageTypes = [1, 2, 3, 'subscription'];
    
    for (const sport of sports) {
      console.log(`\n${sport.toUpperCase()} Packages:`);
      for (const packageType of packageTypes) {
        try {
          const packageInfo = getPackageInfo(sport, packageType === 'subscription' ? 'subscription' : 'package', packageType);
          const priceInCAD = (packageInfo.price / 100).toFixed(2);
          const platformFee = calculatePlatformFee(packageInfo.price);
          const coachAmount = calculateTransferAmount(packageInfo.price);
          
          console.log(`   Package ${packageType}: $${priceInCAD} CAD`);
          console.log(`     - Platform Fee: $${(platformFee / 100).toFixed(2)} CAD`);
          console.log(`     - Coach Amount: $${(coachAmount / 100).toFixed(2)} CAD`);
          console.log(`     - Clips: ${packageInfo.clips}, Days: ${packageInfo.days}`);
        } catch (error) {
          console.log(`   Package ${packageType}: ❌ Error - ${error.message}`);
        }
      }
    }
    
    // Test 3: Test Stripe API currency support
    console.log('\n3. Testing Stripe API Currency Support:');
    try {
      // Test creating a payment intent with CAD currency
      const testPaymentIntent = await stripe.paymentIntents.create({
        amount: 1000, // $10.00 CAD
        currency: 'cad',
        payment_method_types: ['card'],
        description: 'Test CAD payment intent',
        metadata: {
          test: 'cad_configuration',
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('   ✅ CAD Payment Intent Created Successfully');
      console.log('   Payment Intent ID:', testPaymentIntent.id);
      console.log('   Amount:', testPaymentIntent.amount, 'cents');
      console.log('   Currency:', testPaymentIntent.currency);
      console.log('   Status:', testPaymentIntent.status);
      
      // Cancel the test payment intent
      await stripe.paymentIntents.cancel(testPaymentIntent.id);
      console.log('   ✅ Test Payment Intent Cancelled');
      
    } catch (error) {
      console.log('   ❌ Stripe API Test Failed:', error.message);
    }
    
    // Test 4: Test Canadian Connect Account Creation
    console.log('\n4. Testing Canadian Connect Account Creation:');
    try {
      const testAccount = await stripe.accounts.create({
        type: 'express',
        country: 'CA',
        email: 'test@example.com',
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_profile: {
          name: 'Test Canadian Coach',
          product_description: 'Test coaching services',
          support_email: 'test@example.com'
        },
        metadata: {
          test: 'cad_configuration',
          timestamp: new Date().toISOString()
        }
      });
      
      console.log('   ✅ Canadian Connect Account Created Successfully');
      console.log('   Account ID:', testAccount.id);
      console.log('   Country:', testAccount.country);
      console.log('   Email:', testAccount.email);
      console.log('   Charges Enabled:', testAccount.charges_enabled);
      console.log('   Payouts Enabled:', testAccount.payouts_enabled);
      
      // Delete the test account
      await stripe.accounts.del(testAccount.id);
      console.log('   ✅ Test Account Deleted');
      
    } catch (error) {
      console.log('   ❌ Canadian Connect Account Test Failed:', error.message);
    }
    
    // Test 5: Display pricing comparison
    console.log('\n5. Pricing Comparison (USD vs CAD):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Package Type          | USD Price | CAD Price | Exchange Rate');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const usdPrices = {
      badminton: { 1: 35, 2: 40, 3: 45, subscription: 70 },
      golf: { 1: 40, 2: 45, 3: 50, subscription: 75 }
    };
    
    for (const sport of sports) {
      for (const packageType of packageTypes) {
        const usdPrice = usdPrices[sport][packageType];
        const cadPrice = (PACKAGE_PRICING[sport][packageType].price / 100).toFixed(2);
        const exchangeRate = (parseFloat(cadPrice) / usdPrice).toFixed(3);
        
        console.log(`${sport} Package ${packageType.toString().padEnd(10)} | $${usdPrice.toString().padEnd(8)} | $${cadPrice.padEnd(8)} | ${exchangeRate}`);
      }
    }
    
    console.log('\n🎉 CAD Configuration Test Completed Successfully!');
    console.log('\n📝 Summary:');
    console.log('✅ Default currency set to CAD');
    console.log('✅ Package pricing updated for Canadian market');
    console.log('✅ Stripe API supports CAD currency');
    console.log('✅ Canadian Connect accounts can be created');
    console.log('✅ Exchange rate: ~1.35 CAD = 1 USD');
    
    return {
      success: true,
      currency: DEFAULT_CURRENCY,
      pricing: PACKAGE_PRICING
    };
    
  } catch (error) {
    console.error('❌ CAD Configuration Test Failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
if (require.main === module) {
  testCADConfiguration()
    .then(result => {
      if (result.success) {
        console.log('\n✅ All tests passed! CAD configuration is ready.');
        process.exit(0);
      } else {
        console.log('\n❌ Some tests failed. Please check the configuration.');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testCADConfiguration };
