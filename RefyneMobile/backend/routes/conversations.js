const express = require('express');
const Joi = require('joi');
const { 
  getConversations, 
  getConversation, 
  addMessageToConversation, 
  getConversationMessages,
  markConversationAsRead,
  createConversation
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

    res.json({
      success: true,
      conversations
    });

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

    res.json({
      success: true,
      conversation
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

    res.json({
      success: true,
      message
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
