const Stripe = require('stripe');

// Validate Stripe configuration
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

if (!process.env.STRIPE_PUBLISHABLE_KEY) {
  throw new Error('STRIPE_PUBLISHABLE_KEY is required');
}

// Stripe configuration
const stripeConfig = {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 3,
  timeout: 10000,
};

// Initialize Stripe with configuration
const stripeInstance = Stripe(process.env.STRIPE_SECRET_KEY, stripeConfig);

// Platform fee configuration
const PLATFORM_FEE_PERCENTAGE = parseFloat(process.env.PLATFORM_FEE_PERCENTAGE) || 15;

// Currency configuration
const DEFAULT_CURRENCY = 'cad';

// Helper functions
const calculatePlatformFee = (amount) => {
  return Math.round(amount * (PLATFORM_FEE_PERCENTAGE / 100));
};

const calculateTransferAmount = (amount) => {
  return amount - calculatePlatformFee(amount);
};

// Package pricing configuration (in CAD cents)
const PACKAGE_PRICING = {
  badminton: {
    1: { price: 4725, clips: 5, days: 3 }, // $47.25 CAD, 5 clips, 3 days
    2: { price: 5400, clips: 7, days: 5 }, // $54.00 CAD, 7 clips, 5 days
    3: { price: 6075, clips: 10, days: 7 }, // $60.75 CAD, 10 clips, 7 days
    subscription: { price: 9450, clips: 50, days: 30 } // $94.50 CAD, 50 clips, 30 days
  },
  golf: {
    1: { price: 5400, clips: 5, days: 3 }, // $54.00 CAD, 5 clips, 3 days
    2: { price: 6075, clips: 7, days: 5 }, // $60.75 CAD, 7 clips, 5 days
    3: { price: 6750, clips: 10, days: 7 }, // $67.50 CAD, 10 clips, 7 days
    subscription: { price: 10125, clips: 50, days: 30 } // $101.25 CAD, 50 clips, 30 days
  }
};

const getPackageInfo = (sport, packageType, packageId) => {
  const sportKey = sport.toLowerCase();
  const packageKey = packageType === 'subscription' ? 'subscription' : packageId;
  
  if (!PACKAGE_PRICING[sportKey]) {
    throw new Error(`Unsupported sport: ${sport}`);
  }
  
  const packageInfo = PACKAGE_PRICING[sportKey][packageKey];
  if (!packageInfo) {
    throw new Error(`Invalid package: ${packageKey} for sport ${sport}`);
  }
  
  return packageInfo;
};

// Webhook signature verification
const verifyWebhookSignature = (payload, signature) => {
  try {
    return stripeInstance.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }
};

module.exports = {
  stripe: stripeInstance,
  stripeConfig,
  PLATFORM_FEE_PERCENTAGE,
  DEFAULT_CURRENCY,
  calculatePlatformFee,
  calculateTransferAmount,
  getPackageInfo,
  verifyWebhookSignature,
  PACKAGE_PRICING
};
