const express = require('express');
const Joi = require('joi');
const { stripe, getPackageInfo, calculatePlatformFee, calculateTransferAmount, DEFAULT_CURRENCY } = require('../config/stripe');
const { getCoachConnectAccountId, saveCoachingSession, saveTransfer } = require('../services/database');

const router = express.Router();

// Validation schemas
const createPaymentIntentSchema = Joi.object({
  coachId: Joi.string().required(),
  coachName: Joi.string().required(),
  sport: Joi.string().valid('badminton', 'golf').required(),
  packageType: Joi.string().valid('package', 'subscription').required(),
  packageId: Joi.when('packageType', {
    is: 'package',
    then: Joi.number().valid(1, 2, 3).required(),
    otherwise: Joi.optional()
  }),
  customerEmail: Joi.string().email().optional(),
  customerName: Joi.string().optional(),
  playerId: Joi.string().optional(),
  playerName: Joi.string().optional()
});

const confirmPaymentSchema = Joi.object({
  paymentIntentId: Joi.string().required(),
  sessionData: Joi.object({
    coachId: Joi.string().required(),
    coachName: Joi.string().required(),
    sport: Joi.string().required(),
    packageType: Joi.string().required(),
    packageId: Joi.number().optional()
  }).required()
});

const createCheckoutSessionSchema = Joi.object({
  coachId: Joi.string().required(),
  coachName: Joi.string().required(),
  sport: Joi.string().valid('badminton', 'golf').required(),
  packageType: Joi.string().valid('package', 'subscription').required(),
  packageId: Joi.when('packageType', {
    is: 'package',
    then: Joi.number().valid(1, 2, 3).required(),
    otherwise: Joi.optional()
  }),
  customerEmail: Joi.string().email().optional(),
  customerName: Joi.string().optional(),
  playerId: Joi.string().optional(),
  playerName: Joi.string().optional()
});

/**
 * POST /api/payments/create-intent
 * Create a payment intent for a coaching package
 */
router.post('/create-intent', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createPaymentIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { coachId, coachName, sport, packageType, packageId, customerEmail, customerName, playerId, playerName } = value;

    // Get package information
    const packageInfo = getPackageInfo(sport, packageType, packageId);
    
    // Create or retrieve customer
    let customer;
    if (customerEmail) {
      try {
        // Try to find existing customer
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });
        
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
        } else {
          // Create new customer
          customer = await stripe.customers.create({
            email: customerEmail,
            name: customerName,
            metadata: {
              coachId,
              sport
            }
          });
        }
      } catch (err) {
        console.error('Error handling customer:', err);
        // Continue without customer if there's an error
      }
    }

    // Create payment intent
    let paymentIntent;
    
    // Check if we have valid Stripe keys
    if (process.env.STRIPE_SECRET_KEY && (process.env.STRIPE_SECRET_KEY.includes('sk_test_') || process.env.STRIPE_SECRET_KEY.includes('sk_live_')) && !process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here')) {
      // Use real Stripe API
      paymentIntent = await stripe.paymentIntents.create({
        amount: packageInfo.price,
        currency: DEFAULT_CURRENCY,
        customer: customer?.id,
        metadata: {
          coachId,
          coachName,
          sport,
          packageType,
          packageId: packageId?.toString() || 'subscription',
          packagePrice: packageInfo.price.toString(),
          clips: packageInfo.clips.toString(),
          days: packageInfo.days.toString(),
          platformFee: calculatePlatformFee(packageInfo.price).toString(),
          transferAmount: calculateTransferAmount(packageInfo.price).toString(),
          playerId: playerId === 'temp_user' ? null : playerId,
          playerName: playerName === 'Player' ? null : playerName
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `${packageType === 'subscription' ? 'Monthly subscription' : `${packageInfo.clips} clips package`} with ${coachName} for ${sport}`,
      });
    } else {
      // Use mock payment intent for development
      console.log('Using mock payment intent for development');
      paymentIntent = {
        id: `pi_mock_${Date.now()}`,
        client_secret: `pi_mock_${Date.now()}_secret_mock`,
        amount: packageInfo.price,
        currency: DEFAULT_CURRENCY,
        status: 'requires_payment_method',
        metadata: {
          coachId,
          coachName,
          sport,
          packageType,
          packageId: packageId?.toString() || 'subscription',
          packagePrice: packageInfo.price.toString(),
          clips: packageInfo.clips.toString(),
          days: packageInfo.days.toString(),
          platformFee: calculatePlatformFee(packageInfo.price).toString(),
          transferAmount: calculateTransferAmount(packageInfo.price).toString(),
          playerId: playerId === 'temp_user' ? null : playerId,
          playerName: playerName === 'Player' ? null : playerName
        }
      };
    }

    console.log(`Payment intent created: ${paymentIntent.id} for ${coachName}`);

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      },
      packageInfo: {
        clips: packageInfo.clips,
        days: packageInfo.days,
        price: packageInfo.price
      }
    });

  } catch (err) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({
      error: 'Failed to create payment intent',
      message: err.message
    });
  }
});

/**
 * POST /api/payments/confirm
 * Confirm payment and create coaching session
 */
router.post('/confirm', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = confirmPaymentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { paymentIntentId, sessionData } = value;

    // Retrieve payment intent to verify it was successful
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not successful',
        status: paymentIntent.status
      });
    }

    // Create coaching session data
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + parseInt(paymentIntent.metadata.days));

    const coachingSession = {
      id: sessionId,
      paymentIntentId,
      coachId: sessionData.coachId,
      coachName: sessionData.coachName,
      sport: sessionData.sport,
      packageType: sessionData.packageType,
      packageId: sessionData.packageId,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      clipsRemaining: parseInt(paymentIntent.metadata.clips),
      clipsUploaded: 0,
      sessionExpiry: sessionExpiry.toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      messages: []
    };

    // In a real app, you would save this to your database
    // For now, we'll just return the session data
    console.log(`Coaching session created: ${sessionId} for ${sessionData.coachName}`);

    res.json({
      success: true,
      session: coachingSession,
      message: 'Payment confirmed and coaching session created'
    });

  } catch (err) {
    console.error('Error confirming payment:', err);
    res.status(500).json({
      error: 'Failed to confirm payment',
      message: err.message
    });
  }
});

/**
 * GET /api/payments/intent/:id
 * Retrieve payment intent status
 */
router.get('/intent/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const paymentIntent = await stripe.paymentIntents.retrieve(id);
    
    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      }
    });

  } catch (err) {
    console.error('Error retrieving payment intent:', err);
    res.status(500).json({
      error: 'Failed to retrieve payment intent',
      message: err.message
    });
  }
});

/**
 * POST /api/payments/refund
 * Create a refund for a payment
 */
router.post('/refund', async (req, res) => {
  try {
    const { paymentIntentId, reason, amount } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Payment intent ID is required'
      });
    }

    const refundData = {
      payment_intent: paymentIntentId,
      reason: reason || 'requested_by_customer'
    };

    if (amount) {
      refundData.amount = amount;
    }

    const refund = await stripe.refunds.create(refundData);

    console.log(`Refund created: ${refund.id} for payment intent ${paymentIntentId}`);

    res.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
        reason: refund.reason
      }
    });

  } catch (err) {
    console.error('Error creating refund:', err);
    res.status(500).json({
      error: 'Failed to create refund',
      message: err.message
    });
  }
});

/**
 * POST /api/payments/create-destination-charge
 * Create a payment intent with destination charges (direct payment to coach)
 */
router.post('/create-destination-charge', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createPaymentIntentSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { coachId, coachName, sport, packageType, packageId, customerEmail, customerName, playerId, playerName } = value;

    // Get package information
    const packageInfo = getPackageInfo(sport, packageType, packageId);
    
    // Get coach's Connect account ID
    console.log(`Looking up Connect account for coachId: ${coachId}`);
    const coachAccountId = await getCoachConnectAccountId(coachId);
    console.log(`Found coach account ID: ${coachAccountId}`);
    
    if (!coachAccountId) {
      console.log(`No Connect account found for coach: ${coachId}`);
      return res.status(400).json({
        error: 'Coach not ready for payments',
        message: 'Coach has not completed Stripe Connect setup'
      });
    }

    // Create or retrieve customer
    let customer;
    if (customerEmail) {
      try {
        const existingCustomers = await stripe.customers.list({
          email: customerEmail,
          limit: 1
        });
        
        if (existingCustomers.data.length > 0) {
          customer = existingCustomers.data[0];
        } else {
          customer = await stripe.customers.create({
            email: customerEmail,
            name: customerName,
            metadata: {
              coachId,
              sport
            }
          });
        }
      } catch (err) {
        console.error('Error handling customer:', err);
      }
    }

    // Calculate platform fee
    const platformFee = calculatePlatformFee(packageInfo.price);
    const coachAmount = calculateTransferAmount(packageInfo.price);

    // Create payment intent with destination charges
    let paymentIntent;
    
    if (process.env.STRIPE_SECRET_KEY && 
        (process.env.STRIPE_SECRET_KEY.includes('sk_test_') || process.env.STRIPE_SECRET_KEY.includes('sk_live_')) && 
        !process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here')) {
      
      paymentIntent = await stripe.paymentIntents.create({
        amount: packageInfo.price,
        currency: DEFAULT_CURRENCY,
        customer: customer?.id,
        application_fee_amount: platformFee, // Platform fee
        transfer_data: {
          destination: coachAccountId, // Direct payment to coach
        },
        metadata: {
          coachId,
          coachName,
          sport,
          packageType,
          packageId: packageId?.toString() || 'subscription',
          packagePrice: packageInfo.price.toString(),
          clips: packageInfo.clips.toString(),
          days: packageInfo.days.toString(),
          platformFee: platformFee.toString(),
          coachAmount: coachAmount.toString(),
          paymentType: 'destination_charge',
          playerId: playerId === 'temp_user' ? null : playerId,
          playerName: playerName === 'Player' ? null : playerName
        },
        automatic_payment_methods: {
          enabled: true,
        },
        description: `${packageType === 'subscription' ? 'Monthly subscription' : `${packageInfo.clips} clips package`} with ${coachName} for ${sport}`,
      });
    } else {
      // Mock payment intent for development
      console.log('Using mock destination charge for development');
      paymentIntent = {
        id: `pi_mock_dest_${Date.now()}`,
        client_secret: `pi_mock_dest_${Date.now()}_secret_mock`,
        amount: packageInfo.price,
        currency: DEFAULT_CURRENCY,
        status: 'requires_payment_method',
        metadata: {
          coachId,
          coachName,
          sport,
          packageType,
          packageId: packageId?.toString() || 'subscription',
          packagePrice: packageInfo.price.toString(),
          clips: packageInfo.clips.toString(),
          days: packageInfo.days.toString(),
          platformFee: platformFee.toString(),
          coachAmount: coachAmount.toString(),
          paymentType: 'destination_charge',
          playerId: playerId === 'temp_user' ? null : playerId,
          playerName: playerName === 'Player' ? null : playerName
        }
      };
    }

    console.log(`Destination charge created: ${paymentIntent.id} for ${coachName} (${coachAmount} to coach, ${platformFee} platform fee)`);

    res.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status
      },
      packageInfo: {
        clips: packageInfo.clips,
        days: packageInfo.days,
        price: packageInfo.price
      },
      feeBreakdown: {
        totalAmount: packageInfo.price,
        platformFee: platformFee,
        coachAmount: coachAmount
      }
    });

  } catch (err) {
    console.error('Error creating destination charge:', err);
    res.status(500).json({
      error: 'Failed to create destination charge',
      message: err.message
    });
  }
});

/**
 * POST /api/payments/create-checkout-session
 * Create a Stripe Checkout session for redirecting to Stripe's checkout page
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = createCheckoutSessionSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const {
      coachId,
      coachName,
      sport,
      packageType,
      packageId,
      customerEmail,
      customerName,
      playerId,
      playerName,
    } = value;

    console.log('Creating checkout session with data:', value);

    // Get package information
    const packageInfo = getPackageInfo(sport, packageType, packageId);
    if (!packageInfo) {
      return res.status(400).json({
        error: 'Invalid package configuration'
      });
    }

    // Check if we have valid Stripe keys (force test mode for development)
    if (process.env.STRIPE_SECRET_KEY && 
        process.env.STRIPE_SECRET_KEY.includes('sk_test_') && 
        !process.env.STRIPE_SECRET_KEY.includes('your_stripe_secret_key_here')) {
      
      // Create Stripe Checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: DEFAULT_CURRENCY,
              product_data: {
                name: `${packageInfo.clips} clips package with ${coachName}`,
                description: `${packageType === 'subscription' ? 'Monthly subscription' : `${packageInfo.clips} clips package`} with ${coachName} for ${sport}`,
                images: [], // You can add product images here
              },
              unit_amount: packageInfo.price,
            },
            quantity: 1,
          },
        ],
        mode: packageType === 'subscription' ? 'subscription' : 'payment',
        success_url: `http://192.168.1.79:3001/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://192.168.1.79:3001/payment-cancel`,
        customer_email: customerEmail,
        metadata: {
          coachId,
          coachName,
          sport,
          packageType,
          packageId: packageId?.toString() || 'subscription',
          packagePrice: packageInfo.price.toString(),
          clips: packageInfo.clips.toString(),
          days: packageInfo.days.toString(),
          platformFee: calculatePlatformFee(packageInfo.price).toString(),
          transferAmount: calculateTransferAmount(packageInfo.price).toString(),
          playerId: playerId === 'temp_user' ? null : playerId,
          playerName: playerName === 'Player' ? null : playerName
        },
        // For subscriptions, you would add subscription_data here
        ...(packageType === 'subscription' && {
          subscription_data: {
            metadata: {
              coachId,
              coachName,
              sport,
              packageType: 'subscription'
            }
          }
        })
      });

      console.log('Checkout session created:', session.id);
      res.json({ 
        sessionId: session.id,
        url: session.url 
      });

    } else {
      // Mock checkout session for development
      console.log('Using mock checkout session for development');
      const mockSession = {
        id: `cs_mock_${Date.now()}`,
        url: `https://checkout.stripe.com/mock/${Date.now()}`,
        metadata: {
          coachId,
          coachName,
          sport,
          packageType,
          packageId: packageId?.toString() || 'subscription',
          packagePrice: packageInfo.price.toString(),
          clips: packageInfo.clips.toString(),
          days: packageInfo.days.toString(),
          platformFee: calculatePlatformFee(packageInfo.price).toString(),
          transferAmount: calculateTransferAmount(packageInfo.price).toString(),
          playerId: playerId === 'temp_user' ? null : playerId,
          playerName: playerName === 'Player' ? null : playerName
        }
      };

      res.json({ 
        sessionId: mockSession.id,
        url: mockSession.url,
        isMock: true
      });
    }

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: 'Failed to create checkout session',
      message: error.message
    });
  }
});

module.exports = router;
