const express = require('express');
const Joi = require('joi');
const { 
  getConversations, 
  getConversation, 
  addMessageToConversation, 
  getConversationMessages,
  markConversationAsRead,
  createConversation,
  getRemainingClipsForConversation,
  decrementClipsForConversation,
  checkChatExpiry,
  getRemainingDailyMessagesForConversation,
  canPlayerSendMessageToday
} = require('../services/database');

const router = express.Router();

// Test endpoint for connection testing
router.get('/test/player', (req, res) => {
  res.json({
    success: true,
    message: 'Conversation service is working',
    timestamp: new Date().toISOString(),
    serverInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  });
});

// Validation schemas
const getConversationsSchema = Joi.object({
  userId: Joi.string().required(),
  userType: Joi.string().valid('player', 'coach').required()
});

const addMessageSchema = Joi.object({
  conversationId: Joi.string().required(),
  senderId: Joi.string().required(),
  senderType: Joi.string().valid('player', 'coach', 'system').required(),
  content: Joi.string().required(),
  messageType: Joi.string().valid('text', 'image', 'video', 'file', 'system').optional(),
  videoUri: Joi.string().uri().allow(null).optional()
});

const getMessagesSchema = Joi.object({
  conversationId: Joi.string().required(),
  limit: Joi.number().min(1).max(100).optional(),
  offset: Joi.number().min(0).optional()
});

const markAsReadSchema = Joi.object({
  conversationId: Joi.string().required(),
  userType: Joi.string().valid('player', 'coach').required()
});

const createConversationSchema = Joi.object({
  playerId: Joi.string().required(),
  playerName: Joi.string().required(),
  coachId: Joi.string().required(),
  coachName: Joi.string().required(),
  sport: Joi.string().required(),
  sessionId: Joi.string().optional()
});

/**
 * GET /api/conversations/:conversationId/messages
 * Get messages for a conversation
 */
router.get('/:conversationId/messages', async (req, res) => {
  try {
    const { error, value } = getMessagesSchema.validate({
      conversationId: req.params.conversationId,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { conversationId, limit = 50, offset = 0 } = value;
    const messages = await getConversationMessages(conversationId, limit, offset);

    res.json({
      success: true,
      messages
    });

  } catch (err) {
    console.error('Error getting messages:', err);
    res.status(500).json({
      error: 'Failed to get messages',
      message: err.message
    });
  }
});

/**
 * GET /api/conversations/:conversationId/daily-messages
 * Get remaining daily messages for a conversation
 */
router.get('/:conversationId/daily-messages', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required'
      });
    }

    const messageInfo = await getRemainingDailyMessagesForConversation(conversationId);
    
    res.json({
      success: true,
      ...messageInfo
    });

  } catch (err) {
    console.error('Error getting daily messages:', err);
    res.status(500).json({
      error: 'Failed to get daily messages',
      message: err.message
    });
  }
});

/**
 * GET /api/conversations/:conversationId/clips
 * Get remaining clips for a conversation
 */
router.get('/:conversationId/clips', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log(`\n🔵 [CLIPS ENDPOINT] ==========================================`);
    console.log(`🔵 [CLIPS ENDPOINT] Request received for conversation: ${conversationId}`);
    console.log(`🔵 [CLIPS ENDPOINT] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔵 [CLIPS ENDPOINT] ==========================================\n`);
    
    if (!conversationId) {
      console.error('❌ [CLIPS ENDPOINT] No conversation ID provided');
      return res.status(400).json({
        error: 'Conversation ID is required'
      });
    }

    const clipInfo = await getRemainingClipsForConversation(conversationId);
    
    // Also get chat expiry info
    let chatExpiry = null;
    try {
      chatExpiry = await checkChatExpiry(conversationId);
    } catch (expiryError) {
      console.error('Error getting chat expiry:', expiryError);
    }
    
    console.log(`\n🔵 [CLIPS ENDPOINT] ==========================================`);
    console.log(`🔵 [CLIPS ENDPOINT] Returning clip info:`, JSON.stringify(clipInfo, null, 2));
    console.log(`🔵 [CLIPS ENDPOINT] Response summary:`);
    console.log(`🔵 [CLIPS ENDPOINT]   - remaining: ${clipInfo.remaining}`);
    console.log(`🔵 [CLIPS ENDPOINT]   - total: ${clipInfo.total}`);
    console.log(`🔵 [CLIPS ENDPOINT]   - used: ${clipInfo.used}`);
    console.log(`🔵 [CLIPS ENDPOINT]   - error: ${clipInfo.error || 'none'}`);
    console.log(`🔵 [CLIPS ENDPOINT]   - chatExpired: ${chatExpiry?.isExpired || false}`);
    console.log(`🔵 [CLIPS ENDPOINT] ==========================================\n`);

    res.json({
      success: true,
      ...clipInfo,
      chatExpiry
    });

  } catch (err) {
    console.error('\n❌ [CLIPS ENDPOINT] ==========================================');
    console.error('❌ [CLIPS ENDPOINT] Error getting clips:', err);
    console.error('❌ [CLIPS ENDPOINT] Error message:', err.message);
    console.error('❌ [CLIPS ENDPOINT] Error stack:', err.stack);
    console.error('❌ [CLIPS ENDPOINT] ==========================================\n');
    res.status(500).json({
      error: 'Failed to get clips',
      message: err.message
    });
  }
});

/**
 * GET /api/conversations/:userId/:userType
 * Get conversations for a user (player or coach)
 */
router.get('/:userId/:userType', async (req, res) => {
  try {
    const { error, value } = getConversationsSchema.validate({
      userId: req.params.userId,
      userType: req.params.userType
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { userId, userType } = value;
    const conversations = await getConversations(userId, userType);

    // For players, add chat expiry info to each conversation
    if (userType === 'player') {
      const conversationsWithExpiry = await Promise.all(
        conversations.map(async (conversation) => {
          try {
            const expiry = await checkChatExpiry(conversation.id);
            return {
              ...conversation,
              chatExpiry: expiry
            };
          } catch (error) {
            console.error(`Error getting chat expiry for conversation ${conversation.id}:`, error);
            return conversation;
          }
        })
      );
      
      res.json({
        success: true,
        conversations: conversationsWithExpiry
      });
    } else {
      res.json({
        success: true,
        conversations
      });
    }

  } catch (err) {
    console.error('Error getting conversations:', err);
    res.status(500).json({
      error: 'Failed to get conversations',
      message: err.message
    });
  }
});

/**
 * GET /api/conversations/:conversationId
 * Get a specific conversation
 */
router.get('/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({
        error: 'Conversation ID is required'
      });
    }

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    // Get chat expiry info
    let chatExpiry = null;
    try {
      chatExpiry = await checkChatExpiry(conversationId);
    } catch (expiryError) {
      console.error('Error getting chat expiry:', expiryError);
      // Continue without expiry info if there's an error
    }

    res.json({
      success: true,
      conversation: {
        ...conversation,
        chatExpiry
      }
    });

  } catch (err) {
    console.error('Error getting conversation:', err);
    res.status(500).json({
      error: 'Failed to get conversation',
      message: err.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/messages
 * Add a message to a conversation
 */
router.post('/:conversationId/messages', async (req, res) => {
  try {
    const { error, value } = addMessageSchema.validate({
      conversationId: req.params.conversationId,
      ...req.body
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { conversationId, senderId, senderType, content, messageType = 'text', videoUri } = value;

    // Check if chat is expired for players (coaches can always send messages)
    if (senderType === 'player') {
      try {
        const chatExpiry = await checkChatExpiry(conversationId);
        
        if (chatExpiry.isExpired) {
          return res.status(403).json({
            error: 'Chat expired',
            message: 'This chat has expired and is now read-only. Please purchase a new package to continue messaging.',
            chatExpired: true,
            expiresAt: chatExpiry.expiresAt
          });
        }
      } catch (expiryError) {
        console.error('Error checking chat expiry:', expiryError);
        // Don't block message if expiry check fails (fail open)
      }

      // Check daily message limit for text messages from players
      if (messageType === 'text') {
        try {
          const canSend = await canPlayerSendMessageToday(conversationId);
          
          if (!canSend.canSend) {
            return res.status(403).json({
              error: 'Daily message limit reached',
              message: 'You have reached your daily limit of 5 text messages. You can send more messages tomorrow.',
              dailyLimitReached: true,
              remaining: 0,
              used: canSend.used,
              total: canSend.total
            });
          }
        } catch (messageLimitError) {
          console.error('Error checking daily message limit:', messageLimitError);
          // Don't block message if limit check fails (fail open)
        }
      }
    }

    // If this is a video message from a player, check clip limits
    if (messageType === 'video' && senderType === 'player') {
      try {
        // Check remaining clips
        const clipInfo = await getRemainingClipsForConversation(conversationId);
        
        if (clipInfo.error) {
          return res.status(400).json({
            error: 'Clip limit error',
            message: clipInfo.error
          });
        }

        if (clipInfo.remaining <= 0) {
          return res.status(403).json({
            error: 'No clips remaining',
            message: 'You have used all your video clips for this coaching session. Please purchase more clips to continue.',
            remaining: 0,
            total: clipInfo.total
          });
        }

        // Decrement clips before sending the message
        await decrementClipsForConversation(conversationId);
      } catch (clipError) {
        console.error('Error checking clip limits:', clipError);
        return res.status(500).json({
          error: 'Failed to check clip limits',
          message: clipError.message
        });
      }
    }

    const messageData = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      senderId,
      senderType,
      content,
      messageType,
      videoUri
    };

    const message = await addMessageToConversation(messageData);

    // Get updated clip info to return with the response
    let clipInfo = null;
    if (messageType === 'video' && senderType === 'player') {
      try {
        clipInfo = await getRemainingClipsForConversation(conversationId);
      } catch (err) {
        // Don't fail the message send if we can't get clip info
        console.error('Error getting updated clip info:', err);
      }
    }

    // Get updated daily message info to return with the response (for text messages from players)
    let dailyMessageInfo = null;
    if (messageType === 'text' && senderType === 'player') {
      try {
        dailyMessageInfo = await getRemainingDailyMessagesForConversation(conversationId);
      } catch (err) {
        // Don't fail the message send if we can't get daily message info
        console.error('Error getting updated daily message info:', err);
      }
    }

    res.json({
      success: true,
      message,
      clipsRemaining: clipInfo ? clipInfo.remaining : undefined,
      dailyMessagesRemaining: dailyMessageInfo ? dailyMessageInfo.remaining : undefined
    });

  } catch (err) {
    console.error('Error adding message:', err);
    res.status(500).json({
      error: 'Failed to add message',
      message: err.message
    });
  }
});

/**
 * POST /api/conversations/:conversationId/read
 * Mark conversation as read for a user
 */
router.post('/:conversationId/read', async (req, res) => {
  try {
    const { error, value } = markAsReadSchema.validate({
      conversationId: req.params.conversationId,
      ...req.body
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { conversationId, userType } = value;
    const conversation = await markConversationAsRead(conversationId, userType);

    res.json({
      success: true,
      conversation
    });

  } catch (err) {
    console.error('Error marking conversation as read:', err);
    res.status(500).json({
      error: 'Failed to mark conversation as read',
      message: err.message
    });
  }
});

/**
 * POST /api/conversations
 * Create a new conversation between player and coach
 */
router.post('/', async (req, res) => {
  try {
    const { error, value } = createConversationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details[0].message
      });
    }

    const { playerId, playerName, coachId, coachName, sport, sessionId } = value;

    // Generate unique conversation ID
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversationData = {
      id: conversationId,
      playerId,
      playerName,
      coachId,
      coachName,
      sport,
      sessionId: sessionId || null,
      lastMessage: null,
      lastMessageAt: null
    };

    const conversation = await createConversation(conversationData);

    // Note: Welcome message is now handled by the frontend to avoid duplicates

    res.json({
      success: true,
      conversation,
      message: 'Conversation created successfully'
    });

  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({
      error: 'Failed to create conversation',
      message: err.message
    });
  }
});

module.exports = router;
