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
    console.log(`\n💾 [saveCoachingSession] Attempting to save session: ${sessionData.id}`);
    console.log(`   - coach_id: ${sessionData.coachId}`);
    console.log(`   - clips_remaining: ${sessionData.clipsRemaining}`);
    console.log(`   - status: ${sessionData.status}`);
    console.log(`   - session_expiry: ${sessionData.sessionExpiry}`);
    console.log(`   - isSupabaseConfigured: ${isSupabaseConfigured}`);
    console.log(`   - supabase client: ${supabase ? 'exists' : 'null'}`);
    
    if (!isSupabaseConfigured || !supabase) {
      const errorMsg = 'Supabase is not configured. Cannot save coaching session to database.';
      console.error(`❌ [saveCoachingSession] ${errorMsg}`);
      throw new Error(errorMsg);
    }
    
    const insertData = {
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
    };
    
    console.log(`   Inserting data:`, JSON.stringify(insertData, null, 2));
    
    const { data, error } = await supabase
      .from('coaching_sessions')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('❌ [saveCoachingSession] Error saving coaching session:', error);
      console.error('   Error code:', error.code);
      console.error('   Error message:', error.message);
      console.error('   Error details:', error.details);
      console.error('   Error hint:', error.hint);
      throw error;
    }

    console.log(`✅ [saveCoachingSession] Coaching session saved successfully: ${sessionData.id}`);
    console.log(`   Saved data:`, JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error('❌ [saveCoachingSession] Database error:', err);
    console.error('   Error stack:', err.stack);
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
 * Get active coaching sessions for a player-coach pair
 */
async function getActiveSessionsForPlayerCoach(playerId, coachId) {
  try {
    if (!isSupabaseConfigured) {
      console.log('⚠️ Supabase not configured, returning empty sessions');
      return [];
    }

    console.log(`🔍 [getActiveSessionsForPlayerCoach] Looking for sessions: player=${playerId}, coach=${coachId}`);

    // First, get all conversations for this player-coach pair to find session_ids
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select('session_id, id')
      .eq('player_id', playerId)
      .eq('coach_id', coachId)
      .eq('status', 'active');

    if (convError) {
      console.error('❌ [getActiveSessionsForPlayerCoach] Error getting conversations:', convError);
      return [];
    }

    console.log(`📋 [getActiveSessionsForPlayerCoach] Found ${conversations?.length || 0} conversations for player-coach pair`);
    if (conversations && conversations.length > 0) {
      conversations.forEach(conv => {
        console.log(`   Conversation ${conv.id}: session_id=${conv.session_id || 'NULL'}`);
      });
    }

    // Extract session_ids from conversations
    const sessionIds = conversations
      .map(conv => conv.session_id)
      .filter(Boolean);
    
    let sessions = [];
    
    if (sessionIds.length > 0) {
      console.log(`🔑 [getActiveSessionsForPlayerCoach] Found ${sessionIds.length} session_ids:`, sessionIds);

      // Now get the coaching sessions for these session_ids
      const { data, error } = await supabase
        .from('coaching_sessions')
        .select('*')
        .in('id', sessionIds)
        .eq('status', 'active')
        .gte('session_expiry', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ [getActiveSessionsForPlayerCoach] Error getting active sessions:', error);
      } else {
        sessions = data || [];
        console.log(`✅ [getActiveSessionsForPlayerCoach] Found ${sessions.length} active sessions from conversation session_ids`);
        if (sessions.length > 0) {
          sessions.forEach(session => {
            console.log(`   📦 Session ${session.id}: clips_remaining=${session.clips_remaining}, clips_uploaded=${session.clips_uploaded}, expiry=${session.session_expiry}`);
          });
        }
      }
    } else {
      console.log('⚠️ [getActiveSessionsForPlayerCoach] No session_ids found in conversations');
    }
    
    // If no sessions found from conversation session_ids, try to find recent active sessions for this coach
    // This handles the case where a session was created but not linked to a conversation
    if (sessions.length === 0) {
      console.log('🔍 [getActiveSessionsForPlayerCoach] No sessions from conversation IDs, trying to find recent sessions for coach');
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      const { data: recentSessions, error: recentError } = await supabase
        .from('coaching_sessions')
        .select('*')
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .gte('session_expiry', new Date().toISOString())
        .gte('created_at', fourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!recentError && recentSessions && recentSessions.length > 0) {
        console.log(`✅ [getActiveSessionsForPlayerCoach] Found ${recentSessions.length} recent active sessions for coach`);
        // Check if any of these sessions aren't already linked to another player's conversation
        for (const session of recentSessions) {
          const { data: linkedConversations } = await supabase
            .from('conversations')
            .select('player_id')
            .eq('session_id', session.id)
            .neq('player_id', playerId)
            .limit(1);
          
          // If this session isn't linked to another player, include it
          if (!linkedConversations || linkedConversations.length === 0) {
            sessions.push(session);
            console.log(`   📦 Including session ${session.id}: clips_remaining=${session.clips_remaining}`);
          }
        }
      }
    }

    return sessions;
  } catch (err) {
    console.error('❌ [getActiveSessionsForPlayerCoach] Database error:', err);
    return [];
  }
}

/**
 * Get remaining clips for a player in a conversation
 */
async function getRemainingClipsForConversation(conversationId) {
  try {
    console.log(`\n🎬 [getRemainingClipsForConversation] Starting for conversation: ${conversationId}`);
    
    // First, get the conversation to find the session_id
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      console.log('❌ [getRemainingClipsForConversation] Conversation not found');
      return { remaining: 0, total: 0, used: 0, error: 'Conversation not found' };
    }

    console.log(`✅ [getRemainingClipsForConversation] Conversation found:`);
    console.log(`   - player_id: ${conversation.player_id}`);
    console.log(`   - coach_id: ${conversation.coach_id}`);
    console.log(`   - session_id: ${conversation.session_id || 'NULL'}`);
    console.log(`   - sport: ${conversation.sport || 'N/A'}`);

    let totalRemaining = 0;
    let totalUsed = 0;
    let totalClips = 0;

    // First, try to get the session directly from conversation.session_id if it exists
    if (conversation.session_id) {
      console.log(`🔍 Trying to get session directly: ${conversation.session_id}`);
      const session = await getCoachingSession(conversation.session_id);
      if (session) {
        console.log(`✅ Session found in database: status=${session.status}, clips_remaining=${session.clips_remaining}, clips_uploaded=${session.clips_uploaded}`);
        console.log(`   Session details: expiry=${session.session_expiry}, created_at=${session.created_at}`);
        
        // Check if session is expired or inactive
        if (session.status === 'active') {
          const sessionExpiry = new Date(session.session_expiry);
          const now = new Date();
          console.log(`   Session expiry: ${sessionExpiry.toISOString()}, now: ${now.toISOString()}`);
          if (sessionExpiry >= now) {
            totalRemaining = session.clips_remaining || 0;
            totalUsed = session.clips_uploaded || 0;
            totalClips = totalRemaining + totalUsed;
            console.log(`✅ Using direct session: remaining=${totalRemaining}, used=${totalUsed}, total=${totalClips}`);
            return {
              remaining: totalRemaining,
              total: totalClips,
              used: totalUsed
            };
          } else {
            console.log('⚠️ Session has expired');
          }
        } else {
          console.log(`⚠️ Session is not active (status: ${session.status})`);
        }
      } else {
        console.log(`❌ Session not found by ID: ${conversation.session_id}`);
        console.log(`   This means the session doesn't exist in the database.`);
        console.log(`   Possible reasons:`);
        console.log(`   1. The webhook didn't create the session`);
        console.log(`   2. The session was created with a different ID`);
        console.log(`   3. The session was deleted`);
        
        // Check if there are any sessions in the database at all for this coach
        if (isSupabaseConfigured) {
          const { data: anySessions, error: anyError } = await supabase
            .from('coaching_sessions')
            .select('id, status, clips_remaining, created_at, session_expiry')
            .eq('coach_id', conversation.coach_id)
            .order('created_at', { ascending: false })
            .limit(5);
          
          if (!anyError && anySessions) {
            console.log(`   Found ${anySessions.length} total sessions for this coach (any status):`);
            anySessions.forEach(s => {
              console.log(`     - ${s.id}: status=${s.status}, clips=${s.clips_remaining}, created=${s.created_at}`);
            });
          }
        }
      }
    } else {
      console.log('⚠️ Conversation does not have a session_id');
    }

    // If no clips found from direct session lookup, get all active sessions for this player-coach pair
    console.log('🔍 No clips from direct session, trying to get all active sessions for player-coach pair');
    const activeSessions = await getActiveSessionsForPlayerCoach(
      conversation.player_id,
      conversation.coach_id
    );

    console.log(`Found ${activeSessions.length} active sessions for player-coach pair`);

    // Sum up clips from all active sessions
    for (const session of activeSessions) {
      if (session.status === 'active') {
        const sessionExpiry = new Date(session.session_expiry);
        if (sessionExpiry >= new Date()) {
          const sessionRemaining = session.clips_remaining || 0;
          const sessionUsed = session.clips_uploaded || 0;
          totalRemaining += sessionRemaining;
          totalUsed += sessionUsed;
          console.log(`➕ Adding session ${session.id}: remaining=${sessionRemaining}, used=${sessionUsed}`);
        }
      }
    }
    totalClips = totalRemaining + totalUsed;
    
    // If we found clips from active sessions, update the conversation to link to the most recent session
    if (totalRemaining > 0 && activeSessions.length > 0 && (!conversation.session_id || conversation.session_id !== activeSessions[0].id)) {
      const mostRecentSession = activeSessions[0];
      console.log(`🔗 Updating conversation ${conversationId} to link to session ${mostRecentSession.id}`);
      try {
        await supabase
          .from('conversations')
          .update({ session_id: mostRecentSession.id })
          .eq('id', conversationId);
      } catch (updateError) {
        console.error('Error updating conversation session_id:', updateError);
      }
    }

    // If still no clips found, try a more aggressive fallback:
    // Query all active sessions for this coach and check if any conversation exists for this player-coach pair
    if (totalRemaining === 0 && totalUsed === 0) {
      console.log('🔍 Still no clips found, trying aggressive fallback: querying all active sessions for coach');
      if (isSupabaseConfigured) {
        // First, check ALL sessions (not just active) to see what exists
        const { data: allSessionsAnyStatus, error: allStatusError } = await supabase
          .from('coaching_sessions')
          .select('id, status, clips_remaining, created_at, session_expiry')
          .eq('coach_id', conversation.coach_id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!allStatusError && allSessionsAnyStatus) {
          console.log(`   Found ${allSessionsAnyStatus.length} total sessions for coach (any status):`);
          allSessionsAnyStatus.forEach(s => {
            console.log(`     - ${s.id}: status=${s.status}, clips=${s.clips_remaining}, created=${s.created_at}, expiry=${s.session_expiry}`);
          });
        }
        
        // Get all active sessions for this coach
        const { data: allCoachSessions, error: allSessionsError } = await supabase
          .from('coaching_sessions')
          .select('*')
          .eq('coach_id', conversation.coach_id)
          .eq('status', 'active')
          .gte('session_expiry', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(20); // Increase limit to check more sessions

        console.log(`   Querying active sessions: coach_id=${conversation.coach_id}, status=active, expiry>=${new Date().toISOString()}`);

        if (!allSessionsError && allCoachSessions && allCoachSessions.length > 0) {
          console.log(`   ✅ Found ${allCoachSessions.length} active sessions for coach`);
          console.log(`Found ${allCoachSessions.length} active sessions for coach (aggressive fallback)`);
          
          // Get all conversations for this player-coach pair (regardless of session_id)
          const { data: playerConversations, error: playerConvError } = await supabase
            .from('conversations')
            .select('session_id, id')
            .eq('player_id', conversation.player_id)
            .eq('coach_id', conversation.coach_id)
            .eq('status', 'active');

          if (!playerConvError && playerConversations) {
            console.log(`Found ${playerConversations.length} conversations for player-coach pair`);
            
            // Extract session_ids from conversations
            const playerSessionIds = playerConversations
              .map(conv => conv.session_id)
              .filter(Boolean);
            
            console.log(`Player has ${playerSessionIds.length} session_ids in conversations:`, playerSessionIds);
            
            // Check if any of the coach's sessions match the player's session_ids
            for (const session of allCoachSessions) {
              if (playerSessionIds.includes(session.id)) {
                const sessionRemaining = session.clips_remaining || 0;
                const sessionUsed = session.clips_uploaded || 0;
                totalRemaining += sessionRemaining;
                totalUsed += sessionUsed;
                console.log(`➕ Found matching session ${session.id}: remaining=${sessionRemaining}, used=${sessionUsed}`);
              }
            }
            
            // If still no clips and we have conversations but no session_ids, 
            // try to match sessions with conversations more intelligently
            // (This handles the case where a session was created but conversation wasn't linked)
            if (totalRemaining === 0 && totalUsed === 0 && playerConversations.length > 0) {
              console.log('🔍 No session_ids in conversations, trying intelligent matching');
              
              // Strategy 1: If there's exactly one active session for this coach and one conversation for this player-coach pair,
              // assume they're linked (common case after a purchase)
              if (allCoachSessions.length === 1 && playerConversations.length >= 1) {
                const session = allCoachSessions[0];
                // Find the conversation that matches the current conversationId, or use the first one
                const conversationToLink = playerConversations.find(conv => conv.id === conversationId) || playerConversations[0];
                
                console.log(`🔗 Found single session ${session.id} and conversation ${conversationToLink.id}, assuming they're linked`);
                const sessionRemaining = session.clips_remaining || 0;
                const sessionUsed = session.clips_uploaded || 0;
                totalRemaining += sessionRemaining;
                totalUsed += sessionUsed;
                console.log(`➕ Using single session: remaining=${sessionRemaining}, used=${sessionUsed}`);
                
                // Update the conversation to link it to this session
                if (!conversationToLink.session_id || conversationToLink.session_id !== session.id) {
                  console.log(`🔗 Updating conversation ${conversationToLink.id} to link to session ${session.id}`);
                  try {
                    await supabase
                      .from('conversations')
                      .update({ session_id: session.id })
                      .eq('id', conversationToLink.id);
                  } catch (updateError) {
                    console.error('Error updating conversation session_id:', updateError);
                  }
                }
              } else if (allCoachSessions.length > 0) {
                // Strategy 2: Check if any recent sessions (within last 4 hours) might belong to this player
                // Use a longer window to catch sessions created by webhooks
                const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
                
                // Find the conversation that matches the current conversationId, or use one without a session_id
                const conversationToLink = playerConversations.find(conv => conv.id === conversationId) || 
                                         playerConversations.find(conv => !conv.session_id) || 
                                         playerConversations[0];
                
                for (const session of allCoachSessions) {
                  const sessionCreated = new Date(session.created_at);
                  
                  if (sessionCreated >= fourHoursAgo) {
                    console.log(`🔗 Found recent session ${session.id} created ${sessionCreated.toISOString()}, checking if it belongs to this player`);
                    
                    // Check if this session isn't already linked to another conversation for a different player
                    const { data: otherConversations } = await supabase
                      .from('conversations')
                      .select('player_id')
                      .eq('session_id', session.id)
                      .neq('player_id', conversation.player_id)
                      .limit(1);
                    
                    // If no other player has this session, or if the conversation doesn't have a session_id, link them
                    if ((!otherConversations || otherConversations.length === 0) && 
                        (!conversationToLink.session_id || conversationToLink.session_id !== session.id)) {
                      console.log(`🔗 Linking recent session ${session.id} to conversation ${conversationToLink.id}`);
                      const sessionRemaining = session.clips_remaining || 0;
                      const sessionUsed = session.clips_uploaded || 0;
                      totalRemaining += sessionRemaining;
                      totalUsed += sessionUsed;
                      console.log(`➕ Using recent session: remaining=${sessionRemaining}, used=${sessionUsed}`);
                      
                      // Update the conversation to link it to this session
                      try {
                        await supabase
                          .from('conversations')
                          .update({ session_id: session.id })
                          .eq('id', conversationToLink.id);
                      } catch (updateError) {
                        console.error('Error updating conversation session_id:', updateError);
                      }
                      
                      // Only use the first matching session to avoid double-counting
                      break;
                    }
                  }
                }
              }
            }
            
            totalClips = totalRemaining + totalUsed;
          }
        }
      }
    }

    console.log(`📊 Final clip count: remaining=${totalRemaining}, used=${totalUsed}, total=${totalClips}`);

    return {
      remaining: totalRemaining,
      total: totalClips,
      used: totalUsed
    };
  } catch (err) {
    console.error('❌ Database error in getRemainingClipsForConversation:', err);
    throw err;
  }
}

/**
 * Decrement clips remaining when a video is sent
 */
async function decrementClipsForConversation(conversationId) {
  try {
    // Get the conversation to find the session_id
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    let sessionToUpdate = null;

    // If conversation has a session_id, try to use that session
    if (conversation.session_id) {
      const session = await getCoachingSession(conversation.session_id);
      if (session && session.status === 'active') {
        const sessionExpiry = new Date(session.session_expiry);
        if (sessionExpiry >= new Date() && (session.clips_remaining || 0) > 0) {
          sessionToUpdate = session;
        }
      }
    }

    // If no valid session found, find the most recent active session with clips
    if (!sessionToUpdate) {
      const activeSessions = await getActiveSessionsForPlayerCoach(
        conversation.player_id,
        conversation.coach_id
      );

      // Find the first session with clips remaining
      for (const session of activeSessions) {
        if (session.status === 'active') {
          const sessionExpiry = new Date(session.session_expiry);
          if (sessionExpiry >= new Date() && (session.clips_remaining || 0) > 0) {
            sessionToUpdate = session;
            break;
          }
        }
      }
    }

    if (!sessionToUpdate) {
      throw new Error('No active session with clips remaining found');
    }

    // Check if there are clips remaining
    if (sessionToUpdate.clips_remaining <= 0) {
      throw new Error('No clips remaining');
    }

    // Decrement clips_remaining and increment clips_uploaded
    const updatedSession = await updateCoachingSession(sessionToUpdate.id, {
      clips_remaining: sessionToUpdate.clips_remaining - 1,
      clips_uploaded: (sessionToUpdate.clips_uploaded || 0) + 1
    });

    return {
      remaining: updatedSession.clips_remaining,
      total: updatedSession.clips_remaining + updatedSession.clips_uploaded,
      used: updatedSession.clips_uploaded
    };
  } catch (err) {
    console.error('Database error in decrementClipsForConversation:', err);
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
    console.log(`🔍 [getConversation] Looking up conversation: ${conversationId}`);
    
    // Check if Supabase is properly configured
    if (!supabaseServiceKey || supabaseServiceKey.includes('YourServiceKeyHere')) {
      console.log('⚠️ Using in-memory storage for conversation lookup (Supabase not configured)');
      
      // Return conversation from in-memory storage
      const conversation = conversations.find(conv => conv.id === conversationId);
      console.log(`🔍 [getConversation] In-memory result:`, conversation ? 'Found' : 'Not found');
      return conversation || null;
    }

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ [getConversation] Error getting conversation:', error);
      throw error;
    }

    if (data) {
      console.log(`✅ [getConversation] Found conversation: player_id=${data.player_id}, coach_id=${data.coach_id}, session_id=${data.session_id || 'NULL'}`);
    } else {
      console.log(`⚠️ [getConversation] Conversation not found in database`);
    }

    return data;
  } catch (err) {
    console.error('❌ [getConversation] Database error:', err);
    
    // Fallback to in-memory storage if Supabase fails
    console.log('⚠️ [getConversation] Falling back to in-memory storage');
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
  getRemainingClipsForConversation,
  decrementClipsForConversation,
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
