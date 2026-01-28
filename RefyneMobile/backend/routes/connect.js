const express = require('express');
const Joi = require('joi');
const { stripe, calculateTransferAmount } = require('../config/stripe');
const { saveCoachConnectAccount, getCoachConnectAccount, updateCoachAccountStatus, getCoachTransfers, getCoachConnectAccountId } = require('../services/database');
const { supabase } = require('../services/database');

const router = express.Router();

// Helper function to ensure APP_URL has a protocol
function getAppUrl() {
  let appUrl = process.env.APP_URL || 'https://app.refyne-coaching.com';
  if (!appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
    // If no protocol, default to https for production
    appUrl = `https://${appUrl}`;
  }
  return appUrl;
}

// Helper function to validate Stripe account ID format
function isValidStripeAccountId(accountId) {
  if (!accountId || typeof accountId !== 'string') {
    return false;
  }
  // Stripe account IDs start with "acct_" followed by alphanumeric characters
  // Format: acct_xxxxxxxxxxxxx
  const stripeAccountIdPattern = /^acct_[a-zA-Z0-9]{14,}$/;
  return stripeAccountIdPattern.test(accountId);
}

// Helper function to normalize redirect URLs to ensure they have http:// or https:// protocol
function normalizeRedirectUrl(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }
  
  // Trim whitespace
  url = url.trim();
  
  // If URL already has protocol, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If URL doesn't have protocol, default to https://
  // This handles cases like "example.com/path" -> "https://example.com/path"
  return `https://${url}`;
}

// Validation schemas
const createAccountSchema = Joi.object({
  coachId: Joi.string().required(),
  coachName: Joi.string().required(),
  email: Joi.string().email().required(),
  sport: Joi.string().valid('badminton', 'golf').required(),
  country: Joi.string().length(2).default('CA'), // ISO country code
  businessType: Joi.string().valid('individual', 'company').default('individual')
});

const updateAccountSchema = Joi.object({
  accountId: Joi.string().required(),
  updates: Joi.object({
    business_profile: Joi.object({
      name: Joi.string(),
      url: Joi.string().uri(),
      support_email: Joi.string().email(),
      support_phone: Joi.string(),
      support_url: Joi.string().uri()
    }),
    individual: Joi.object({
      first_name: Joi.string(),
      last_name: Joi.string(),
      email: Joi.string().email(),
      phone: Joi.string(),
      address: Joi.object({
        line1: Joi.string(),
        line2: Joi.string(),
        city: Joi.string(),
        state: Joi.string(),
        postal_code: Joi.string(),
        country: Joi.string().length(2)
      }),
      dob: Joi.object({
        day: Joi.number().min(1).max(31),
        month: Joi.number().min(1).max(12),
        year: Joi.number().min(1900).max(new Date().getFullYear())
      })
    })
  }).required()
});

/**
 * POST /api/connect/create-account
 * Create a Stripe Connect account for a coach
 */
router.post('/create-account', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createAccountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { coachId, coachName, email, sport, country, businessType } = value;

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      business_type: businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        name: `${coachName} - ${sport} Coach`,
        product_description: `Professional ${sport} coaching services`,
        support_email: email
      },
      metadata: {
        coachId,
        coachName,
        sport,
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

    // Save account data to database
    await saveCoachConnectAccount({
      coachId,
      stripeAccountId: account.id,
      accountType: account.type,
      country: account.country,
      email: account.email,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingCompleted: false,
      businessProfile: account.business_profile
    });

    console.log(`Stripe Connect account created: ${account.id} for coach ${coachName}`);

    res.json({
      success: true,
      account: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      },
      message: 'Connect account created successfully'
    });

  } catch (err) {
    console.error('Error creating Connect account:', err.message);
    res.status(500).json({
      error: 'Failed to create Connect account',
      message: err.message
    });
  }
});

/**
 * GET /api/connect/account/:id
 * Retrieve Connect account information
 */
router.get('/account/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate account ID format
    if (!isValidStripeAccountId(id)) {
      return res.status(400).json({
        error: 'Invalid account ID format',
        message: 'Stripe account ID must start with "acct_" followed by alphanumeric characters'
      });
    }
    
    const account = await stripe.accounts.retrieve(id);
    
    res.json({
      success: true,
      account: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        business_profile: account.business_profile,
        created: account.created
      }
    });

  } catch (err) {
    // Handle Stripe invalid_request_error specifically
    if (err.type === 'StripeInvalidRequestError' || err.rawType === 'invalid_request_error') {
      console.error('Error retrieving Connect account: Invalid account ID or account does not exist:', err.message);
      return res.status(400).json({
        error: 'Account not found',
        message: 'The Stripe account does not exist or is invalid. Please verify the account ID.'
      });
    }
    
    console.error('Error retrieving Connect account:', err.message);
    res.status(500).json({
      error: 'Failed to retrieve Connect account',
      message: err.message
    });
  }
});

/**
 * PUT /api/connect/account/:id
 * Update Connect account information
 */
router.put('/account/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate request body
    const { error, value } = updateAccountSchema.validate({
      accountId: id,
      updates: req.body
    });
    
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { updates } = value;
    
    const account = await stripe.accounts.update(id, updates);
    
    console.log(`Connect account updated: ${id}`);

    res.json({
      success: true,
      account: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        business_profile: account.business_profile
      },
      message: 'Account updated successfully'
    });

  } catch (err) {
    console.error('Error updating Connect account:', err.message);
    res.status(500).json({
      error: 'Failed to update Connect account',
      message: err.message
    });
  }
});

/**
 * POST /api/connect/account/:id/login-link
 * Create a login link for the Connect account
 */
router.post('/account/:id/login-link', async (req, res) => {
  try {
    const { id } = req.params;
    
    const loginLink = await stripe.accounts.createLoginLink(id);
    
    res.json({
      success: true,
      loginLink: {
        url: loginLink.url,
        expires_at: loginLink.expires_at
      }
    });

  } catch (err) {
    console.error('Error creating login link:', err.message);
    res.status(500).json({
      error: 'Failed to create login link',
      message: err.message
    });
  }
});

/**
 * POST /api/connect/account/:id/onboarding-link
 * Create an onboarding link for the Connect account
 */
router.post('/account/:id/onboarding-link', async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh_url, return_url } = req.body;
    
    // Normalize redirect URLs to ensure they have proper protocol
    const normalizedRefreshUrl = normalizeRedirectUrl(refresh_url) || `${getAppUrl()}/coach/earnings?refresh=true`;
    const normalizedReturnUrl = normalizeRedirectUrl(return_url) || `${getAppUrl()}/coach/earnings?success=true`;
    
    // Validate that URLs have proper protocol
    if (!normalizedRefreshUrl.startsWith('http://') && !normalizedRefreshUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Invalid refresh URL',
        message: 'Refresh URL must begin with http:// or https://'
      });
    }
    
    if (!normalizedReturnUrl.startsWith('http://') && !normalizedReturnUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Invalid return URL',
        message: 'Return URL must begin with http:// or https://'
      });
    }
    
    const accountLink = await stripe.accountLinks.create({
      account: id,
      refresh_url: normalizedRefreshUrl,
      return_url: normalizedReturnUrl,
      type: 'account_onboarding',
    });
    
    res.json({
      success: true,
      onboardingLink: {
        url: accountLink.url,
        expires_at: accountLink.expires_at
      }
    });

  } catch (err) {
    // Handle Stripe redirect URL errors specifically
    if (err.type === 'StripeInvalidRequestError' || err.rawType === 'invalid_request_error') {
      if (err.message && err.message.includes('Redirect urls must begin with HTTP or HTTPS')) {
        console.error('Error creating onboarding link: Invalid redirect URL format:', err.message);
        return res.status(400).json({
          error: 'Invalid redirect URL',
          message: 'Redirect URLs must begin with http:// or https://. Please check the URLs provided.'
        });
      }
    }
    
    console.error('Error creating onboarding link:', err.message);
    res.status(500).json({
      error: 'Failed to create onboarding link',
      message: err.message
    });
  }
});

/**
 * POST /api/connect/start-onboarding
 * Create a Connect account and return onboarding link for coaches
 */
router.post('/start-onboarding', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createAccountSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { coachId, coachName, email, sport, country, businessType } = value;

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: country,
      email: email,
      business_type: businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_profile: {
        name: `${coachName} - ${sport} Coach`,
        product_description: `Professional ${sport} coaching services`,
        support_email: email
      },
      metadata: {
        coachId,
        coachName,
        sport,
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

    // Get app URL with protocol
    const appUrl = getAppUrl();
    const refreshUrl = `${appUrl}/coach/earnings?refresh=true`;
    const returnUrl = `${appUrl}/coach/earnings?success=true&accountId=${account.id}`;
    
    // Normalize and validate URLs to ensure they have proper protocol
    const normalizedRefreshUrl = normalizeRedirectUrl(refreshUrl);
    const normalizedReturnUrl = normalizeRedirectUrl(returnUrl);
    
    // Validate that URLs have proper protocol
    if (!normalizedRefreshUrl || (!normalizedRefreshUrl.startsWith('http://') && !normalizedRefreshUrl.startsWith('https://'))) {
      console.error('❌ Invalid refresh URL format:', refreshUrl);
      return res.status(500).json({
        error: 'Invalid URL configuration',
        message: 'Refresh URL must begin with http:// or https://. Please check APP_URL environment variable.'
      });
    }
    
    if (!normalizedReturnUrl || (!normalizedReturnUrl.startsWith('http://') && !normalizedReturnUrl.startsWith('https://'))) {
      console.error('❌ Invalid return URL format:', returnUrl);
      return res.status(500).json({
        error: 'Invalid URL configuration',
        message: 'Return URL must begin with http:// or https://. Please check APP_URL environment variable.'
      });
    }
    
    // Log URLs for debugging
    console.log('🔍 Creating onboarding link with URLs:');
    console.log('   APP_URL from env:', process.env.APP_URL);
    console.log('   Final appUrl:', appUrl);
    console.log('   refresh_url:', normalizedRefreshUrl);
    console.log('   return_url:', normalizedReturnUrl);

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: normalizedRefreshUrl,
      return_url: normalizedReturnUrl,
      type: 'account_onboarding',
    });

    // Save account data to database (optional - continue even if this fails)
    try {
      await saveCoachConnectAccount({
        coachId,
        stripeAccountId: account.id,
        accountType: account.type,
        country: account.country,
        email: account.email,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        onboardingCompleted: false,
        businessProfile: account.business_profile
      });
      console.log('Account data saved to database successfully');
    } catch (dbError) {
      console.warn('Failed to save account data to database:', dbError.message);
      // Continue with the response even if database save fails
    }

    console.log(`Stripe Connect onboarding started: ${account.id} for coach ${coachName}`);

    res.json({
      success: true,
      account: {
        id: account.id,
        type: account.type,
        country: account.country,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted
      },
      onboardingLink: {
        url: accountLink.url,
        expires_at: accountLink.expires_at
      },
      message: 'Onboarding link created successfully'
    });

  } catch (err) {
    // Handle Stripe redirect URL errors specifically
    if (err.type === 'StripeInvalidRequestError' || err.rawType === 'invalid_request_error') {
      if (err.message && err.message.includes('Redirect urls must begin with HTTP or HTTPS')) {
        console.error('Error starting Connect onboarding: Invalid redirect URL format:', err.message);
        return res.status(400).json({
          error: 'Invalid redirect URL',
          message: 'Redirect URLs must begin with http:// or https://. Please check APP_URL environment variable.'
        });
      }
    }
    
    console.error('Error starting Connect onboarding:', err.message);
    res.status(500).json({
      error: 'Failed to start Connect onboarding',
      message: err.message
    });
  }
});

/**
 * POST /api/connect/transfer
 * Create a transfer to a coach's Connect account
 */
router.post('/transfer', async (req, res) => {
  try {
    const { paymentIntentId, coachAccountId, amount, description } = req.body;

    if (!paymentIntentId || !coachAccountId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: paymentIntentId, coachAccountId, amount'
      });
    }

    // Calculate transfer amount (after platform fee)
    const transferAmount = calculateTransferAmount(amount);

    // Create transfer
    const transfer = await stripe.transfers.create({
      amount: transferAmount,
      currency: 'cad',
      destination: coachAccountId,
      source_transaction: paymentIntentId,
      description: description || 'Coaching session payment',
      metadata: {
        paymentIntentId,
        platformFee: (amount - transferAmount).toString(),
        coachEarnings: transferAmount.toString()
      }
    });

    console.log(`Transfer created: ${transfer.id} for ${transferAmount} to account ${coachAccountId}`);

    res.json({
      success: true,
      transfer: {
        id: transfer.id,
        amount: transfer.amount,
        currency: transfer.currency,
        destination: transfer.destination,
        status: transfer.status,
        created: transfer.created
      },
      message: 'Transfer created successfully'
    });

  } catch (err) {
    console.error('Error creating transfer:', err.message);
    res.status(500).json({
      error: 'Failed to create transfer',
      message: err.message
    });
  }
});

/**
 * GET /api/connect/account/:id/balance
 * Get account balance
 */
router.get('/account/:id/balance', async (req, res) => {
  try {
    const { id } = req.params;
    
    const balance = await stripe.balance.retrieve({
      stripeAccount: id
    });
    
    res.json({
      success: true,
      balance: {
        available: balance.available,
        pending: balance.pending,
        instant_available: balance.instant_available
      }
    });

  } catch (err) {
    console.error('Error retrieving account balance:', err.message);
    res.status(500).json({
      error: 'Failed to retrieve account balance',
      message: err.message
    });
  }
});

/**
 * GET /api/connect/account/:id/payouts
 * Get account payouts
 */
router.get('/account/:id/payouts', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10, starting_after } = req.query;
    
    const payouts = await stripe.payouts.list({
      limit: parseInt(limit),
      starting_after: starting_after
    }, {
      stripeAccount: id
    });
    
    res.json({
      success: true,
      payouts: payouts.data.map(payout => ({
        id: payout.id,
        amount: payout.amount,
        currency: payout.currency,
        status: payout.status,
        arrival_date: payout.arrival_date,
        created: payout.created,
        description: payout.description
      })),
      has_more: payouts.has_more
    });

  } catch (err) {
    console.error('Error retrieving payouts:', err.message);
    res.status(500).json({
      error: 'Failed to retrieve payouts',
      message: err.message
    });
  }
});

/**
 * GET /api/connect/coach/:coachId/onboarding-link
 * Get onboarding link for a coach's Connect account
 */
router.get('/coach/:coachId/onboarding-link', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { refresh_url, return_url } = req.query;
    
    console.log(`🔗 Getting onboarding link for coach: ${coachId}`);
    
    // First, get the coach's Connect account from database
    const dbAccount = await getCoachConnectAccount(coachId);
    
    if (!dbAccount) {
      console.log(`❌ No Connect account found for coach: ${coachId}`);
      return res.status(404).json({
        error: 'Connect account not found',
        message: 'No Stripe Connect account found for this coach. Please create an account first.'
      });
    }
    
    // Normalize redirect URLs to ensure they have proper protocol
    const normalizedRefreshUrl = normalizeRedirectUrl(refresh_url) || `${getAppUrl()}/coach/earnings?refresh=true`;
    const normalizedReturnUrl = normalizeRedirectUrl(return_url) || `${getAppUrl()}/coach/earnings?success=true&accountId=${dbAccount.stripe_account_id}`;
    
    // Validate that URLs have proper protocol
    if (!normalizedRefreshUrl.startsWith('http://') && !normalizedRefreshUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Invalid refresh URL',
        message: 'Refresh URL must begin with http:// or https://'
      });
    }
    
    if (!normalizedReturnUrl.startsWith('http://') && !normalizedReturnUrl.startsWith('https://')) {
      return res.status(400).json({
        error: 'Invalid return URL',
        message: 'Return URL must begin with http:// or https://'
      });
    }
    
    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: dbAccount.stripe_account_id,
      refresh_url: normalizedRefreshUrl,
      return_url: normalizedReturnUrl,
      type: 'account_onboarding',
    });
    
    console.log(`✅ Onboarding link created for coach ${coachId}: ${accountLink.url}`);
    
    res.json({
      success: true,
      onboardingLink: {
        url: accountLink.url,
        expires_at: accountLink.expires_at
      },
      account: {
        id: dbAccount.stripe_account_id,
        type: dbAccount.account_type,
        country: dbAccount.country,
        email: dbAccount.email
      }
    });

  } catch (err) {
    // Handle Stripe redirect URL errors specifically
    if (err.type === 'StripeInvalidRequestError' || err.rawType === 'invalid_request_error') {
      if (err.message && err.message.includes('Redirect urls must begin with HTTP or HTTPS')) {
        console.error('Error getting onboarding link: Invalid redirect URL format:', err.message);
        return res.status(400).json({
          error: 'Invalid redirect URL',
          message: 'Redirect URLs must begin with http:// or https://. Please check the URLs provided.'
        });
      }
    }
    
    console.error('Error getting onboarding link:', err.message);
    res.status(500).json({
      error: 'Failed to get onboarding link',
      message: err.message
    });
  }
});

/**
 * GET /api/connect/coach/:coachId/transfers
 * Get coach's transfer history and earnings data from both database and Stripe
 */
router.get('/coach/:coachId/transfers', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { limit = 50 } = req.query;
    
    console.log(`📊 Fetching transfers for coach: ${coachId}`);
    
    // Get coach's Stripe account ID
    const stripeAccountId = await getCoachConnectAccountId(coachId);
    if (!stripeAccountId) {
      console.log(`❌ No Stripe account found for coach: ${coachId}`);
      return res.json({
        success: true,
        transfers: [],
        summary: {
          totalEarnings: 0,
          pendingEarnings: 0,
          totalCustomers: 0,
          totalTransfers: 0
        },
        message: 'No Stripe account found for this coach'
      });
    }
    
    console.log(`🔗 Using Stripe account: ${stripeAccountId}`);
    
    // Get transfers from database
    const dbTransfers = await getCoachTransfers(coachId, parseInt(limit));
    console.log(`📋 Found ${dbTransfers.length} transfers in database`);
    
    // Get payments from Stripe
    let stripePayments = [];
    try {
      console.log(`🔍 Fetching payments from Stripe for connected account: ${stripeAccountId}`);
      
      // Since we can't access connected account data directly, fetch from main account and filter
      let paymentIntents = [];
      let charges = [];
      
      try {
        console.log(`🔍 Fetching payment intents from main account...`);
        const mainPiResponse = await stripe.paymentIntents.list({
          limit: 100 // Get more to account for filtering
        });
        
        console.log(`📊 Total payment intents from main account: ${mainPiResponse.data.length}`);
        
        // Log all payment intents for debugging
        mainPiResponse.data.forEach((pi, index) => {
          console.log(`Payment Intent ${index + 1}: ${pi.id}, amount: ${pi.amount}, status: ${pi.status}`);
          if (pi.charges && pi.charges.data) {
            pi.charges.data.forEach(charge => {
              console.log(`  Charge: ${charge.id}, destination: ${charge.destination}`);
            });
          }
        });
        
        // For debugging, let's also log if we find any payments that match our connected account
        const matchingPayments = mainPiResponse.data.filter(pi => {
          const hasDestination = pi.charges && pi.charges.data && pi.charges.data.some(charge => 
            charge.destination === stripeAccountId
          );
          const isDirectDestination = pi.on_behalf_of === stripeAccountId || pi.transfer_data?.destination === stripeAccountId;
          return hasDestination || isDirectDestination;
        });
        console.log(`🔍 Found ${matchingPayments.length} payment intents that match connected account ${stripeAccountId}`);
        
        // Filter for payment intents that belong to this connected account
        paymentIntents = mainPiResponse.data.filter(pi => {
          // Check if the payment intent has charges that belong to the connected account
          const hasDestination = pi.charges && pi.charges.data && pi.charges.data.some(charge => 
            charge.destination === stripeAccountId
          );
          
          // Also check if the payment intent itself has the connected account as destination
          const isDirectDestination = pi.on_behalf_of === stripeAccountId || pi.transfer_data?.destination === stripeAccountId;
          
          if (hasDestination || isDirectDestination) {
            console.log(`✅ Found payment intent ${pi.id} for connected account ${stripeAccountId}`);
          }
          
          return hasDestination || isDirectDestination;
        });
        console.log(`✅ Found ${paymentIntents.length} payment intents for connected account ${stripeAccountId}`);
      } catch (mainPiError) {
        console.log(`⚠️ Could not fetch payment intents from main account: ${mainPiError.message}`);
      }
      
      try {
        console.log(`🔍 Fetching charges from main account...`);
        const mainChargesResponse = await stripe.charges.list({
          limit: 100, // Get more to account for filtering
          expand: ['data.balance_transaction']
        });
        
        console.log(`📊 Total charges from main account: ${mainChargesResponse.data.length}`);
        
        // Filter for charges that belong to this connected account
        charges = mainChargesResponse.data.filter(charge => {
          const isForConnectedAccount = charge.destination === stripeAccountId;
          if (isForConnectedAccount) {
            console.log(`✅ Found charge ${charge.id} for connected account ${stripeAccountId}`);
          }
          return isForConnectedAccount;
        });
        console.log(`✅ Found ${charges.length} charges for connected account ${stripeAccountId}`);
      } catch (mainChargesError) {
        console.log(`⚠️ Could not fetch charges from main account: ${mainChargesError.message}`);
      }
      
      // Process payment intents (preferred source as they contain more metadata)
      const piPayments = paymentIntents.map(pi => ({
        id: `stripe_pi_${pi.id}`,
        transfer_id: pi.id,
        amount: pi.amount,
        currency: pi.currency,
        status: pi.status === 'succeeded' ? 'paid' : pi.status,
        description: pi.description || `Payment Intent ${pi.id}`,
        created_at: new Date(pi.created * 1000).toISOString(),
        metadata: {
          payment_intent_id: pi.id,
          customer_id: pi.customer,
          source: 'stripe_payment_intent'
        }
      }));
      
      // Process charges (only if they don't have a corresponding payment intent)
      const chargePayments = charges
        .filter(charge => {
          // Only include charges that don't have a corresponding payment intent
          const hasCorrespondingPI = paymentIntents.some(pi => 
            pi.charges && pi.charges.data && pi.charges.data.some(c => c.id === charge.id)
          );
          return !hasCorrespondingPI;
        })
        .map(charge => ({
          id: `stripe_charge_${charge.id}`,
          transfer_id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status === 'succeeded' ? 'paid' : charge.status,
          description: charge.description || `Charge ${charge.id}`,
          created_at: new Date(charge.created * 1000).toISOString(),
          metadata: {
            payment_intent_id: charge.payment_intent,
            customer_id: charge.customer,
            source: 'stripe_charge'
          }
        }));
      
      // Combine and deduplicate by payment intent ID (more reliable than transfer_id)
      stripePayments = [...piPayments, ...chargePayments];
      const uniqueStripePayments = stripePayments.filter((payment, index, self) => {
        // Use payment_intent_id for deduplication if available, otherwise use transfer_id
        const dedupKey = payment.metadata?.payment_intent_id || payment.transfer_id;
        return index === self.findIndex(p => 
          (p.metadata?.payment_intent_id || p.transfer_id) === dedupKey
        );
      });
      
      stripePayments = uniqueStripePayments;
      console.log(`✅ Found ${stripePayments.length} unique payments from Stripe`);
    } catch (stripeError) {
      console.error('❌ Error fetching payments from Stripe:', stripeError.message);
      // Continue with database transfers only
    }
    
    // Combine and deduplicate transfers
    const allTransfers = [...dbTransfers, ...stripePayments];
    const uniqueTransfers = allTransfers.filter((transfer, index, self) => {
      // Use multiple fields for deduplication to catch more cases
      const dedupKey = transfer.metadata?.payment_intent_id || 
                      transfer.transfer_id || 
                      transfer.id;
      return index === self.findIndex(t => 
        (t.metadata?.payment_intent_id || t.transfer_id || t.id) === dedupKey
      );
    });
    
    // Sort by creation date (newest first)
    uniqueTransfers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Filter out transfers with "requires_payment_method" status - only show paid or failed payments
    const filteredTransfers = uniqueTransfers.filter(transfer => {
      return transfer.status !== 'requires_payment_method';
    });
    
    // Calculate earnings summary using filtered transfers
    const totalEarnings = filteredTransfers
      .filter(t => t.status === 'paid' || t.status === 'succeeded')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const pendingEarnings = filteredTransfers
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Count unique customers from conversations/DMs instead of payments
    let uniqueCustomers = 0;
    try {
      console.log(`🔍 Fetching conversation count for coach: ${coachId}`);
      
      // If coachId is a Stripe account ID, we need to find the actual coach user ID
      let actualCoachId = coachId;
      
      // Check if this is a Stripe account ID (starts with 'acct_')
      if (coachId.startsWith('acct_')) {
        console.log(`🔍 Coach ID is a Stripe account ID, looking up actual coach user ID...`);
        
        // Try to find the coach user ID from the database
        const { data: coachAccount, error: accountError } = await supabase
          .from('coach_connect_accounts')
          .select('coach_id')
          .eq('stripe_account_id', coachId)
          .single();
        
        if (accountError || !coachAccount) {
          console.log(`⚠️ Could not find coach user ID for Stripe account ${coachId}, using fallback`);
          // Fallback to payment-based counting
          uniqueCustomers = new Set(
            uniqueTransfers
              .filter(t => t.status === 'paid' || t.status === 'succeeded')
              .map(t => t.metadata?.customer_id || t.metadata?.player_id || t.metadata?.customer_email)
              .filter(Boolean)
    ).size;
        } else {
          actualCoachId = coachAccount.coach_id;
          console.log(`✅ Found actual coach user ID: ${actualCoachId}`);
        }
      }
      
      // Get conversations for this coach to count unique players/students
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('player_id, player_name')
        .eq('coach_id', actualCoachId);
      
      if (convError) {
        console.error('Error fetching conversations for customer count:', convError);
        // Fallback to payment-based counting if conversation fetch fails
        uniqueCustomers = new Set(
          uniqueTransfers
            .filter(t => t.status === 'paid' || t.status === 'succeeded')
            .map(t => t.metadata?.customer_id || t.metadata?.player_id || t.metadata?.customer_email)
            .filter(Boolean)
        ).size;
        console.log(`⚠️ Using payment-based customer count: ${uniqueCustomers}`);
      } else if (conversations.length === 0) {
        console.log(`ℹ️ No conversations found for coach ${actualCoachId}, using payment-based counting`);
        // Count unique customers from successful payments
        uniqueCustomers = new Set(
          uniqueTransfers
            .filter(t => t.status === 'paid' || t.status === 'succeeded')
            .map(t => t.metadata?.customer_id || t.metadata?.player_id || t.metadata?.customer_email)
            .filter(Boolean)
        ).size;
        console.log(`✅ Found ${uniqueCustomers} unique customers from payments`);
      } else {
        // Count unique players from conversations
        uniqueCustomers = new Set(
          conversations.map(conv => conv.player_id).filter(Boolean)
        ).size;
        console.log(`✅ Found ${uniqueCustomers} unique customers from conversations`);
      }
    } catch (error) {
      console.error('Error counting customers from conversations:', error.message);
      // Fallback to payment-based counting
      uniqueCustomers = new Set(
        uniqueTransfers
          .filter(t => t.status === 'paid' || t.status === 'succeeded')
          .map(t => t.metadata?.customer_id || t.metadata?.player_id || t.metadata?.customer_email)
          .filter(Boolean)
      ).size;
    }
    
    res.json({
      success: true,
      transfers: filteredTransfers.map(transfer => ({
        id: transfer.id,
        transfer_id: transfer.transfer_id,
        amount: transfer.amount,
        currency: transfer.currency,
        status: transfer.status,
        description: transfer.description,
        created_at: transfer.created_at,
        metadata: transfer.metadata
      })),
      summary: {
        totalEarnings,
        pendingEarnings,
        totalCustomers: uniqueCustomers,
        totalTransfers: filteredTransfers.length
      }
    });
    
  } catch (err) {
    console.error('Error fetching coach transfers:', err.message);
    res.status(500).json({
      error: 'Failed to fetch transfers',
      message: err.message
    });
  }
});

/**
 * GET /api/connect/coach/:coachId/status
 * Get coach's Connect account status from Stripe API and update database
 */
router.get('/coach/:coachId/status', async (req, res) => {
  // TEMPORARY FIX: Fetch real Stripe account status bypassing database schema issues
  const { coachId } = req.params;
  const { email } = req.query;
  
  console.log(`🔍 TEMP: Checking status for coach: ${coachId}${email ? ` (email: ${email})` : ''}`);
  
  try {
    // Get account info from database using a simple query (bypassing schema cache issues)
    let dbAccount = null;
    try {
      const { data: accountData, error: accountError } = await supabase
        .from('coach_connect_accounts')
        .select('coach_id, stripe_account_id, email, charges_enabled, payouts_enabled, details_submitted, onboarding_completed')
        .eq('coach_id', coachId)
        .single();
      
      if (!accountError && accountData) {
        dbAccount = accountData;
        console.log('✅ Found account in database:', dbAccount.stripe_account_id);
      }
    } catch (dbErr) {
      console.log('⚠️ Database query failed, trying email lookup...');
      
      // Try email lookup if coach ID lookup fails
      if (email) {
        try {
          const { data: emailData, error: emailError } = await supabase
            .from('coach_connect_accounts')
            .select('coach_id, stripe_account_id, email, charges_enabled, payouts_enabled, details_submitted, onboarding_completed')
            .eq('email', email)
            .single();
          
          if (!emailError && emailData) {
            dbAccount = emailData;
            console.log('✅ Found account by email:', dbAccount.stripe_account_id);
          }
        } catch (emailErr) {
          console.log('❌ Email lookup also failed:', emailErr.message);
        }
      }
    }
    
    if (!dbAccount) {
      console.log('🔍 No Stripe Connect account found for coach - this is normal for new coaches');
      return res.status(404).json({
        success: false,
        error: 'Coach account not found',
        message: 'No Stripe Connect account found for this coach',
        account: null
      });
    }
    
    // Validate account ID format before making API call
    if (!isValidStripeAccountId(dbAccount.stripe_account_id)) {
      console.error('❌ Invalid Stripe account ID format:', dbAccount.stripe_account_id);
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
        message: 'The Stripe account ID stored in the database is invalid. Please contact support.',
        account: {
          coachId: dbAccount.coach_id,
          stripeAccountId: dbAccount.stripe_account_id,
          accountType: 'express',
          country: 'CA',
          email: dbAccount.email,
          chargesEnabled: dbAccount.charges_enabled,
          payoutsEnabled: dbAccount.payouts_enabled,
          detailsSubmitted: dbAccount.details_submitted,
          onboardingCompleted: dbAccount.onboarding_completed,
          businessProfile: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        warning: 'Using cached data - account ID is invalid'
      });
    }
    
    // Fetch current status from Stripe API
    let stripeAccount;
    try {
      console.log(`🔗 Fetching Stripe account: ${dbAccount.stripe_account_id}`);
      stripeAccount = await stripe.accounts.retrieve(dbAccount.stripe_account_id);
      console.log(`✅ Stripe API response:`, {
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted
      });
    } catch (stripeError) {
      // Handle Stripe invalid_request_error specifically
      if (stripeError.type === 'StripeInvalidRequestError' || stripeError.rawType === 'invalid_request_error') {
        console.error('❌ Error fetching from Stripe API: Account does not exist or is invalid:', stripeError.message);
        // If account doesn't exist in Stripe, return database data with warning
        return res.json({
          success: true,
          account: {
            coachId: dbAccount.coach_id,
            stripeAccountId: dbAccount.stripe_account_id,
            accountType: 'express',
            country: 'CA',
            email: dbAccount.email,
            chargesEnabled: dbAccount.charges_enabled,
            payoutsEnabled: dbAccount.payouts_enabled,
            detailsSubmitted: dbAccount.details_submitted,
            onboardingCompleted: dbAccount.onboarding_completed,
            businessProfile: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          warning: 'Account not found in Stripe - using cached data. The account may have been deleted or never created.'
        });
      }
      
      console.error('❌ Error fetching from Stripe API:', stripeError.message);
      // If Stripe API fails for other reasons, return database data
      return res.json({
        success: true,
        account: {
          coachId: dbAccount.coach_id,
          stripeAccountId: dbAccount.stripe_account_id,
          accountType: 'express',
          country: 'CA',
          email: dbAccount.email,
          chargesEnabled: dbAccount.charges_enabled,
          payoutsEnabled: dbAccount.payouts_enabled,
          detailsSubmitted: dbAccount.details_submitted,
          onboardingCompleted: dbAccount.onboarding_completed,
          businessProfile: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        warning: 'Using cached data - could not fetch from Stripe'
      });
    }
    
    // Return the real Stripe account status
    return res.json({
      success: true,
      account: {
        coachId: dbAccount.coach_id,
        stripeAccountId: dbAccount.stripe_account_id,
        accountType: 'express',
        country: stripeAccount.country || 'CA',
        email: dbAccount.email,
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        detailsSubmitted: stripeAccount.details_submitted,
        onboardingCompleted: stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted,
        businessProfile: stripeAccount.business_profile || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Error in temporary status endpoint:', error.message);
    return res.status(500).json({
      error: 'Failed to retrieve coach account status',
      message: error.message
    });
  }
});

/**
 * GET /api/connect/coach/:coachId/status-original
 * Original status endpoint (commented out due to schema cache issues)
 */
router.get('/coach/:coachId/status-original', async (req, res) => {
  try {
    const { coachId } = req.params;
    const { email } = req.query; // Optional email parameter
    console.log(`🔍 Checking status for coach: ${coachId}${email ? ` (email: ${email})` : ''}`);
    
    // First, get the account from database by coach ID
    let dbAccount;
    try {
      dbAccount = await getCoachConnectAccount(coachId);
      console.log('📊 Database account found by coach ID:', dbAccount ? {
        coach_id: dbAccount.coach_id,
        stripe_account_id: dbAccount.stripe_account_id,
        charges_enabled: dbAccount.charges_enabled,
        payouts_enabled: dbAccount.payouts_enabled,
        details_submitted: dbAccount.details_submitted,
        onboarding_completed: dbAccount.onboarding_completed
      } : 'No account found');
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message);
      if (dbError.message.includes('businessProfile') || dbError.message.includes('business_profile')) {
        console.log('🔧 Database schema issue detected - using fallback approach');
        // Try a simpler query without business_profile
        try {
          const { data: fallbackAccount, error: fallbackError } = await supabase
            .from('coach_connect_accounts')
            .select('id, coach_id, stripe_account_id, account_type, country, email, charges_enabled, payouts_enabled, details_submitted, onboarding_completed, created_at, updated_at')
            .eq('coach_id', coachId)
            .single();
          
          if (!fallbackError && fallbackAccount) {
            dbAccount = fallbackAccount;
            console.log('✅ Fallback query successful');
          } else {
            console.log('❌ Fallback query failed:', fallbackError?.message);
          }
        } catch (fallbackErr) {
          console.error('❌ Fallback query also failed:', fallbackErr.message);
        }
      } else {
        console.error('❌ Non-schema error, continuing without account data');
      }
    }
    
    // If no account found by coach ID, try to find by email (only if email is provided)
    if (!dbAccount && email) {
      console.log(`🔍 No account found by coach ID, trying to find by email: ${email}`);
      
      try {
        const { data: emailAccount, error: emailError } = await supabase
          .from('coach_connect_accounts')
          .select('id, coach_id, stripe_account_id, account_type, country, email, charges_enabled, payouts_enabled, details_submitted, onboarding_completed, created_at, updated_at')
          .eq('email', email)
          .single();
        
        if (!emailError && emailAccount) {
          dbAccount = emailAccount;
          console.log('✅ Found account by email:', {
            coach_id: dbAccount.coach_id,
            email: dbAccount.email,
            stripe_account_id: dbAccount.stripe_account_id
          });
        } else {
          console.log(`❌ No account found by email: ${email}`);
        }
      } catch (emailErr) {
        console.error('❌ Email lookup error:', emailErr.message);
        console.log(`❌ No account found by email: ${email}`);
      }
    }
    
    // If still no account found, this is a new coach who needs to set up their account
    // Don't fall back to other accounts - let them set up their own
    if (!dbAccount) {
      console.log(`🔍 No account found for coach ${coachId} - this is a new coach who needs to set up their account`);
    }
    
    if (!dbAccount) {
      console.log(`❌ No database account found for coach: ${coachId}`);
      return res.status(404).json({
        error: 'Coach account not found',
        message: 'No Stripe Connect account found for this coach'
      });
    }
    
    // Validate account ID format before making API call
    if (!isValidStripeAccountId(dbAccount.stripe_account_id)) {
      console.error('❌ Invalid Stripe account ID format:', dbAccount.stripe_account_id);
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID format',
        message: 'The Stripe account ID stored in the database is invalid. Please contact support.',
        account: {
          coachId: dbAccount.coach_id,
          stripeAccountId: dbAccount.stripe_account_id,
          accountType: dbAccount.account_type,
          country: dbAccount.country,
          email: dbAccount.email,
          chargesEnabled: dbAccount.charges_enabled,
          payoutsEnabled: dbAccount.payouts_enabled,
          detailsSubmitted: dbAccount.details_submitted,
          onboardingCompleted: dbAccount.onboarding_completed,
          businessProfile: dbAccount.business_profile || null,
          createdAt: dbAccount.created_at,
          updatedAt: dbAccount.updated_at
        },
        warning: 'Using cached data - account ID is invalid'
      });
    }
    
    // Fetch current status from Stripe API
    let stripeAccount;
    try {
      console.log(`🔗 Fetching Stripe account: ${dbAccount.stripe_account_id}`);
      stripeAccount = await stripe.accounts.retrieve(dbAccount.stripe_account_id);
      console.log(`✅ Stripe API response for ${coachId}:`, {
        id: stripeAccount.id,
        type: stripeAccount.type,
        country: stripeAccount.country,
        email: stripeAccount.email,
        charges_enabled: stripeAccount.charges_enabled,
        payouts_enabled: stripeAccount.payouts_enabled,
        details_submitted: stripeAccount.details_submitted,
        business_profile: stripeAccount.business_profile?.name
      });
    } catch (stripeError) {
      // Handle Stripe invalid_request_error specifically
      if (stripeError.type === 'StripeInvalidRequestError' || stripeError.rawType === 'invalid_request_error') {
        console.error('Error fetching from Stripe API: Account does not exist or is invalid:', stripeError.message);
        // If account doesn't exist in Stripe, return database data with warning
        return res.json({
          success: true,
          account: {
            coachId: dbAccount.coach_id,
            stripeAccountId: dbAccount.stripe_account_id,
            accountType: dbAccount.account_type,
            country: dbAccount.country,
            email: dbAccount.email,
            chargesEnabled: dbAccount.charges_enabled,
            payoutsEnabled: dbAccount.payouts_enabled,
            detailsSubmitted: dbAccount.details_submitted,
            onboardingCompleted: dbAccount.onboarding_completed,
            businessProfile: dbAccount.business_profile || null,
            createdAt: dbAccount.created_at,
            updatedAt: dbAccount.updated_at
          },
          warning: 'Account not found in Stripe - using cached data. The account may have been deleted or never created.'
        });
      }
      
      console.error('Error fetching from Stripe API:', stripeError.message);
      // If Stripe API fails for other reasons, return database data
      return res.json({
        success: true,
        account: {
          coachId: dbAccount.coach_id,
          stripeAccountId: dbAccount.stripe_account_id,
          accountType: dbAccount.account_type,
          country: dbAccount.country,
          email: dbAccount.email,
          chargesEnabled: dbAccount.charges_enabled,
          payoutsEnabled: dbAccount.payouts_enabled,
          detailsSubmitted: dbAccount.details_submitted,
          onboardingCompleted: dbAccount.onboarding_completed,
          businessProfile: dbAccount.business_profile || null,
          createdAt: dbAccount.created_at,
          updatedAt: dbAccount.updated_at
        },
        warning: 'Using cached data - could not fetch from Stripe'
      });
    }
    
    // Update database with current Stripe status
    const currentStatus = {
      chargesEnabled: stripeAccount.charges_enabled,
      payoutsEnabled: stripeAccount.payouts_enabled,
      detailsSubmitted: stripeAccount.details_submitted,
      onboardingCompleted: stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted
    };

    // Only add businessProfile if the column exists
    if (stripeAccount.business_profile) {
      currentStatus.businessProfile = stripeAccount.business_profile;
    }
    
    // Only update if status has changed
    const statusChanged = (
      dbAccount.charges_enabled !== stripeAccount.charges_enabled ||
      dbAccount.payouts_enabled !== stripeAccount.payouts_enabled ||
      dbAccount.details_submitted !== stripeAccount.details_submitted
    );
    
    if (statusChanged) {
      console.log(`Status changed for ${coachId}, updating database...`);
      await updateCoachAccountStatus(coachId, currentStatus);
    }
    
    const finalStatus = {
      success: true,
      account: {
        coachId: dbAccount.coach_id,
        stripeAccountId: dbAccount.stripe_account_id,
        accountType: dbAccount.account_type,
        country: dbAccount.country,
        email: dbAccount.email,
        chargesEnabled: stripeAccount.charges_enabled,
        payoutsEnabled: stripeAccount.payouts_enabled,
        detailsSubmitted: stripeAccount.details_submitted,
        onboardingCompleted: stripeAccount.charges_enabled && stripeAccount.payouts_enabled && stripeAccount.details_submitted,
        businessProfile: stripeAccount.business_profile || null,
        createdAt: dbAccount.created_at,
        updatedAt: new Date().toISOString()
      }
    };
    
    console.log(`📤 Final response for ${coachId}:`, {
      chargesEnabled: finalStatus.account.chargesEnabled,
      payoutsEnabled: finalStatus.account.payoutsEnabled,
      detailsSubmitted: finalStatus.account.detailsSubmitted,
      onboardingCompleted: finalStatus.account.onboardingCompleted
    });
    
    res.json(finalStatus);

  } catch (err) {
    console.error('Error retrieving coach account status:', err.message);
    res.status(500).json({
      error: 'Failed to retrieve coach account status',
      message: err.message
    });
  }
});

/**
 * GET /api/connect/coaches/list
 * List all coach accounts (for debugging)
 */
router.get('/coaches/list', async (req, res) => {
  try {
    console.log('📋 Listing all coach accounts...');
    
    // Get all coach accounts from database
    const { data: accounts, error } = await supabase
      .from('coach_connect_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Database error:', error.message);
      return res.status(500).json({
        error: 'Database error',
        message: error.message
      });
    }
    
    console.log(`📊 Found ${accounts.length} coach accounts`);
    
    res.json({
      success: true,
      count: accounts.length,
      accounts: accounts.map(account => ({
        coach_id: account.coach_id,
        stripe_account_id: account.stripe_account_id,
        email: account.email,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
        onboarding_completed: account.onboarding_completed,
        created_at: account.created_at
      }))
    });

  } catch (err) {
    console.error('Error listing coach accounts:', err.message);
    res.status(500).json({
      error: 'Failed to list coach accounts',
      message: err.message
    });
  }
});

module.exports = router;
