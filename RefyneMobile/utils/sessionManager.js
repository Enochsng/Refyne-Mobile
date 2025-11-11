import AsyncStorage from '@react-native-async-storage/async-storage';

// Session management utilities for coaching sessions

export const SESSION_STORAGE_KEY = 'coaching_sessions';

/**
 * Create a new coaching session after successful payment
 */
export const createCoachingSession = async (sessionData) => {
  try {
    const session = {
      id: generateSessionId(),
      ...sessionData,
      status: 'active',
      createdAt: new Date().toISOString(),
      clipsUploaded: 0,
      clipsRemaining: getClipsRemaining(sessionData),
      sessionExpiry: getSessionExpiry(sessionData),
      messages: [],
    };

    // Get existing sessions
    const existingSessions = await getCoachingSessions();
    
    // Add new session
    const updatedSessions = [...existingSessions, session];
    
    // Save to storage
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessions));
    
    console.log('Coaching session created:', session);
    return session;
  } catch (error) {
    console.error('Error creating coaching session:', error);
    throw error;
  }
};

/**
 * Get all coaching sessions for the current user
 */
export const getCoachingSessions = async () => {
  try {
    const sessionsJson = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (error) {
    console.error('Error getting coaching sessions:', error);
    return [];
  }
};

/**
 * Get active coaching sessions
 */
export const getActiveCoachingSessions = async () => {
  try {
    const allSessions = await getCoachingSessions();
    return allSessions.filter(session => 
      session.status === 'active' && 
      new Date(session.sessionExpiry) > new Date()
    );
  } catch (error) {
    console.error('Error getting active coaching sessions:', error);
    return [];
  }
};

/**
 * Get a specific coaching session by ID
 */
export const getCoachingSession = async (sessionId) => {
  try {
    const sessions = await getCoachingSessions();
    return sessions.find(session => session.id === sessionId);
  } catch (error) {
    console.error('Error getting coaching session:', error);
    return null;
  }
};

/**
 * Update a coaching session
 */
export const updateCoachingSession = async (sessionId, updates) => {
  try {
    const sessions = await getCoachingSessions();
    const sessionIndex = sessions.findIndex(session => session.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error('Session not found');
    }
    
    sessions[sessionIndex] = {
      ...sessions[sessionIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
    return sessions[sessionIndex];
  } catch (error) {
    console.error('Error updating coaching session:', error);
    throw error;
  }
};

/**
 * Add a message to a coaching session
 */
export const addMessageToSession = async (sessionId, message) => {
  try {
    const session = await getCoachingSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const newMessage = {
      id: generateMessageId(),
      ...message,
      timestamp: new Date().toISOString(),
    };
    
    const updatedMessages = [...session.messages, newMessage];
    
    return await updateCoachingSession(sessionId, {
      messages: updatedMessages,
    });
  } catch (error) {
    console.error('Error adding message to session:', error);
    throw error;
  }
};

/**
 * Upload a clip to a coaching session
 */
export const uploadClipToSession = async (sessionId, clipData) => {
  try {
    const session = await getCoachingSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (session.clipsUploaded >= session.clipsRemaining) {
      throw new Error('Maximum clips reached for this session');
    }
    
    const newClip = {
      id: generateClipId(),
      ...clipData,
      uploadedAt: new Date().toISOString(),
      status: 'pending_review',
    };
    
    // Update session with new clip
    const updatedSession = await updateCoachingSession(sessionId, {
      clipsUploaded: session.clipsUploaded + 1,
      clips: [...(session.clips || []), newClip],
    });
    
    return updatedSession;
  } catch (error) {
    console.error('Error uploading clip to session:', error);
    throw error;
  }
};

/**
 * Complete a coaching session
 */
export const completeCoachingSession = async (sessionId) => {
  try {
    return await updateCoachingSession(sessionId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error completing coaching session:', error);
    throw error;
  }
};

/**
 * Cancel a coaching session
 */
export const cancelCoachingSession = async (sessionId, reason) => {
  try {
    return await updateCoachingSession(sessionId, {
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      cancellationReason: reason,
    });
  } catch (error) {
    console.error('Error cancelling coaching session:', error);
    throw error;
  }
};

// Helper functions

const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateClipId = () => {
  return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getClipsRemaining = (sessionData) => {
  if (sessionData.packageType === 'subscription') {
    return 50; // Monthly subscription allows 50 clips
  }
  
  // Package-based clips
  const packageClips = {
    1: 5,  // 5 clips package
    2: 7,  // 7 clips package
    3: 10, // 10 clips package
  };
  
  return packageClips[sessionData.packageId] || 5;
};

const getSessionExpiry = (sessionData) => {
  if (sessionData.packageType === 'subscription') {
    // Monthly subscription - expires in 30 days
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    return expiry.toISOString();
  }
  
  // Package-based expiry
  const packageDays = {
    1: 3,  // 5 clips package - 3 days
    2: 5,  // 7 clips package - 5 days
    3: 7,  // 10 clips package - 7 days
  };
  
  const days = packageDays[sessionData.packageId] || 3;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry.toISOString();
};

/**
 * Check if a session is expired
 */
export const isSessionExpired = (session) => {
  return new Date(session.sessionExpiry) < new Date();
};

/**
 * Get session status with expiry check
 */
export const getSessionStatus = (session) => {
  if (session.status === 'cancelled' || session.status === 'completed') {
    return session.status;
  }
  
  if (isSessionExpired(session)) {
    return 'expired';
  }
  
  return 'active';
};

/**
 * Clean up expired sessions
 */
export const cleanupExpiredSessions = async () => {
  try {
    const sessions = await getCoachingSessions();
    const activeSessions = sessions.filter(session => !isSessionExpired(session));
    
    if (activeSessions.length !== sessions.length) {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(activeSessions));
      console.log(`Cleaned up ${sessions.length - activeSessions.length} expired sessions`);
    }
    
    return activeSessions;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return [];
  }
};
