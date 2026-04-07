// Script to check the details of a payment intent
const Stripe = require('stripe');

// Load environment variables
require('dotenv').config();

// Initialize Stripe
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function checkPaymentIntent(paymentIntentId) {
  console.log(`🔍 Checking payment intent: ${paymentIntentId}`);
  
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    console.log('\n📊 Payment Intent Details:');
    console.log('ID:', paymentIntent.id);
    console.log('Amount:', paymentIntent.amount);
    console.log('Currency:', paymentIntent.currency);
    console.log('Status:', paymentIntent.status);
    console.log('Description:', paymentIntent.description);
    
    console.log('\n💰 Transfer Data:');
    if (paymentIntent.transfer_data) {
      console.log('Destination Account:', paymentIntent.transfer_data.destination);
    } else {
      console.log('No transfer data found - this means the payment is NOT going to a connected account');
    }
    
    console.log('\n📝 Metadata:');
    console.log('Coach ID:', paymentIntent.metadata.coachId);
    console.log('Coach Name:', paymentIntent.metadata.coachName);
    console.log('Sport:', paymentIntent.metadata.sport);
    console.log('Payment Type:', paymentIntent.metadata.paymentType);
    console.log('Platform Fee:', paymentIntent.metadata.platformFee);
    console.log('Coach Amount:', paymentIntent.metadata.coachAmount);
    
    console.log('\n🎯 Analysis:');
    if (paymentIntent.transfer_data && paymentIntent.transfer_data.destination) {
      console.log('✅ Payment is correctly routed to connected account:', paymentIntent.transfer_data.destination);
    } else {
      console.log('❌ Payment is NOT routed to a connected account - it will go to the main platform account');
    }
    
  } catch (error) {
    console.error('❌ Error retrieving payment intent:', error.message);
  }
}

// Check the payment intent we just created
const paymentIntentId = 'pi_3SIElCPjC3F0lBjE1QAvZm6Z';
checkPaymentIntent(paymentIntentId);
