const express = require('express');
const Joi = require('joi');
const { stripe, getPackageInfo, calculatePlatformFee, calculateTransferAmount, DEFAULT_CURRENCY } = require('../config/stripe');
const { getCoachConnectAccountId, saveCoachingSession, saveTransfer, findOrUpdateConversation } = require('../services/database');

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

    console.log(`\n📦 [create-intent] Package selection received:`);
    console.log(`   - packageId: ${packageId}`);
    console.log(`   - packageType: ${packageType}`);
    console.log(`   - sport: ${sport}`);
    
    // Get package information
    const packageInfo = getPackageInfo(sport, packageType, packageId);
    
    console.log(`   - packageInfo.clips: ${packageInfo.clips}`);
    console.log(`   - packageInfo.price: ${packageInfo.price}`);
    console.log(`   - packageInfo.days: ${packageInfo.days}`);
    
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

    // IMPORTANT: Use payment intent metadata as the source of truth, not sessionData
    // The payment intent was created with specific package info, so we should use that
    const metadataPackageId = paymentIntent.metadata.packageId;
    const metadataSport = paymentIntent.metadata.sport || sessionData.sport;
    const metadataPackageType = paymentIntent.metadata.packageType || sessionData.packageType;
    
    // Get clips from payment intent metadata
    const clipsFromMetadata = paymentIntent.metadata.clips;
    let clipsRemaining = parseInt(clipsFromMetadata);
    
    console.log(`\n📦 [confirm] Package information:`);
    console.log(`   - packageId from sessionData (frontend): ${sessionData.packageId}`);
    console.log(`   - packageId from paymentIntent.metadata (source of truth): ${metadataPackageId}`);
    console.log(`   - packageType: ${metadataPackageType}`);
    console.log(`   - sport: ${metadataSport}`);
    console.log(`   - clips from paymentIntent.metadata.clips: "${clipsFromMetadata}"`);
    console.log(`   - clipsRemaining (parsed): ${clipsRemaining}`);
    console.log(`   - paymentIntent.metadata:`, JSON.stringify(paymentIntent.metadata, null, 2));
    
    // Warn if there's a mismatch between frontend and payment intent
    if (sessionData.packageId && sessionData.packageId.toString() !== metadataPackageId) {
      console.warn(`⚠️ [confirm] WARNING: Package ID mismatch!`);
      console.warn(`   Frontend sent packageId: ${sessionData.packageId}`);
      console.warn(`   Payment intent has packageId: ${metadataPackageId}`);
      console.warn(`   Using payment intent metadata as source of truth (packageId: ${metadataPackageId}, clips: ${clipsRemaining})`);
    }
    
    // Verify clips value makes sense
    if (isNaN(clipsRemaining) || clipsRemaining <= 0) {
      console.error(`❌ [confirm] Invalid clips value: ${clipsRemaining} from metadata "${clipsFromMetadata}"`);
      // Try to get clips from package info as fallback using metadata packageId
      const { getPackageInfo } = require('../config/stripe');
      try {
        const packageInfo = getPackageInfo(metadataSport, metadataPackageType, metadataPackageId);
        console.log(`   Using fallback: Getting clips from packageInfo for packageId ${metadataPackageId}: ${packageInfo.clips}`);
        clipsRemaining = packageInfo.clips;
      } catch (pkgError) {
        console.error(`   Fallback also failed:`, pkgError);
        // Last resort: try with sessionData packageId
        try {
          const packageInfo = getPackageInfo(sessionData.sport, sessionData.packageType, sessionData.packageId);
          console.log(`   Using sessionData fallback: Getting clips from packageInfo for packageId ${sessionData.packageId}: ${packageInfo.clips}`);
          clipsRemaining = packageInfo.clips;
        } catch (finalError) {
          console.error(`   All fallbacks failed:`, finalError);
          throw new Error(`Invalid clips value: ${clipsFromMetadata}. Could not determine package clips.`);
        }
      }
    }
    
    console.log(`   ✅ Final clipsRemaining value: ${clipsRemaining}`);

    // Use metadata values as source of truth for package info
    const coachingSessionData = {
      id: sessionId,
      paymentIntentId,
      coachId: paymentIntent.metadata.coachId || sessionData.coachId,
      coachName: paymentIntent.metadata.coachName || sessionData.coachName,
      sport: metadataSport,
      packageType: metadataPackageType,
      packageId: metadataPackageId, // Use metadata packageId, not sessionData
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      clipsRemaining: clipsRemaining,
      clipsUploaded: 0,
      sessionExpiry: sessionExpiry.toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
      messages: []
    };

    // Save coaching session to database
    console.log(`\n💾 [confirm] ==========================================`);
    console.log(`💾 [confirm] Attempting to save coaching session: ${sessionId} for ${sessionData.coachName}`);
    console.log(`💾 [confirm] Session data:`, JSON.stringify(coachingSessionData, null, 2));
    console.log(`💾 [confirm] ==========================================\n`);
    
    try {
      const savedSession = await saveCoachingSession(coachingSessionData);
      console.log(`\n✅ [confirm] ==========================================`);
      console.log(`✅ [confirm] Coaching session saved to database: ${sessionId}`);
      console.log(`✅ [confirm] Saved session ID: ${savedSession.id}`);
      console.log(`✅ [confirm] ==========================================\n`);
      
      // Verify the session was actually saved by trying to retrieve it
      try {
        const { getCoachingSession } = require('../services/database');
        const verifySession = await getCoachingSession(sessionId);
        if (verifySession) {
          console.log(`✅ [confirm] Verified: Session exists in database with ${verifySession.clips_remaining} clips remaining`);
        } else {
          console.error(`❌ [confirm] WARNING: Session was saved but cannot be retrieved!`);
        }
      } catch (verifyError) {
        console.error(`❌ [confirm] Error verifying session:`, verifyError);
      }
      
      // Create or update conversation between player and coach
      // This ensures conversations are always created, even if webhooks fail
      try {
        const { playerId, playerName } = paymentIntent.metadata;
        const actualPlayerId = playerId || `player_${paymentIntent.customer || 'unknown'}`;
        const actualPlayerName = playerName || 'Player';
        
        console.log(`\n💬 [confirm] Attempting to create/update conversation:`);
        console.log(`   - playerId: ${actualPlayerId}`);
        console.log(`   - playerName: ${actualPlayerName}`);
        console.log(`   - coachId: ${paymentIntent.metadata.coachId}`);
        console.log(`   - sessionId: ${sessionId}`);
        
        // Skip conversation creation for temp users
        if (actualPlayerId !== 'temp_user' && actualPlayerId !== 'temp_player') {
          const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          const conversationData = {
            id: conversationId,
            playerId: actualPlayerId,
            playerName: actualPlayerName,
            coachId: paymentIntent.metadata.coachId,
            coachName: paymentIntent.metadata.coachName,
            sport: metadataSport,
            sessionId: sessionId,
            lastMessage: null,
            lastMessageAt: null
          };
          
          const conversation = await findOrUpdateConversation(conversationData);
          console.log(`\n✅ [confirm] ==========================================`);
          console.log(`✅ [confirm] Conversation created/updated: ${conversation.id}`);
          if (conversation.id === conversationId) {
            console.log(`✅ [confirm]   → New conversation created`);
          } else {
            console.log(`✅ [confirm]   → Existing conversation updated with new session_id`);
            console.log(`✅ [confirm]   → Chat expiration countdown has been reset`);
          }
          console.log(`✅ [confirm] ==========================================\n`);
        } else {
          console.log(`⚠️ [confirm] Skipping conversation creation for temp user: ${actualPlayerId}`);
        }
      } catch (conversationError) {
        console.error('\n❌ [confirm] ==========================================');
        console.error('❌ [confirm] Error creating/updating conversation:', conversationError);
        console.error('❌ [confirm] Error message:', conversationError.message);
        console.error('❌ [confirm] Error stack:', conversationError.stack);
        console.error('❌ [confirm] ==========================================\n');
        // Don't fail payment confirmation if conversation creation fails
      }
      
      res.json({
        success: true,
        session: savedSession,
        message: 'Payment confirmed and coaching session created'
      });
    } catch (saveError) {
      console.error('\n❌ [confirm] ==========================================');
      console.error('❌ [confirm] FAILED to save coaching session:', saveError);
      console.error('❌ [confirm] Error message:', saveError.message);
      console.error('❌ [confirm] Error stack:', saveError.stack);
      console.error('❌ [confirm] ==========================================\n');
      
      // Return error response so frontend knows the save failed
      res.status(500).json({
        success: false,
        error: 'Failed to save coaching session to database',
        message: saveError.message,
        session: coachingSessionData // Still return session data for reference
      });
    }

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

    console.log(`\n📦 [create-destination-charge] Package selection received:`);
    console.log(`   - packageId: ${packageId} (type: ${typeof packageId})`);
    console.log(`   - packageType: ${packageType}`);
    console.log(`   - sport: ${sport}`);
    
    // Get package information
    const packageInfo = getPackageInfo(sport, packageType, packageId);
    
    console.log(`   - packageInfo.clips: ${packageInfo.clips}`);
    console.log(`   - packageInfo.price: ${packageInfo.price}`);
    console.log(`   - packageInfo.days: ${packageInfo.days}`);
    
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
          clips: packageInfo.clips.toString(), // Use clips from packageInfo, not from metadata
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
