const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for backend
const supabaseUrl = process.env.SUPABASE_URL || 'https://jgtbqtpixskznnejzizm.supabase.co';
// Use service key for backend operations to bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpndGJxdHBpeHNrem5uZWp6aXptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY0MzE0MCwiZXhwIjoyMDY2MjE5MTQwfQ.YourServiceKeyHere';

// Check if we have a valid service key
const isSupabaseConfigured = supabaseServiceKey && !supabaseServiceKey.includes('YourServiceKeyHere');

if (!isSupabaseConfigured) {
  console.warn('⚠️  Supabase service key is not properly configured. Using in-memory storage for conversations.');
  console.warn('⚠️  To enable database persistence, set SUPABASE_SERVICE_KEY in your .env file');
}

// Only create Supabase client if we have a valid service key
const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseServiceKey) : null;

// In-memory storage for conversations (temporary solution)
let conversations = [
  {
    id: 'conv_sample_1',
    player_id: 'player_123',
    player_name: 'Sarah Johnson',
    coach_id: 'coach_456',
    coach_name: 'Mike Chen',
    sport: 'Tennis',
    session_id: 'session_1',
    last_message: 'Thanks for the great coaching session!',
    last_message_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    player_unread_count: 0,
    coach_unread_count: 1,
    status: 'active',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'conv_sample_2',
    player_id: 'player_456',
    player_name: 'Justin Lei',
    coach_id: 'coach_789',
    coach_name: 'Emma Davis',
    sport: 'Golf',
    session_id: 'session_2',
    last_message: 'Looking forward to our next session!',
    last_message_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    player_unread_count: 2,
    coach_unread_count: 0,
    status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'conv_sample_3',
    player_id: 'player_789',
    player_name: 'Alex Rodriguez',
    coach_id: 'coach_456',
    coach_name: 'Mike Chen',
    sport: 'Basketball',
    session_id: 'session_3',
    last_message: 'Can we work on my shooting form?',
    last_message_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    player_unread_count: 0,
    coach_unread_count: 3,
    status: 'active',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'conv_sample_4',
    player_id: 'justin_lei',
    player_name: 'Justin Lei',
    coach_id: 'coach_456',
    coach_name: 'Mike Chen',
    sport: 'Golf',
    session_id: 'session_4',
    last_message: 'Thanks for the great lesson today!',
    last_message_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    player_unread_count: 0,
    coach_unread_count: 1,
    status: 'active',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

let messages = [
  {
    id: 'msg_sample_1',
    conversation_id: 'conv_sample_1',
    sender_id: 'player_123',
    sender_type: 'player',
    content: 'Hi Coach! I had a great time at our session today.',
    message_type: 'text',
    video_uri: null,
    metadata: {},
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg_sample_2',
    conversation_id: 'conv_sample_1',
    sender_id: 'coach_456',
    sender_type: 'coach',
    content: 'Thanks for the great coaching session!',
    message_type: 'text',
    video_uri: null,
    metadata: {},
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg_sample_3',
    conversation_id: 'conv_sample_2',
    sender_id: 'coach_789',
    sender_type: 'coach',
    content: 'Your swing is really improving!',
    message_type: 'text',
    video_uri: null,
    metadata: {},
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg_sample_4',
    conversation_id: 'conv_sample_2',
    sender_id: 'player_123',
    sender_type: 'player',
    content: 'Looking forward to our next session!',
    message_type: 'text',
    video_uri: null,
    metadata: {},
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'msg_sample_5',
    conversation_id: 'conv_sample_1',
    sender_id: 'player_123',
    sender_type: 'player',
    content: '📹 Video (8s)',
    message_type: 'video',
    video_uri: 'file:///path/to/sample/video.mp4',
    metadata: {},
    created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
  }
];

// Function to clear all conversations (for testing/development)
function clearAllConversations() {
  conversations = [];
  messages = [];
  console.log('All conversations and messages cleared');
}

/**
 * Coach Connect Account Management
 */

/**
 * Save or update coach's Stripe Connect account information
 */
async function saveCoachConnectAccount(coachData) {
  try {
    // Build the data object without business_profile first
    const accountData = {
      coach_id: coachData.coachId,
      stripe_account_id: coachData.stripeAccountId,
      account_type: coachData.accountType || 'express',
      country: coachData.country,
      email: coachData.email,
      charges_enabled: coachData.chargesEnabled || false,
      payouts_enabled: coachData.payoutsEnabled || false,
      details_submitted: coachData.detailsSubmitted || false,
      onboarding_completed: coachData.onboardingCompleted || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Skip business_profile for now due to schema cache issues
    // if (coachData.businessProfile !== undefined) {
    //   accountData.business_profile = coachData.businessProfile;
    // }

    const { data, error } = await supabase
      .from('coach_connect_accounts')
      .upsert(accountData, {
        onConflict: 'coach_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving coach connect account:', error);
      throw error;
    }

    console.log(`Coach connect account saved: ${coachData.coachId} -> ${coachData.stripeAccountId}`);
    return data;
  } catch (err) {
    console.error('Database error in saveCoachConnectAccount:', err);
    throw err;
  }
}

/**
 * Get coach's Stripe Connect account information
 */
async function getCoachConnectAccount(coachId) {
  try {
    // Use only the columns that definitely exist
    const { data, error } = await supabase
      .from('coach_connect_accounts')
      .select('id, coach_id, stripe_account_id, account_type, country, email, charges_enabled, payouts_enabled, details_submitted, onboarding_completed, created_at, updated_at')
      .eq('coach_id', coachId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error getting coach connect account:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Database error in getCoachConnectAccount:', err);
    throw err;
  }
}

/**
 * Update coach's account status
 */
async function updateCoachAccountStatus(coachId, updates) {
  try {
    const { data, error } = await supabase
      .from('coach_connect_accounts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('coach_id', coachId)
      .select()
      .single();

    if (error) {
      console.error('Error updating coach account status:', error);
      throw error;
    }

    console.log(`Coach account status updated: ${coachId}`);
    return data;
  } catch (err) {
    console.error('Database error in updateCoachAccountStatus:', err);
    throw err;
  }
}

/**
 * Coaching Sessions Management
 */

/**
 * Save coaching session
 */
async function saveCoachingSession(sessionData) {
  try {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .insert({
        id: sessionData.id,
        payment_intent_id: sessionData.paymentIntentId,
        coach_id: sessionData.coachId,
        coach_name: sessionData.coachName,
        sport: sessionData.sport,
        package_type: sessionData.packageType,
        package_id: sessionData.packageId,
        amount: sessionData.amount,
        currency: sessionData.currency,
        clips_remaining: sessionData.clipsRemaining,
        clips_uploaded: sessionData.clipsUploaded || 0,
        session_expiry: sessionData.sessionExpiry,
        status: sessionData.status,
        created_at: sessionData.createdAt,
        messages: sessionData.messages || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving coaching session:', error);
      throw error;
    }

    console.log(`Coaching session saved: ${sessionData.id}`);
    return data;
  } catch (err) {
    console.error('Database error in saveCoachingSession:', err);
    throw err;
  }
}

/**
 * Get coaching session by ID
 */
async function getCoachingSession(sessionId) {
  try {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting coaching session:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Database error in getCoachingSession:', err);
    throw err;
  }
}

/**
 * Update coaching session
 */
async function updateCoachingSession(sessionId, updates) {
  try {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating coaching session:', error);
      throw error;
    }

    console.log(`Coaching session updated: ${sessionId}`);
    return data;
  } catch (err) {
    console.error('Database error in updateCoachingSession:', err);
    throw err;
  }
}

/**
 * Payment Transfers Management
 */

/**
 * Save transfer record
 */
async function saveTransfer(transferData) {
  try {
    const { data, error } = await supabase
      .from('payment_transfers')
      .insert({
        transfer_id: transferData.transferId,
        payment_intent_id: transferData.paymentIntentId,
        coach_id: transferData.coachId,
        coach_account_id: transferData.coachAccountId,
        amount: transferData.amount,
        currency: transferData.currency,
        platform_fee: transferData.platformFee,
        status: transferData.status,
        description: transferData.description,
        metadata: transferData.metadata || {},
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving transfer:', error);
      throw error;
    }

    console.log(`Transfer saved: ${transferData.transferId}`);
    return data;
  } catch (err) {
    console.error('Database error in saveTransfer:', err);
    throw err;
  }
}

/**
 * Update transfer status
 */
async function updateTransferStatus(transferId, status, updates = {}) {
  try {
    const { data, error } = await supabase
      .from('payment_transfers')
      .update({
        status,
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('transfer_id', transferId)
      .select()
      .single();

    if (error) {
      console.error('Error updating transfer status:', error);
      throw error;
    }

    console.log(`Transfer status updated: ${transferId} -> ${status}`);
    return data;
  } catch (err) {
    console.error('Database error in updateTransferStatus:', err);
    throw err;
  }
}

/**
 * Get coach's transfer history
 */
async function getCoachTransfers(coachId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('payment_transfers')
      .select('*')
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting coach transfers:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('Database error in getCoachTransfers:', err);
    throw err;
  }
}

/**
 * Helper function to get coach's Connect account ID
 */
async function getCoachConnectAccountId(coachId) {
  console.log(`getCoachConnectAccountId called with coachId: ${coachId}`);
  console.log(`CoachId type: ${typeof coachId}, length: ${coachId?.length}`);
  
  try {
    // First try to get from database
    const account = await getCoachConnectAccount(coachId);
    console.log(`Database lookup result: ${account?.stripe_account_id || 'null'}`);
    
    if (account?.stripe_account_id) {
      console.log(`Found Stripe account ID: ${account.stripe_account_id} for coach: ${coachId}`);
      return account.stripe_account_id;
    }
    
    // If database lookup fails, use the mapping of existing coaches to their Stripe accounts
    // This ensures payments go to the correct coach's account
    const coachStripeAccountMapping = {
      'e9f47d75-cd92-4a0f-810c-7258ea03d47f': 'acct_1SGRN1PYPuQf9f7C', // Enokski's Stripe account
      'test_coach': 'acct_1SGPzsAxPT8ZZc4c', // Test Coach's Stripe account
      'daniel': 'acct_1SGRN1PYPuQf9f7C', // Daniel temporarily using Enokski's account (until Daniel's account is fixed)
      'acct_1SALeHPjC3F0IBJE': 'acct_1SALeHPjC3F0IBJE', // Golf Coach account from Stripe dashboard
      // Add more coaches here as needed
    };
    
    const stripeAccountId = coachStripeAccountMapping[coachId];
    if (stripeAccountId) {
      console.log(`Using mapped Stripe account ID: ${stripeAccountId} for coach: ${coachId}`);
      return stripeAccountId;
    }
    
    // No account found - coach needs to set up Stripe Connect
    console.error(`No Stripe Connect account found for coach: ${coachId}`);
    console.error(`Coach ${coachId} needs to complete Stripe Connect setup before receiving payments`);
    return null;
    
  } catch (err) {
    console.error('Error getting coach connect account ID:', err);
    
    // Fallback to mapping if database fails
    const coachStripeAccountMapping = {
      'e9f47d75-cd92-4a0f-810c-7258ea03d47f': 'acct_1SGRN1PYPuQf9f7C', // Enokski's Stripe account
      'test_coach': 'acct_1SGPzsAxPT8ZZc4c', // Test Coach's Stripe account
      'daniel': 'acct_1SGRN1PYPuQf9f7C', // Daniel temporarily using Enokski's account (until Daniel's account is fixed)
    };
    
    const stripeAccountId = coachStripeAccountMapping[coachId];
    if (stripeAccountId) {
      console.log(`Fallback: Using mapped Stripe account ID: ${stripeAccountId} for coach: ${coachId}`);
      return stripeAccountId;
    }
    
    console.error(`No Stripe Connect account available for coach: ${coachId}`);
    return null;
  }
}

/**
 * Conversations and Messages Management
 */

/**
 * Create a new conversation between player and coach
 */
async function createConversation(conversationData) {
  try {
    const conversation = {
      id: conversationData.id,
      player_id: conversationData.playerId,
      player_name: conversationData.playerName,
      coach_id: conversationData.coachId,
      coach_name: conversationData.coachName,
      sport: conversationData.sport,
      session_id: conversationData.sessionId,
      last_message: conversationData.lastMessage || null,
      last_message_at: conversationData.lastMessageAt || null,
      player_unread_count: 0,
      coach_unread_count: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.log('Using in-memory storage for conversation creation (Supabase not configured)');
      
      // Add to in-memory storage
      conversations.push(conversation);
      console.log(`Conversation created in memory: ${conversationData.id}`);
      return conversation;
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) {
      console.error('Supabase error in createConversation:', error);
      throw error;
    }

    console.log(`Conversation created: ${conversationData.id}`);
    return data;
  } catch (err) {
    console.error('Database error in createConversation:', err);
    throw err;
  }
}

/**
 * Get conversations for a user (player or coach)
 */
async function getConversations(userId, userType) {
  try {
    // Check if Supabase is properly configured
    if (!supabaseServiceKey || supabaseServiceKey.includes('YourServiceKeyHere')) {
      console.log('Using in-memory storage for conversations (Supabase not configured)');
      
      // Return conversations from in-memory storage
      const column = userType === 'player' ? 'player_id' : 'coach_id';
      const userConversations = conversations.filter(conv => 
        conv[column] === userId && conv.status === 'active'
      );
      
      console.log(`Retrieved ${userConversations.length} conversations from memory for ${userType}: ${userId}`);
      return userConversations;
    }

    const column = userType === 'player' ? 'player_id' : 'coach_id';
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq(column, userId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Supabase error in getConversations:', error);
      throw error;
    }

    console.log(`Retrieved ${data.length} conversations for ${userType}: ${userId}`);
    return data || [];
  } catch (err) {
    console.error('Database error in getConversations:', err);
    
    // Fallback to in-memory storage if Supabase fails
    console.log('Falling back to in-memory storage due to database error');
    const column = userType === 'player' ? 'player_id' : 'coach_id';
    const userConversations = conversations.filter(conv => 
      conv[column] === userId && conv.status === 'active'
    );
    
    console.log(`Retrieved ${userConversations.length} conversations from memory (fallback) for ${userType}: ${userId}`);
    return userConversations;
  }
}

/**
 * Get conversation by ID
 */
async function getConversation(conversationId) {
  try {
    // Check if Supabase is properly configured
    if (!supabaseServiceKey || supabaseServiceKey.includes('YourServiceKeyHere')) {
      console.log('Using in-memory storage for conversation lookup (Supabase not configured)');
      
      // Return conversation from in-memory storage
      const conversation = conversations.find(conv => conv.id === conversationId);
      return conversation || null;
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error getting conversation:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Database error in getConversation:', err);
    
    // Fallback to in-memory storage if Supabase fails
    console.log('Falling back to in-memory storage for conversation lookup');
    const conversation = conversations.find(conv => conv.id === conversationId);
    return conversation || null;
  }
}

/**
 * Add a message to a conversation
 */
async function addMessageToConversation(messageData) {
  try {
    const message = {
      id: messageData.id,
      conversation_id: messageData.conversationId,
      sender_id: messageData.senderId,
      sender_type: messageData.senderType, // 'player', 'coach', or 'system'
      content: messageData.content,
      message_type: messageData.messageType || 'text',
      video_uri: messageData.videoUri || null,
      metadata: messageData.metadata || {},
      created_at: new Date().toISOString()
    };

    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.log('Using in-memory storage for message creation (Supabase not configured)');
      
      // Add to in-memory storage
      messages.push(message);
      
      // Update conversation's last message info in memory
      const conversationIndex = conversations.findIndex(conv => conv.id === messageData.conversationId);
      if (conversationIndex !== -1) {
        conversations[conversationIndex].last_message = messageData.content;
        conversations[conversationIndex].last_message_at = new Date().toISOString();
        conversations[conversationIndex].updated_at = new Date().toISOString();
        
        // Update unread counts (only for player/coach messages, not system messages)
        if (messageData.senderType !== 'system') {
          if (messageData.senderType === 'player') {
            conversations[conversationIndex].coach_unread_count = (conversations[conversationIndex].coach_unread_count || 0) + 1;
          } else {
            conversations[conversationIndex].player_unread_count = (conversations[conversationIndex].player_unread_count || 0) + 1;
          }
        }
      }
      
      console.log(`Message added to conversation in memory: ${messageData.conversationId}`);
      return message;
    }

    // Save to Supabase
    const { data, error } = await supabase
      .from('messages')
      .insert(message)
      .select()
      .single();

    if (error) {
      console.error('Supabase error in addMessageToConversation:', error);
      throw error;
    }

    // Update conversation's last message info
    const updateData = {
      last_message: messageData.content,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update unread counts (only for player/coach messages, not system messages)
    if (messageData.senderType !== 'system') {
      // Get current conversation to update unread counts
      const { data: currentConv, error: fetchError } = await supabase
        .from('conversations')
        .select('coach_unread_count, player_unread_count')
        .eq('id', messageData.conversationId)
        .single();

      if (!fetchError && currentConv) {
        if (messageData.senderType === 'player') {
          updateData.coach_unread_count = (currentConv.coach_unread_count || 0) + 1;
        } else {
          updateData.player_unread_count = (currentConv.player_unread_count || 0) + 1;
        }
      }
    }

    const { error: updateError } = await supabase
      .from('conversations')
      .update(updateData)
      .eq('id', messageData.conversationId);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    console.log(`Message added to conversation: ${messageData.conversationId}`);
    return data;
  } catch (err) {
    console.error('Database error in addMessageToConversation:', err);
    throw err;
  }
}

/**
 * Get messages for a conversation
 */
async function getConversationMessages(conversationId, limit = 50, offset = 0) {
  try {
    // Check if Supabase is properly configured
    if (!supabaseServiceKey || supabaseServiceKey.includes('YourServiceKeyHere')) {
      console.log('Using in-memory storage for messages (Supabase not configured)');
      
      // Return messages from in-memory storage
      const conversationMessages = messages
        .filter(msg => msg.conversation_id === conversationId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(offset, offset + limit);
      
      console.log(`Retrieved ${conversationMessages.length} messages from memory for conversation: ${conversationId}`);
      return conversationMessages;
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error getting messages:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('Database error in getConversationMessages:', err);
    
    // Fallback to in-memory storage if Supabase fails
    console.log('Falling back to in-memory storage for messages');
    const conversationMessages = messages
      .filter(msg => msg.conversation_id === conversationId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit);
    
    console.log(`Retrieved ${conversationMessages.length} messages from memory (fallback) for conversation: ${conversationId}`);
    return conversationMessages;
  }
}

/**
 * Mark messages as read for a user
 */
async function markConversationAsRead(conversationId, userType) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.log('Using in-memory storage for marking conversation as read (Supabase not configured)');
      
      // Update in-memory storage
      const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);
      if (conversationIndex !== -1) {
        if (userType === 'player') {
          conversations[conversationIndex].player_unread_count = 0;
        } else {
          conversations[conversationIndex].coach_unread_count = 0;
        }
        conversations[conversationIndex].updated_at = new Date().toISOString();
      }
      
      console.log(`Conversation marked as read in memory: ${conversationId} for ${userType}`);
      return conversations[conversationIndex] || null;
    }

    const unreadColumn = userType === 'player' ? 'player_unread_count' : 'coach_unread_count';
    
    const { data, error } = await supabase
      .from('conversations')
      .update({
        [unreadColumn]: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error marking conversation as read:', error);
      throw error;
    }

    console.log(`Conversation marked as read: ${conversationId} for ${userType}`);
    return data;
  } catch (err) {
    console.error('Database error in markConversationAsRead:', err);
    throw err;
  }
}

/**
 * Update conversation's last message info
 */
async function updateConversationLastMessage(conversationId, lastMessage, lastMessageAt) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({
        last_message: lastMessage,
        last_message_at: lastMessageAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating conversation last message:', error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error('Database error in updateConversationLastMessage:', err);
    throw err;
  }
}

/**
 * Initialize database tables (run this once to create tables)
 */
async function initializeDatabase() {
  try {
    console.log('Initializing database tables...');
    
    // Note: In a real application, you would run these SQL commands in your Supabase dashboard
    // or use a migration tool. This is just for reference.
    
    const tables = [
      `CREATE TABLE IF NOT EXISTS coach_connect_accounts (
        id SERIAL PRIMARY KEY,
        coach_id VARCHAR(255) UNIQUE NOT NULL,
        stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
        account_type VARCHAR(50) DEFAULT 'express',
        country VARCHAR(2) NOT NULL,
        email VARCHAR(255) NOT NULL,
        charges_enabled BOOLEAN DEFAULT FALSE,
        payouts_enabled BOOLEAN DEFAULT FALSE,
        details_submitted BOOLEAN DEFAULT FALSE,
        onboarding_completed BOOLEAN DEFAULT FALSE,
        business_profile JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS coaching_sessions (
        id VARCHAR(255) PRIMARY KEY,
        payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
        coach_id VARCHAR(255) NOT NULL,
        coach_name VARCHAR(255) NOT NULL,
        sport VARCHAR(50) NOT NULL,
        package_type VARCHAR(50) NOT NULL,
        package_id INTEGER,
        amount INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'cad',
        clips_remaining INTEGER NOT NULL,
        clips_uploaded INTEGER DEFAULT 0,
        session_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        messages JSONB DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS payment_transfers (
        id SERIAL PRIMARY KEY,
        transfer_id VARCHAR(255) UNIQUE NOT NULL,
        payment_intent_id VARCHAR(255) NOT NULL,
        coach_id VARCHAR(255) NOT NULL,
        coach_account_id VARCHAR(255) NOT NULL,
        amount INTEGER NOT NULL,
        currency VARCHAR(3) DEFAULT 'cad',
        platform_fee INTEGER NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        description TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`,
      
      `CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        player_id VARCHAR(255) NOT NULL,
        player_name VARCHAR(255) NOT NULL,
        coach_id VARCHAR(255) NOT NULL,
        coach_name VARCHAR(255) NOT NULL,
        sport VARCHAR(50) NOT NULL,
        session_id VARCHAR(255),
        last_message TEXT,
        last_message_at TIMESTAMP WITH TIME ZONE,
        player_unread_count INTEGER DEFAULT 0,
        coach_unread_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(player_id, coach_id, session_id)
      );`,
      
      `CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        sender_id VARCHAR(255) NOT NULL,
        sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('player', 'coach', 'system')),
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        video_uri TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );`
    ];

    console.log('Database tables SQL (run these in your Supabase dashboard):');
    tables.forEach((sql, index) => {
      console.log(`\n-- Table ${index + 1}:`);
      console.log(sql);
    });

    return true;
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  }
}

module.exports = {
  supabase,
  saveCoachConnectAccount,
  getCoachConnectAccount,
  updateCoachAccountStatus,
  saveCoachingSession,
  getCoachingSession,
  updateCoachingSession,
  saveTransfer,
  updateTransferStatus,
  getCoachTransfers,
  getCoachConnectAccountId,
  createConversation,
  getConversations,
  getConversation,
  addMessageToConversation,
  getConversationMessages,
  markConversationAsRead,
  updateConversationLastMessage,
  clearAllConversations,
  initializeDatabase
};
