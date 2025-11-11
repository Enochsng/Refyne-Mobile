#!/usr/bin/env node

/**
 * Test script to verify Stripe configuration
 */

require('dotenv').config();

console.log('🔍 Testing Stripe Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('STRIPE_PUBLISHABLE_KEY:', process.env.STRIPE_PUBLISHABLE_KEY ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');

// Test Stripe initialization
try {
  const Stripe = require('stripe');
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  
  console.log('\n🧪 Testing Stripe API connection...');
  
  // Test creating a simple account
  stripe.accounts.create({
    type: 'express',
    country: 'CA',
    email: 'test@example.com',
    business_type: 'individual'
  }).then(account => {
    console.log('✅ Stripe account created successfully!');
    console.log('Account ID:', account.id);
    console.log('Account Type:', account.type);
    console.log('Country:', account.country);
  }).catch(error => {
    console.error('❌ Stripe API error:', error.message);
    console.error('Error type:', error.type);
    console.error('Error code:', error.code);
  });
  
} catch (error) {
  console.error('❌ Stripe initialization error:', error.message);
}
