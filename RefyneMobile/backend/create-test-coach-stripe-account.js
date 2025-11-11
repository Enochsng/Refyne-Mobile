// Simple script to create a Stripe Connect account for the test coach
// This will help us get a real Stripe account ID to use

const Stripe = require('stripe');

// Load environment variables manually
require('dotenv').config();

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function createTestCoachStripeAccount() {
  console.log('🏸 Creating Stripe Connect account for Test Coach...');
  
  try {
    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CA',
      email: 'testcoach@refyne.com',
      business_type: 'individual',
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        name: 'Test Coach - Golf Coach',
        product_description: 'Professional golf coaching services',
        support_email: 'testcoach@refyne.com'
      },
      metadata: {
        coachId: 'test_coach',
        coachName: 'Test Coach',
        sport: 'golf',
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

    console.log('✅ Stripe Connect account created successfully!');
    console.log('   Account ID:', account.id);
    console.log('   Country:', account.country);
    console.log('   Email:', account.email);
    console.log('   Charges Enabled:', account.charges_enabled);
    console.log('   Payouts Enabled:', account.payouts_enabled);
    
    console.log('\n📝 Next steps:');
    console.log('1. Update the database with this account ID:', account.id);
    console.log('2. Run the SQL script to insert this into the database');
    console.log('3. Test payments to ensure they go to the correct accounts');
    
    return account;
    
  } catch (error) {
    console.error('❌ Error creating Stripe Connect account:', error.message);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await createTestCoachStripeAccount();
  } catch (error) {
    console.error('Script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createTestCoachStripeAccount };
