const express = require('express');
const { verifyWebhookSignature, stripe } = require('../config/stripe');
const { 
  saveCoachingSession, 
  updateCoachAccountStatus, 
  saveTransfer, 
  updateTransferStatus,
  getCoachConnectAccountId,
  createConversation,
  findOrUpdateConversation,
  addMessageToConversation
} = require('../services/database');

const router = express.Router();

// Middleware to capture raw body for webhook signature verification
router.use('/stripe', express.raw({ type: 'application/json' }));

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post('/stripe', async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const payload = req.body;

    if (!signature) {
      console.error('Missing Stripe signature header');
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify webhook signature
    let event;
    try {
      event = verifyWebhookSignature(payload, signature);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    console.log(`Received webhook event: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object);
        break;

      case 'account.updated':
        await handleAccountUpdated(event.data.object);
        break;

      case 'account.application.deauthorized':
        await handleAccountDeauthorized(event.data.object);
        break;

      case 'transfer.created':
        await handleTransferCreated(event.data.object);
        break;

      case 'transfer.updated':
        await handleTransferUpdated(event.data.object);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    console.log(`Payment succeeded: ${paymentIntent.id}`);
    
    const {
      coachId,
      coachName,
      sport,
      packageType,
      packageId,
      transferAmount,
      coachAmount,
      platformFee,
      paymentType,
      playerId,
      playerName
    } = paymentIntent.metadata;

    // For destination charges, use coachAmount instead of transferAmount
    const actualTransferAmount = transferAmount || coachAmount;

    // Calculate session expiry
    const sessionExpiry = new Date();
    sessionExpiry.setDate(sessionExpiry.getDate() + parseInt(paymentIntent.metadata.days));

    // Get clips from payment intent metadata
    const clipsFromMetadata = paymentIntent.metadata.clips;
    let clipsRemaining = parseInt(clipsFromMetadata);
    
    console.log(`\n📦 [webhook] Package information:`);
    console.log(`   - packageId from metadata: ${packageId}`);
    console.log(`   - packageType: ${packageType}`);
    console.log(`   - sport: ${sport}`);
    console.log(`   - clips from paymentIntent.metadata.clips: "${clipsFromMetadata}"`);
    console.log(`   - clipsRemaining (parsed): ${clipsRemaining}`);
    console.log(`   - paymentIntent.metadata:`, JSON.stringify(paymentIntent.metadata, null, 2));
    
    // Verify clips value makes sense
    if (isNaN(clipsRemaining) || clipsRemaining <= 0) {
      console.error(`❌ [webhook] Invalid clips value: ${clipsRemaining} from metadata "${clipsFromMetadata}"`);
      // Try to get clips from package info as fallback
      const { getPackageInfo } = require('../config/stripe');
      try {
        const packageInfo = getPackageInfo(sport, packageType, packageId);
        console.log(`   Using fallback: Getting clips from packageInfo: ${packageInfo.clips}`);
        clipsRemaining = packageInfo.clips;
      } catch (pkgError) {
        console.error(`   Fallback also failed:`, pkgError);
        throw new Error(`Invalid clips value: ${clipsFromMetadata}. Could not determine package clips.`);
      }
    }
    
    console.log(`   ✅ Final clipsRemaining value: ${clipsRemaining}`);

    // Create coaching session data
    const sessionData = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      paymentIntentId: paymentIntent.id,
      coachId,
      coachName,
      sport,
      packageType,
      packageId,
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
    try {
      await saveCoachingSession(sessionData);
      console.log('✅ Coaching session saved to database:', sessionData.id);
      console.log('   Session details:', {
        id: sessionData.id,
        coachId: sessionData.coachId,
        clipsRemaining: sessionData.clipsRemaining,
        status: sessionData.status,
        sessionExpiry: sessionData.sessionExpiry
      });
    } catch (saveError) {
      console.error('❌ ERROR: Failed to save coaching session to database:', saveError);
      console.error('   Session data that failed to save:', sessionData);
      throw saveError; // Re-throw to prevent conversation creation if session save fails
    }

    // Find or update DM conversation between player and coach
    // If conversation already exists (e.g., player purchasing new package), update its session_id
    // This will reset the chat expiration countdown
    try {
      // Use player information from payment intent metadata
      const actualPlayerId = playerId || `player_${paymentIntent.customer || 'unknown'}`;
      const actualPlayerName = playerName || 'Player';
      
      // Skip conversation creation for temp users
      if (actualPlayerId === 'temp_user' || actualPlayerId === 'temp_player') {
        console.log('Skipping conversation creation for temp user:', actualPlayerId);
        return;
      }
      
      const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const conversationData = {
        id: conversationId,
        playerId: actualPlayerId,
        playerName: actualPlayerName,
        coachId: coachId,
        coachName: coachName,
        sport: sport,
        sessionId: sessionData.id,
        lastMessage: null,
        lastMessageAt: null
      };

      const conversation = await findOrUpdateConversation(conversationData);
      console.log('✅ Conversation found or updated:', conversation.id);
      if (conversation.id === conversationId) {
        console.log('   → New conversation created');
      } else {
        console.log('   → Existing conversation updated with new session_id');
        console.log('   → Chat expiration countdown has been reset');
      }

      // Note: Welcome message is now handled by the frontend to avoid duplicates

    } catch (conversationError) {
      console.error('Error finding/updating DM conversation:', conversationError);
      // Don't fail the entire payment process if conversation update fails
    }

    // Handle payment distribution based on payment type
    if (paymentType === 'destination_charge') {
      // For destination charges, the money goes directly to the coach
      // No additional transfer needed, but we should log this
      console.log(`Destination charge completed: ${paymentIntent.amount} (${coachAmount} to coach, ${platformFee} platform fee)`);
      
      // Save transfer record for tracking
      await saveTransfer({
        transferId: `dest_${paymentIntent.id}`,
        paymentIntentId: paymentIntent.id,
        coachId,
        coachAccountId: paymentIntent.transfer_data?.destination,
        amount: parseInt(coachAmount),
        currency: paymentIntent.currency,
        platformFee: parseInt(platformFee),
        status: 'completed',
        description: `Destination charge for ${coachName}`,
        metadata: {
          paymentType: 'destination_charge',
          sessionId: sessionData.id
        }
      });
      
    } else {
      // For regular payments, create a transfer to the coach
      if (coachId && actualTransferAmount) {
        const coachAccountId = await getCoachConnectAccountId(coachId);
        
        if (coachAccountId) {
          try {
            const transfer = await stripe.transfers.create({
              amount: parseInt(actualTransferAmount),
              currency: 'cad',
              destination: coachAccountId,
              source_transaction: paymentIntent.id,
              description: `Coaching session payment for ${coachName}`,
              metadata: {
                paymentIntentId: paymentIntent.id,
                coachId,
                sessionId: sessionData.id
              }
            });
            
            // Save transfer record
            await saveTransfer({
              transferId: transfer.id,
              paymentIntentId: paymentIntent.id,
              coachId,
              coachAccountId,
              amount: transfer.amount,
              currency: transfer.currency,
              platformFee: parseInt(platformFee || '0'),
              status: transfer.status,
              description: transfer.description,
              metadata: {
                sessionId: sessionData.id
              }
            });
            
            console.log(`Transfer created: ${transfer.id} for coach ${coachName}`);
          } catch (transferError) {
            console.error('Failed to create transfer:', transferError);
            // TODO: Handle transfer failure (maybe retry later)
          }
        }
      }
    }

    // TODO: Send notification to coach about new session
    // TODO: Send confirmation email to player

  } catch (err) {
    console.error('Error handling payment success:', err);
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    console.log(`Payment failed: ${paymentIntent.id}`);
    
    const { coachId, coachName } = paymentIntent.metadata;
    
    // TODO: Log failed payment
    // TODO: Send notification to player about failed payment
    // TODO: Maybe send notification to coach about failed payment
    
  } catch (err) {
    console.error('Error handling payment failure:', err);
  }
}

/**
 * Handle canceled payment intent
 */
async function handlePaymentIntentCanceled(paymentIntent) {
  try {
    console.log(`Payment canceled: ${paymentIntent.id}`);
    
    // TODO: Handle canceled payment
    // TODO: Maybe send notification to player
    
  } catch (err) {
    console.error('Error handling payment cancellation:', err);
  }
}

/**
 * Handle Connect account updates
 */
async function handleAccountUpdated(account) {
  try {
    console.log(`Connect account updated: ${account.id}`);
    
    // Update coach's account status in database
    const updates = {
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      onboardingCompleted: account.charges_enabled && account.payouts_enabled && account.details_submitted,
      businessProfile: account.business_profile
    };
    
    // Find coach by stripe account ID and update
    // Note: In a real implementation, you'd query by stripe_account_id
    // For now, we'll use the metadata from the account
    const coachId = account.metadata?.coachId;
    if (coachId) {
      await updateCoachAccountStatus(coachId, updates);
      console.log(`Updated account status for coach ${coachId}:`, updates);
    }
    
    // TODO: Send notification if account is now fully activated
    
  } catch (err) {
    console.error('Error handling account update:', err);
  }
}

/**
 * Handle Connect account deauthorization
 */
async function handleAccountDeauthorized(account) {
  try {
    console.log(`Connect account deauthorized: ${account.id}`);
    
    // TODO: Update coach's account status in database
    // TODO: Disable coach's ability to receive payments
    // TODO: Send notification to coach
    
  } catch (err) {
    console.error('Error handling account deauthorization:', err);
  }
}

/**
 * Handle transfer creation
 */
async function handleTransferCreated(transfer) {
  try {
    console.log(`Transfer created: ${transfer.id}`);
    
    // Update transfer status in database
    await updateTransferStatus(transfer.id, transfer.status, {
      amount: transfer.amount,
      currency: transfer.currency,
      description: transfer.description
    });
    
    // TODO: Send notification to coach about incoming payment
    
  } catch (err) {
    console.error('Error handling transfer creation:', err);
  }
}

/**
 * Handle transfer updates
 */
async function handleTransferUpdated(transfer) {
  try {
    console.log(`Transfer updated: ${transfer.id}, status: ${transfer.status}`);
    
    // Update transfer status in database
    await updateTransferStatus(transfer.id, transfer.status);
    
    // Handle failed transfers
    if (transfer.status === 'failed') {
      console.error(`Transfer failed: ${transfer.id}`, transfer.failure_code, transfer.failure_message);
      // TODO: Handle failed transfers (maybe retry or notify coach)
    }
    
  } catch (err) {
    console.error('Error handling transfer update:', err);
  }
}

/**
 * Handle successful payout
 */
async function handlePayoutPaid(payout) {
  try {
    console.log(`Payout paid: ${payout.id}, amount: ${payout.amount}`);
    
    // TODO: Log successful payout in database
    // TODO: Send notification to coach about successful payout
    
  } catch (err) {
    console.error('Error handling payout success:', err);
  }
}

/**
 * Handle failed payout
 */
async function handlePayoutFailed(payout) {
  try {
    console.log(`Payout failed: ${payout.id}`);
    
    // TODO: Log failed payout in database
    // TODO: Send notification to coach about failed payout
    // TODO: Maybe retry payout or investigate issue
    
  } catch (err) {
    console.error('Error handling payout failure:', err);
  }
}

/**
 * Handle successful invoice payment (for subscriptions)
 */
async function handleInvoicePaymentSucceeded(invoice) {
  try {
    console.log(`Invoice payment succeeded: ${invoice.id}`);
    
    // TODO: Handle successful subscription payment
    // TODO: Extend coaching session or create new session
    
  } catch (err) {
    console.error('Error handling invoice payment success:', err);
  }
}

/**
 * Handle failed invoice payment (for subscriptions)
 */
async function handleInvoicePaymentFailed(invoice) {
  try {
    console.log(`Invoice payment failed: ${invoice.id}`);
    
    // TODO: Handle failed subscription payment
    // TODO: Maybe suspend coaching session
    // TODO: Send notification to player
    
  } catch (err) {
    console.error('Error handling invoice payment failure:', err);
  }
}

// Note: getCoachConnectAccountId is now imported from database service

module.exports = {
  router,
  handlePaymentIntentSucceeded
};
