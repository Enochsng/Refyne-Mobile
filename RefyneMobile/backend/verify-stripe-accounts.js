// Script to verify Stripe Connect accounts are valid
const Stripe = require('stripe');

// Load environment variables
require('dotenv').config();

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function verifyStripeAccount(accountId, coachName) {
  console.log(`🔍 Verifying Stripe account: ${accountId} (${coachName})`);
  
  try {
    const account = await stripe.accounts.retrieve(accountId);
    
    console.log('✅ Account found:');
    console.log('  ID:', account.id);
    console.log('  Type:', account.type);
    console.log('  Country:', account.country);
    console.log('  Email:', account.email);
    console.log('  Charges Enabled:', account.charges_enabled);
    console.log('  Payouts Enabled:', account.payouts_enabled);
    console.log('  Details Submitted:', account.details_submitted);
    
    if (account.charges_enabled && account.payouts_enabled) {
      console.log('✅ Account is ready to receive payments');
    } else {
      console.log('❌ Account is NOT ready to receive payments');
      console.log('  - Charges enabled:', account.charges_enabled);
      console.log('  - Payouts enabled:', account.payouts_enabled);
      console.log('  - Details submitted:', account.details_submitted);
    }
    
    return {
      valid: true,
      ready: account.charges_enabled && account.payouts_enabled,
      account
    };
    
  } catch (error) {
    console.log('❌ Account not found or invalid:', error.message);
    return {
      valid: false,
      error: error.message
    };
  }
}

async function verifyAllAccounts() {
  console.log('🧪 Verifying all Stripe Connect accounts...\n');
  
  const accounts = [
    { id: 'acct_1SGRN1PYPuQf9f7C', name: 'Enokski' },
    { id: 'acct_1SGPzsAxPT8ZZc4c', name: 'Arthur/Test Coach' },
    { id: 'acct_1SIDs7BUzYOREBRW', name: 'Daniel' }
  ];
  
  const results = [];
  
  for (const account of accounts) {
    console.log(`${'='.repeat(50)}`);
    const result = await verifyStripeAccount(account.id, account.name);
    results.push({ ...account, ...result });
    console.log('');
  }
  
  console.log('📊 SUMMARY:');
  console.log('='.repeat(50));
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name} (${result.id})`);
    if (result.valid) {
      if (result.ready) {
        console.log('   ✅ Ready to receive payments');
      } else {
        console.log('   ⚠️  Account exists but not ready for payments');
      }
    } else {
      console.log('   ❌ Invalid account');
    }
  });
  
  const readyAccounts = results.filter(r => r.valid && r.ready);
  console.log(`\n🎯 ${readyAccounts.length}/${results.length} accounts are ready to receive payments`);
  
  if (readyAccounts.length === 0) {
    console.log('\n❌ No accounts are ready to receive payments!');
    console.log('This explains why payments are not going to the correct accounts.');
  }
}

// Run the verification
verifyAllAccounts().catch(console.error);
