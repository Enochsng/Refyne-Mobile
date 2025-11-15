// Conversation service for interacting with the conversations API
// This service handles all conversation and messaging operations

import { Platform } from 'react-native';

// Backend API configuration
const API_BASE_URL = __DEV__ 
  ? 'http://10.0.0.51:3001'  // Development - Your computer's IP address
  : 'https://your-production-api.com';  // Production

// Fallback URLs for development
const FALLBACK_URLS = [
  'http://10.0.0.51:3001', // Current network IP
  'http://192.168.1.79:3001', // Previous network IP
  'http://10.0.0.77:3001', // Previous network IP
  'http://10.0.0.50:3001',
  'http://localhost:3001',
  'http://10.0.2.2:3001', // Android emulator
  'http://127.0.0.1:3001',
  'http://10.0.0.207:3001', // Alternative network
  'http://192.168.0.1:3001', // Router IP
];

// Global variable to store the working URL
let workingApiUrl = API_BASE_URL;
let connectionTested = false;
let lastConnectionAttempt = 0;
const CONNECTION_RETRY_INTERVAL = 30000; // 30 seconds

/**
 * Test backend connection and find working URL
 */
export const testBackendConnection = async () => {
  const now = Date.now();
  
  // If we have a working URL and haven't tried to reconnect recently, use it
  if (connectionTested && workingApiUrl && (now - lastConnectionAttempt) < CONNECTION_RETRY_INTERVAL) {
    console.log(`🔄 Using cached working URL: ${workingApiUrl}`);
    return workingApiUrl;
  }

  lastConnectionAttempt = now;
  // Remove duplicates from URLs to try
  const uniqueUrls = [...new Set([API_BASE_URL, ...FALLBACK_URLS])];
  console.log(`🔍 Testing ${uniqueUrls.length} backend URLs...`);

  const connectionErrors = [];

  for (const url of uniqueUrls) {
    try {
      console.log(`🔍 Testing connection to: ${url}`);
      
      // Use AbortController for better timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for connection test
      
      try {
        const fetchPromise = fetch(`${url}/api/conversations/test/player`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-cache',
          mode: 'cors',
          signal: controller.signal,
        });

        const response = await fetchPromise;
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Working URL found: ${url}`);
          console.log(`   → Server info:`, data.serverInfo || 'N/A');
          workingApiUrl = url;
          connectionTested = true;
          return url;
        } else {
          console.log(`❌ Server responded with status ${response.status} for: ${url}`);
          connectionErrors.push({ url, error: `HTTP ${response.status}`, status: response.status });
          // Try to get error details
          try {
            const errorData = await response.json();
            console.log(`   → Error details:`, errorData);
          } catch (parseError) {
            console.log(`   → Could not parse error response`);
          }
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          console.log(`❌ Connection timeout for: ${url}`);
          connectionErrors.push({ url, error: 'Connection timeout' });
        } else {
          throw fetchError;
        }
      }
    } catch (error) {
      const errorMsg = error.message || 'Unknown error';
      console.log(`❌ Failed to connect to: ${url} - ${errorMsg}`);
      connectionErrors.push({ url, error: errorMsg });
      
      // Log more detailed error information
      if (errorMsg.includes('Network request failed') || error.name === 'TypeError') {
        console.log(`   → Network request failed - device/simulator cannot reach ${url}`);
        console.log(`   → Common causes:`);
        console.log(`     • Backend server not running`);
        console.log(`     • Device and computer on different networks`);
        console.log(`     • Incorrect IP address`);
        console.log(`     • Firewall blocking port 3001`);
      } else if (errorMsg.includes('timeout')) {
        console.log(`   → Request timed out - server may be slow or unreachable`);
      } else {
        console.log(`   → Error type: ${error.constructor?.name || 'Unknown'}`);
      }
    }
  }

  // Log summary of all connection attempts (use warn instead of error to avoid triggering React Native error overlay)
  console.warn('⚠️ No working backend URL found');
  console.warn('⚠️ Connection test summary:');
  connectionErrors.forEach(({ url, error }, index) => {
    console.warn(`   ${index + 1}. ${url} - ${error}`);
  });
  console.warn('⚠️ Troubleshooting steps:');
  console.warn('   1. Start backend server: cd backend && node server.js');
  console.warn('   2. Verify device and computer are on the same WiFi network');
  console.warn('   3. Check firewall settings (allow port 3001)');
  console.warn('   4. Update IP address in conversationService.js if changed');
  console.warn(`   5. Current primary IP: ${API_BASE_URL}`);
  connectionTested = true;
  return null;
};

/**
 * Reset connection state (useful for retrying after errors)
 */
export const resetConnectionState = () => {
  connectionTested = false;
  workingApiUrl = API_BASE_URL;
  lastConnectionAttempt = 0;
  console.log('🔄 Connection state reset - will retry with new URLs');
};

/**
 * Manual connection test with detailed logging
 */
export const manualConnectionTest = async () => {
  console.log('🧪 Starting manual connection test...');
  console.log('📱 Device/Simulator network info:');
  console.log('   - __DEV__:', __DEV__);
  console.log('   - Platform:', Platform?.OS || 'unknown');
  
  const result = await testBackendConnection();
  
  if (result) {
    console.log('✅ Manual connection test successful!');
    console.log('🔗 Working URL:', result);
  } else {
    console.log('❌ Manual connection test failed!');
    console.log('🔍 All URLs tested unsuccessfully');
  }
  
  return result;
};

/**
 * Check if backend is healthy
 */
export const checkBackendHealth = async () => {
  try {
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      return { healthy: false, message: 'No working backend URL found' };
    }

    const response = await fetch(`${workingUrl}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { healthy: true, data, url: workingUrl };
    } else {
      return { healthy: false, message: `Health check failed with status ${response.status}` };
    }
  } catch (error) {
    return { healthy: false, message: error.message };
  }
};

/**
 * Get conversations for a user (player or coach)
 */
export const getConversations = async (userId, userType) => {
  try {
    console.log(`🔍 Starting getConversations for ${userType}: ${userId}`);
    
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      console.warn('⚠️ No working backend URL found');
      const troubleshootingMsg = `
Unable to connect to the backend server. Please verify:
1. Backend server is running (cd backend && node server.js)
2. Your device and computer are on the same WiFi network
3. Firewall is not blocking port 3001
4. The correct IP address is configured in conversationService.js

Current IP attempts: ${API_BASE_URL} and fallback URLs.
      `.trim();
      resetConnectionState();
      throw new Error('No working backend URL found. ' + troubleshootingMsg);
    }

    console.log(`✅ Using working URL: ${workingUrl}`);
    const fullUrl = `${workingUrl}/api/conversations/${userId}/${userType}`;
    console.log(`🌐 Full URL: ${fullUrl}`);
    
    // Create a timeout promise with AbortController for better cancellation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const fetchPromise = fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        // Add additional fetch options for better network handling
        cache: 'no-cache',
        mode: 'cors',
        signal: controller.signal,
      });
      
      console.log(`⏳ Making request to: ${fullUrl}`);
      const response = await fetchPromise;
      clearTimeout(timeoutId);

      console.log(`📡 Response status: ${response.status}`);
      console.log(`✅ Response ok: ${response.ok}`);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('❌ API Error Response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Retrieved ${data.conversations?.length || 0} conversations`);
      return data.conversations || [];
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError' || fetchError.message.includes('aborted')) {
        throw new Error('Request timed out after 15 seconds. The server may be slow or unreachable.');
      }
      throw fetchError;
    }
  } catch (error) {
    // Use console.warn instead of console.error to avoid triggering React Native error overlay
    console.warn('⚠️ Error getting conversations:', error.message);
    if (__DEV__) {
      console.log('Error type:', error.constructor?.name || 'Unknown');
      console.log('Error message:', error.message || 'Unknown error');
      console.log('Error stack:', error.stack);
    }
    
    // Provide more helpful error messages based on error type
    if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
      // This is the most common error - network connectivity issue
      resetConnectionState();
      throw new Error('Network request failed. Unable to reach the backend server. Please check:\n• Backend server is running (node backend/server.js)\n• Device and computer are on the same network\n• Firewall allows connections on port 3001');
    } else if (error.message.includes('No working backend URL found')) {
      // Reset connection state to allow retry
      resetConnectionState();
      throw error; // Re-throw with the detailed message we created above
    } else if (error.message.includes('Request timeout') || error.message.includes('timed out')) {
      throw new Error('Request timed out. The server is taking too long to respond. Please check if the backend server is running and try again.');
    } else if (error.message.includes('Network request failed')) {
      resetConnectionState();
      throw new Error('Network request failed. Please check your internet connection and ensure the backend server is running.');
    } else {
      // Preserve original error message but add context if needed
      const errorMsg = error.message || 'Failed to get conversations';
      throw new Error(errorMsg);
    }
  }
};

/**
 * Get a specific conversation
 */
export const getConversation = async (conversationId) => {
  try {
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    console.log(`Getting conversation: ${conversationId}`);
    console.log(`Using working URL: ${workingUrl}`);
    
    const fullUrl = `${workingUrl}/api/conversations/${conversationId}`;
    console.log(`Full URL: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      throw new Error(errorData.message || 'Failed to get conversation');
    }

    const data = await response.json();
    return data.conversation;
  } catch (error) {
    console.error('Error getting conversation:', error);
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'Unknown error');
    throw new Error(error.message || 'Failed to get conversation');
  }
};

/**
 * Create a new conversation between player and coach
 */
export const createConversation = async (conversationData) => {
  try {
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    console.log('Creating conversation:', conversationData);
    console.log(`Using working URL: ${workingUrl}`);
    
    const fullUrl = `${workingUrl}/api/conversations`;
    console.log(`Full URL: ${fullUrl}`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );
    
    const fetchPromise = fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(conversationData),
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      throw new Error(errorData.message || 'Failed to create conversation');
    }

    const data = await response.json();
    console.log('Conversation created successfully:', data.conversation.id);
    return data.conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'Unknown error');
    throw new Error(error.message || 'Failed to create conversation');
  }
};

/**
 * Get messages for a conversation
 */
export const getConversationMessages = async (conversationId, limit = 50, offset = 0) => {
  try {
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    console.log(`Getting messages for conversation: ${conversationId}`);
    console.log(`Using working URL: ${workingUrl}`);
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    const fullUrl = `${workingUrl}/api/conversations/${conversationId}/messages?${params}`;
    console.log(`Full URL: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      throw new Error(errorData.message || 'Failed to get messages');
    }

    const data = await response.json();
    console.log(`Retrieved ${data.messages.length} messages`);
    return data.messages;
  } catch (error) {
    console.error('Error getting messages:', error);
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'Unknown error');
    throw new Error(error.message || 'Failed to get messages');
  }
};

/**
 * Send a message to a conversation
 */
export const sendMessage = async (conversationId, senderId, senderType, content, messageType = 'text', videoUri = null) => {
  try {
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    console.log(`Sending message to conversation: ${conversationId}`);
    console.log(`Using working URL: ${workingUrl}`);
    
    const fullUrl = `${workingUrl}/api/conversations/${conversationId}/messages`;
    console.log(`Full URL: ${fullUrl}`);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 10000)
    );
    
    const fetchPromise = fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        senderId,
        senderType,
        content,
        messageType,
        videoUri
      }),
    });
    
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json();
      
      // For daily message limit errors, throw error without logging
      if (errorData.error === 'Daily message limit reached' || errorData.dailyLimitReached) {
        // Don't log to console - just throw the error silently
        throw new Error(errorData.message || 'Daily message limit reached');
      }
      
      // For other errors, log and throw
      console.error('API Error Response:', JSON.stringify(errorData, null, 2));
      throw new Error(errorData.message || 'Failed to send message');
    }

    const data = await response.json();
    console.log('Message sent successfully');
    return {
      message: data.message,
      clipsRemaining: data.clipsRemaining,
      dailyMessagesRemaining: data.dailyMessagesRemaining
    };
  } catch (error) {
    // Check if this is a daily message limit error - don't log these
    const isDailyLimitError = error.message && (
      error.message.includes('Daily message limit') || 
      error.message.includes('daily limit') ||
      error.message.includes('daily limit reached')
    );
    
    if (!isDailyLimitError) {
      // Only log non-daily-limit errors
      console.error('Error sending message:', error);
      console.error('Error type:', error.constructor?.name || 'Unknown');
      console.error('Error message:', error.message || 'Unknown error');
    }
    
    // Re-throw the error so it can be handled by the caller
    throw new Error(error.message || 'Failed to send message');
  }
};

/**
 * Mark conversation as read for a user
 */
export const markConversationAsRead = async (conversationId, userType) => {
  try {
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    console.log(`Marking conversation as read: ${conversationId} for ${userType}`);
    console.log(`Using working URL: ${workingUrl}`);
    
    const fullUrl = `${workingUrl}/api/conversations/${conversationId}/read`;
    console.log(`Full URL: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        userType
      }),
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      throw new Error(errorData.message || 'Failed to mark conversation as read');
    }

    const data = await response.json();
    console.log('Conversation marked as read');
    return data.conversation;
  } catch (error) {
    console.error('Error marking conversation as read:', error);
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'Unknown error');
    throw new Error(error.message || 'Failed to mark conversation as read');
  }
};

/**
 * Get remaining daily messages for a conversation
 */
export const getRemainingDailyMessages = async (conversationId) => {
  try {
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    console.log(`Getting remaining daily messages for conversation: ${conversationId}`);
    console.log(`Using working URL: ${workingUrl}`);
    
    const fullUrl = `${workingUrl}/api/conversations/${conversationId}/daily-messages`;
    console.log(`Full URL: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      // Return default values if there's an error
      return { remaining: 5, total: 5, used: 0, error: errorData.message || 'Failed to get daily messages' };
    }

    const data = await response.json();
    console.log(`📊 [getRemainingDailyMessages] Retrieved daily message info: remaining=${data.remaining}, total=${data.total}, used=${data.used}`);
    
    const messageInfo = {
      remaining: data.remaining || 5,
      total: data.total || 5,
      used: data.used || 0,
      error: data.error || null
    };
    
    console.log(`📊 [getRemainingDailyMessages] Returning message info:`, messageInfo);
    return messageInfo;
  } catch (error) {
    console.error('Error getting remaining daily messages:', error);
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'Unknown error');
    // Return default values on error
    return { remaining: 5, total: 5, used: 0, error: error.message || 'Failed to get daily messages' };
  }
};

/**
 * Get remaining clips for a conversation
 */
export const getRemainingClips = async (conversationId) => {
  try {
    // Test connection and get working URL
    const workingUrl = await testBackendConnection();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    console.log(`Getting remaining clips for conversation: ${conversationId}`);
    console.log(`Using working URL: ${workingUrl}`);
    
    const fullUrl = `${workingUrl}/api/conversations/${conversationId}/clips`;
    console.log(`Full URL: ${fullUrl}`);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log(`Response status: ${response.status}`);
    console.log(`Response ok: ${response.ok}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error Response:', errorData);
      // Return default values if there's an error (e.g., no session found)
      return { remaining: 0, total: 0, used: 0, error: errorData.message || 'Failed to get clips' };
    }

    const data = await response.json();
    console.log(`📊 [getRemainingClips] Full API response:`, JSON.stringify(data, null, 2));
    console.log(`📊 [getRemainingClips] Retrieved clip info: remaining=${data.remaining}, total=${data.total}, used=${data.used}`);
    
    // The backend returns { success: true, remaining, total, used, chatExpiry }
    const clipInfo = {
      remaining: data.remaining || 0,
      total: data.total || 0,
      used: data.used || 0,
      error: data.error || null,
      chatExpiry: data.chatExpiry || null
    };
    
    console.log(`📊 [getRemainingClips] Returning clip info:`, clipInfo);
    return clipInfo;
  } catch (error) {
    console.error('Error getting remaining clips:', error);
    console.error('Error type:', error.constructor?.name || 'Unknown');
    console.error('Error message:', error.message || 'Unknown error');
    // Return default values on error
    return { remaining: 0, total: 0, used: 0, error: error.message || 'Failed to get clips' };
  }
};

/**
 * Format conversation data for display
 */
export const formatConversationForDisplay = async (conversation, userType) => {
  const isPlayer = userType === 'player';
  let otherPartyName;
  
  console.log('formatConversationForDisplay called with:', {
    userType,
    isPlayer,
    conversationId: conversation.id,
    player_name: conversation.player_name,
    coach_name: conversation.coach_name,
    player_id: conversation.player_id
  });
  
  try {
    if (isPlayer) {
      otherPartyName = conversation.coach_name;
      console.log('Player view - using coach name:', otherPartyName);
    } else {
      // For coaches, use the player_name from the database, fallback to getPlayerName if not available
      if (conversation.player_name) {
        otherPartyName = conversation.player_name;
        console.log('Coach view - using player_name from DB:', otherPartyName);
      } else {
        // Fallback for existing conversations that might not have player_name yet
        console.log('Coach view - player_name not found, calling getPlayerName for:', conversation.player_id);
        otherPartyName = await getPlayerName(conversation.player_id);
        console.log('Coach view - getPlayerName returned:', otherPartyName);
      }
    }
  } catch (error) {
    console.log('Error getting other party name:', error);
    otherPartyName = isPlayer ? conversation.coach_name : (conversation.player_name || 'Student');
    console.log('Using fallback otherPartyName:', otherPartyName);
  }
  
  const unreadCount = isPlayer ? conversation.player_unread_count : conversation.coach_unread_count;
  
  // Get profile photo URL
  let profilePhotoUrl = null;
  try {
    if (isPlayer) {
      // For players, get coach profile photo
      console.log(`🔍 Getting coach profile photo for coach_id: ${conversation.coach_id}`);
      profilePhotoUrl = await getCoachProfilePhoto(conversation.coach_id);
      console.log(`✅ Coach profile photo result: ${profilePhotoUrl}`);
    } else {
      // For coaches, get player profile photo
      console.log(`🔍 Getting player profile photo for player_id: ${conversation.player_id}`);
      profilePhotoUrl = await getPlayerProfilePhoto(conversation.player_id);
      console.log(`✅ Player profile photo result: ${profilePhotoUrl}`);
    }
  } catch (error) {
    console.log('Error fetching profile photo:', error);
  }
  
  const result = {
    id: conversation.id,
    otherPartyName,
    playerName: conversation.player_name,
    coachName: conversation.coach_name,
    sport: conversation.sport,
    lastMessage: conversation.last_message,
    lastMessageAt: conversation.last_message_at,
    unreadCount,
    sessionId: conversation.session_id,
    isOnline: false, // TODO: Implement online status
    avatar: profilePhotoUrl,
    chatExpiry: conversation.chatExpiry || null
  };
  
  console.log('formatConversationForDisplay returning:', {
    id: result.id,
    otherPartyName: result.otherPartyName,
    playerName: result.playerName,
    userType,
    avatar: result.avatar,
    chatExpiry: result.chatExpiry
  });
  
  return result;
};

/**
 * Format message data for display
 */
export const formatMessageForDisplay = (message, currentUserId) => {
  const isFromCurrentUser = message.sender_id === currentUserId;
  
  return {
    id: message.id,
    text: message.content,
    isFromPlayer: message.sender_type === 'player',
    isFromCurrentUser,
    timestamp: new Date(message.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    messageType: message.message_type,
    metadata: message.metadata
  };
};

/**
 * Get coach profile photo URL
 */
export const getCoachProfilePhoto = async (coachId) => {
  try {
    // Import AsyncStorage dynamically to avoid circular dependencies
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    console.log(`🔍 Looking for profile photo for coach: ${coachId}`);
    
    // Try to get profile photo from AsyncStorage
    const savedPhotoUri = await AsyncStorage.getItem(`profile_photo_${coachId}`);
    if (savedPhotoUri) {
      console.log(`✅ Found saved profile photo for coach ${coachId}: ${savedPhotoUri}`);
      return savedPhotoUri;
    }
    
    // Try to get profile photo from coach onboarding data
    try {
      const onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${coachId}`);
      if (onboardingDataString) {
        const onboardingData = JSON.parse(onboardingDataString);
        if (onboardingData.profilePicture) {
          console.log(`✅ Found profile photo in onboarding data for coach ${coachId}: ${onboardingData.profilePicture}`);
          return onboardingData.profilePicture;
        }
      }
    } catch (onboardingError) {
      console.log(`No onboarding data found for coach ${coachId}:`, onboardingError.message);
    }
    
    // Try to get profile photo from coach profiles (using the coachData utility)
    try {
      const { getAllCoachProfiles } = await import('../utils/coachData');
      const coachProfiles = await getAllCoachProfiles();
      const coachProfile = coachProfiles.find(profile => profile.id === coachId);
      if (coachProfile && coachProfile.profilePicture) {
        console.log(`✅ Found profile photo in coach profiles for coach ${coachId}: ${coachProfile.profilePicture}`);
        return coachProfile.profilePicture;
      }
    } catch (coachDataError) {
      console.log(`Error getting coach profiles for ${coachId}:`, coachDataError.message);
    }
    
    // For testing, return some default profile photos based on coach ID
    const testPhotos = {
      'coach_456': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      'coach_789': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
      'coach_123': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
      'enokski': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      'e9f47d75-cd92-4a0f-810c-7258ea03d47f': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', // Enokski's actual ID
      '563b64de-c4c9-4060-87f7-2e382bceda51': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', // Common coach ID from error logs
      'temp_coach': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', // Temp coach ID
    };
    
    if (testPhotos[coachId]) {
      console.log(`✅ Using test photo for coach ${coachId}`);
      return testPhotos[coachId];
    }
    
    console.log(`❌ No profile photo found for coach ${coachId}, will show initials`);
    // If no saved photo or test photo, return null (will show initials)
    return null;
  } catch (error) {
    console.log('Error getting coach profile photo:', error);
    return null;
  }
};

/**
 * Get player name
 */
export const getPlayerName = async (playerId) => {
  try {
    // First try to get from Supabase auth user metadata
    try {
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && user.id === playerId) {
        const playerName = user.user_metadata?.full_name || 
                          user.user_metadata?.name || 
                          user.user_metadata?.display_name ||
                          user.email?.split('@')[0];
        if (playerName) {
          return playerName;
        }
      }
    } catch (authError) {
      console.log('Error getting player name from auth:', authError);
    }
    
    // Import AsyncStorage dynamically to avoid circular dependencies
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    // Try to get player name from AsyncStorage
    const savedName = await AsyncStorage.getItem(`player_name_${playerId}`);
    if (savedName) {
      return savedName;
    }
    
    // For testing, return some default names based on player ID
    const testNames = {
      'player_123': 'Sarah Johnson',
      'player_456': 'Mike Chen',
      'player_789': 'Emma Davis',
      'justin_lei': 'Justin Lei',
      'justin': 'Justin Lei',
      'lei': 'Justin Lei',
      'test_player': 'Test Player',
      'demo_player': 'Demo Player',
    };
    
    if (testNames[playerId]) {
      return testNames[playerId];
    }
    
    // If no saved name or test name, return a default
    return 'Student';
  } catch (error) {
    console.log('Error getting player name:', error);
    return 'Student';
  }
};

/**
 * Get player profile photo URL
 */
export const getPlayerProfilePhoto = async (playerId) => {
  try {
    // Import AsyncStorage dynamically to avoid circular dependencies
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    
    console.log(`🔍 Looking for profile photo for player: ${playerId}`);
    
    // Try to get profile photo from AsyncStorage
    const savedPhotoUri = await AsyncStorage.getItem(`player_profile_photo_${playerId}`);
    if (savedPhotoUri) {
      console.log(`✅ Found saved profile photo for player ${playerId}: ${savedPhotoUri}`);
      return savedPhotoUri;
    }
    
    // Try to get profile photo from player onboarding data (if they have any)
    try {
      const onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${playerId}`);
      if (onboardingDataString) {
        const onboardingData = JSON.parse(onboardingDataString);
        if (onboardingData.profilePicture) {
          console.log(`✅ Found profile photo in onboarding data for player ${playerId}: ${onboardingData.profilePicture}`);
          return onboardingData.profilePicture;
        }
      }
    } catch (onboardingError) {
      console.log(`No onboarding data found for player ${playerId}:`, onboardingError.message);
    }
    
    // For testing, return some default profile photos based on player ID
    const testPhotos = {
      'player_123': 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
      'player_456': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
      'player_789': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
      'justin_lei': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      'justin': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      'lei': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
      'jgao': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', // Player from the image
      'justin lei': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', // Space-separated version
      'justin-lei': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', // Hyphen-separated version
    };
    
    if (testPhotos[playerId]) {
      console.log(`✅ Using test photo for player ${playerId}`);
      return testPhotos[playerId];
    }
    
    console.log(`❌ No profile photo found for player ${playerId}, will show initials`);
    // If no saved photo or test photo, return null (will show initials)
    return null;
  } catch (error) {
    console.log('Error getting player profile photo:', error);
    return null;
  }
};

// Test conversation service function removed - not needed for production
