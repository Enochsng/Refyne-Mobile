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
  console.log(`[stripe-connect-lookup] getCoachConnectAccount called with coachId=${JSON.stringify(coachId)} (typeof=${typeof coachId}, length=${coachId?.length})`);

  try {
    // Use only the columns that definitely exist
    const { data, error } = await supabase
      .from('coach_connect_accounts')
      .select('id, coach_id, stripe_account_id, account_type, country, email, charges_enabled, payouts_enabled, details_submitted, onboarding_completed, created_at, updated_at')
      .eq('coach_id', coachId)
      .single();

    console.log(`[stripe-connect-lookup] Supabase query result for coach_id=${JSON.stringify(coachId)}:`, {
      error: error ? { code: error.code, message: error.message, details: error.details } : null,
      data: data ?? null,
    });

    if (error && error.code === 'PGRST116') {
      console.log(`[stripe-connect-lookup] No row found in coach_connect_accounts for coach_id=${JSON.stringify(coachId)} (PGRST116)`);
      return null;
    }

    if (error) {
      console.error('[stripe-connect-lookup] Error getting coach connect account:', error);
      throw error;
    }

    if (data) {
      console.log(`[stripe-connect-lookup] Row found for coach_id=${data.coach_id}:`, {
        stripe_account_id: data.stripe_account_id ?? null,
        charges_enabled: data.charges_enabled,
        payouts_enabled: data.payouts_enabled,
        onboarding_completed: data.onboarding_completed,
        details_submitted: data.details_submitted,
      });
      if (!data.stripe_account_id) {
        console.log(`[stripe-connect-lookup] Row exists but stripe_account_id is missing/empty for coach_id=${data.coach_id}`);
      }
    }

    return data;
  } catch (err) {
    console.error('[stripe-connect-lookup] Database error in getCoachConnectAccount:', err);
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
 * Update coach connect account status by Stripe account ID
 */
async function updateCoachConnectAccountByStripeId(stripeAccountId, status) {
  try {
    const { data, error } = await supabase
      .from('coach_connect_accounts')
      .update({
        charges_enabled: status.charges_enabled,
        payouts_enabled: status.payouts_enabled,
        details_submitted: status.details_submitted,
        onboarding_completed: status.onboarding_completed,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_account_id', stripeAccountId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error updating coach connect account by Stripe ID:', error);
      throw error;
    }

    console.log(`Coach connect account updated by Stripe ID: ${stripeAccountId}`);
    return data;
  } catch (err) {
    console.error('Database error in updateCoachConnectAccountByStripeId:', err);
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
    let linkedSession = null;

    // First, try to get the session directly from conversation.session_id if it exists
    if (conversation.session_id) {
      console.log(`🔍 Trying to get session directly: ${conversation.session_id}`);
      const session = await getCoachingSession(conversation.session_id);
      if (session) {
        linkedSession = session;
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

        // When a session is linked, only use that session — don't aggregate older packages
        return {
          remaining: totalRemaining,
          total: totalClips,
          used: totalUsed,
        };
      }

      console.log(`❌ Session not found by ID: ${conversation.session_id}`);
      return { remaining: 0, total: 0, used: 0 };
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
          .select('id, status, clips_remaining, clips_uploaded, created_at, session_expiry')
          .eq('coach_id', conversation.coach_id)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!allStatusError && allSessionsAnyStatus) {
          console.log(`   Found ${allSessionsAnyStatus.length} total sessions for coach (any status):`);
          allSessionsAnyStatus.forEach(s => {
            console.log(`     - ${s.id}: status=${s.status}, clips=${s.clips_remaining}, created=${s.created_at}, expiry=${s.session_expiry}`);
          });
        }

        const { data: playerConversations, error: playerConvError } = await supabase
          .from('conversations')
          .select('session_id, id')
          .eq('player_id', conversation.player_id)
          .eq('coach_id', conversation.coach_id)
          .eq('status', 'active');
        
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

        // Secondary fallback: show stored totals from expired/inactive sessions linked via conversation rows
        if (totalRemaining === 0 && totalUsed === 0 && !linkedSession && !allStatusError && allSessionsAnyStatus && !playerConvError && playerConversations) {
          const currentConvSessionId = playerConversations.find((conv) => conv.id === conversationId)?.session_id;
          const playerSessionIds = currentConvSessionId
            ? [currentConvSessionId]
            : playerConversations.map((conv) => conv.session_id).filter(Boolean);

          for (const session of allSessionsAnyStatus) {
            if (playerSessionIds.includes(session.id)) {
              const storedUsed = session.clips_uploaded || 0;
              const storedRemaining = session.clips_remaining || 0;
              const storedTotal = storedUsed + storedRemaining;

              if (storedTotal > 0) {
                console.log(`📦 Using expired/inactive session ${session.id} for display: total=${storedTotal}, used=${storedUsed}`);
                return {
                  remaining: 0,
                  total: storedTotal,
                  used: storedUsed,
                };
              }
            }
          }
        }
      }
    }

    // Display-only fallback for expired/inactive linked sessions (no new clips allowed)
    if (totalRemaining === 0 && totalUsed === 0 && linkedSession) {
      const storedUsed = linkedSession.clips_uploaded || 0;
      const storedRemaining = linkedSession.clips_remaining || 0;
      const storedTotal = storedUsed + storedRemaining;

      if (storedTotal > 0) {
        console.log(`📦 Using linked expired/inactive session ${linkedSession.id} for display: total=${storedTotal}, used=${storedUsed}`);
        return {
          remaining: 0,
          total: storedTotal,
          used: storedUsed,
        };
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
 * Check if chat is expired based on session created_at and package days
 * Returns { isExpired: boolean, expiresAt: Date, daysRemaining: number }
 */
async function checkChatExpiry(conversationId) {
  try {
    // Get the conversation to find the session_id
    const conversation = await getConversation(conversationId);
    if (!conversation || !conversation.session_id) {
      // If no session, chat is not expired (for backwards compatibility)
      return { isExpired: false, expiresAt: null, daysRemaining: null };
    }

    // Get the coaching session
    const session = await getCoachingSession(conversation.session_id);
    if (!session) {
      // If no session found, chat is not expired (for backwards compatibility)
      return { isExpired: false, expiresAt: null, daysRemaining: null };
    }

    // Get package info to determine chat duration
    const { getPackageInfo } = require('../config/stripe');
    let chatDurationDays = null;
    
    try {
      const packageInfo = getPackageInfo(session.sport, session.package_type, session.package_id);
      chatDurationDays = packageInfo.days;
    } catch (pkgError) {
      console.error('Error getting package info for chat expiry:', pkgError);
      // Default to 3 days if package info not found
      chatDurationDays = 3;
    }

    // Calculate chat expiry based on session created_at + chat duration
    const sessionCreatedAt = new Date(session.created_at);
    const chatExpiresAt = new Date(sessionCreatedAt);
    chatExpiresAt.setHours(chatExpiresAt.getHours() + (chatDurationDays * 24)); // Add days in hours

    const now = new Date();
    const isExpired = now > chatExpiresAt;
    
    // Calculate days remaining (can be negative if expired)
    const msRemaining = chatExpiresAt - now;
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

    return {
      isExpired,
      expiresAt: chatExpiresAt.toISOString(),
      daysRemaining: isExpired ? 0 : daysRemaining,
      chatDurationDays
    };
  } catch (err) {
    console.error('Database error in checkChatExpiry:', err);
    // On error, assume chat is not expired to avoid blocking users
    return { isExpired: false, expiresAt: null, daysRemaining: null, error: err.message };
  }
}

function getSessionExpiryValue(session) {
  return session?.session_expiry ?? null;
}

function isSessionActive(session) {
  const expiryValue = getSessionExpiryValue(session);
  const now = new Date();
  if (!expiryValue) {
    console.log('[isSessionActive] inactive: missing session_expiry', {
      sessionId: session?.id,
      status: session?.status,
    });
    return false;
  }
  const expiryDate = new Date(expiryValue);
  const statusActive = (session.status || '').toLowerCase() === 'active';
  const notExpired = expiryDate >= now;
  console.log('[isSessionActive] check:', {
    sessionId: session.id,
    status: session.status,
    session_expiry: expiryValue,
    now: now.toISOString(),
    statusActive,
    notExpired,
    isActive: statusActive && notExpired,
    rawSession: session,
  });
  return statusActive && notExpired;
}

function logResolvedSession(conversation, session, step) {
  console.log(`[resolveActiveSessionForConversation] resolved via ${step}:`, {
    conversationId: conversation.id,
    player_id: conversation.player_id,
    coach_id: conversation.coach_id,
    linkedSessionId: conversation.session_id,
    resolvedSessionId: session?.id,
    session_expiry: getSessionExpiryValue(session),
  });
}

async function linkConversationToSession(conversationId, sessionId) {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }
  try {
    await supabase
      .from('conversations')
      .update({ session_id: sessionId })
      .eq('id', conversationId);
  } catch (updateError) {
    console.error('Error updating conversation session_id:', updateError);
  }
}

/**
 * Resolve the active coaching session for a conversation, with fallbacks when
 * session_id is missing or points to an expired session.
 */
async function resolveActiveSessionForConversation(conversation) {
  if (!conversation) {
    return null;
  }

  console.log('[resolveActiveSessionForConversation] start:', {
    conversationId: conversation.id,
    player_id: conversation.player_id,
    coach_id: conversation.coach_id,
    session_id: conversation.session_id,
  });

  // 1. Direct lookup via conversation.session_id
  if (conversation.session_id) {
    try {
      const session = await getCoachingSession(conversation.session_id);
      console.log('[resolveActiveSessionForConversation] direct lookup:', {
        sessionId: conversation.session_id,
        found: Boolean(session),
        session_expiry: getSessionExpiryValue(session),
      });
      if (isSessionActive(session)) {
        logResolvedSession(conversation, session, 'direct');
        return session;
      }
    } catch (err) {
      console.error('[resolveActiveSessionForConversation] direct lookup error:', err);
    }
  } else {
    console.log('[resolveActiveSessionForConversation] direct lookup skipped: no session_id');
  }

  // 2. Player-coach pair lookup
  const pairSessions = await getActiveSessionsForPlayerCoach(
    conversation.player_id,
    conversation.coach_id
  );
  console.log('[resolveActiveSessionForConversation] pair lookup:', {
    pairSessionCount: pairSessions.length,
    pairSessionIds: pairSessions.map(s => s.id),
  });
  const pairSession = pairSessions.find(isSessionActive);
  if (pairSession) {
    if (conversation.session_id !== pairSession.id) {
      await linkConversationToSession(conversation.id, pairSession.id);
    }
    logResolvedSession(conversation, pairSession, 'pair');
    return pairSession;
  }

  // 3. Broader fallback: all active non-expired sessions for this coach
  if (!isSupabaseConfigured || !supabase) {
    console.log('[resolveActiveSessionForConversation] broad lookup skipped: Supabase not configured');
    return null;
  }

  const { data: allCoachSessions, error: allSessionsError } = await supabase
    .from('coaching_sessions')
    .select('*')
    .eq('coach_id', conversation.coach_id)
    .eq('status', 'active')
    .gte('session_expiry', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  if (allSessionsError || !allCoachSessions || allCoachSessions.length === 0) {
    console.log('[resolveActiveSessionForConversation] broad lookup: no active coach sessions', {
      error: allSessionsError?.message,
    });
    return null;
  }

  console.log('[resolveActiveSessionForConversation] broad lookup:', {
    coachSessionCount: allCoachSessions.length,
    coachSessionIds: allCoachSessions.map(s => s.id),
  });

  const { data: playerConversations, error: playerConvError } = await supabase
    .from('conversations')
    .select('session_id, id')
    .eq('player_id', conversation.player_id)
    .eq('coach_id', conversation.coach_id)
    .eq('status', 'active');

  if (playerConvError || !playerConversations) {
    console.log('[resolveActiveSessionForConversation] broad lookup: failed to load player conversations', {
      error: playerConvError?.message,
    });
    return null;
  }

  const playerSessionIds = playerConversations
    .map(conv => conv.session_id)
    .filter(Boolean);

  // Match sessions referenced by any conversation for this player-coach pair
  for (const session of allCoachSessions) {
    if (playerSessionIds.includes(session.id) && isSessionActive(session)) {
      if (conversation.session_id !== session.id) {
        await linkConversationToSession(conversation.id, session.id);
      }
      logResolvedSession(conversation, session, 'broad-linked');
      return session;
    }
  }

  // Single active session + conversation heuristic
  if (allCoachSessions.length === 1 && playerConversations.length >= 1) {
    const session = allCoachSessions[0];
    if (isSessionActive(session)) {
      await linkConversationToSession(conversation.id, session.id);
      logResolvedSession(conversation, session, 'broad-single');
      return session;
    }
  }

  // 4. Unlinked session matching (valid until session_expiry, no 4-hour created_at gate)
  let preferredUnlinkedSession = null;
  let fallbackUnlinkedSession = null;

  for (const session of allCoachSessions) {
    if (!isSessionActive(session)) {
      continue;
    }

    const { data: otherPlayerConversations } = await supabase
      .from('conversations')
      .select('player_id')
      .eq('session_id', session.id)
      .neq('player_id', conversation.player_id)
      .limit(1);

    if (otherPlayerConversations && otherPlayerConversations.length > 0) {
      continue;
    }

    if (playerSessionIds.includes(session.id)) {
      preferredUnlinkedSession = session;
      break;
    }

    if (!fallbackUnlinkedSession) {
      fallbackUnlinkedSession = session;
    }
  }

  const unlinkedSession = preferredUnlinkedSession || fallbackUnlinkedSession;
  if (unlinkedSession) {
    await linkConversationToSession(conversation.id, unlinkedSession.id);
    logResolvedSession(conversation, unlinkedSession, 'unlinked');
    return unlinkedSession;
  }

  console.log('[resolveActiveSessionForConversation] no active session resolved:', {
    conversationId: conversation.id,
  });
  return null;
}

/**
 * Check if a conversation's linked session is still active based on session_expiry
 * Returns { isActive: boolean, isExpired: boolean, expiresAt: string|null }
 */
async function checkSessionActive(conversationId) {
  try {
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      const result = { isActive: false, isExpired: true, expiresAt: null };
      console.log('[checkSessionActive] result', {
        conversationId,
        inputSessionId: null,
        result,
      });
      return result;
    }

    const session = await resolveActiveSessionForConversation(conversation);
    if (session) {
      const result = {
        isActive: true,
        isExpired: false,
        expiresAt: getSessionExpiryValue(session),
        sessionId: session.id,
      };
      console.log('[checkSessionActive] result', {
        conversationId,
        inputSessionId: conversation.session_id,
        result,
      });
      return result;
    }

    const result = { isActive: false, isExpired: true, expiresAt: null };
    console.log('[checkSessionActive] result', {
      conversationId,
      inputSessionId: conversation.session_id,
      result,
    });
    return result;
  } catch (err) {
    console.error('Database error in checkSessionActive:', err);
    return { isActive: false, isExpired: true, expiresAt: null, error: err.message };
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
 * Daily Message Count Management
 * Tracks how many text messages a player has sent per day (limit: 5 per day)
 */

/**
 * Get remaining daily messages for a conversation
 * Returns { remaining: number, used: number, total: number }
 */
async function getRemainingDailyMessagesForConversation(conversationId) {
  try {
    const DAILY_MESSAGE_LIMIT = 5;
    
    // Get the conversation to find the player_id
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return { remaining: 0, used: 0, total: DAILY_MESSAGE_LIMIT, error: 'Conversation not found' };
    }

    // Get today's date range (start of day to end of day in EST/EDT)
    // EST is UTC-5, EDT is UTC-4 (daylight saving time)
    const now = new Date();
    
    // Get current date parts in EST/EDT timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
    const parts = formatter.formatToParts(now);
    const estParts = {};
    parts.forEach(part => {
      estParts[part.type] = part.value;
    });
    
    // Determine if we're currently in EST (UTC-5) or EDT (UTC-4)
    // Check the timezone name to see if it's EDT or EST
    const timeZoneFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      timeZoneName: 'short'
    });
    const timeZoneParts = timeZoneFormatter.formatToParts(now);
    const timeZoneName = timeZoneParts.find(part => part.type === 'timeZoneName')?.value || '';
    
    // EDT (Eastern Daylight Time) is UTC-4, EST (Eastern Standard Time) is UTC-5
    const offset = timeZoneName.includes('EDT') ? '-04:00' : '-05:00';
    
    // Create start and end of day in EST/EDT, then convert to UTC for database queries
    // JavaScript Date constructor automatically converts these to UTC
    const startOfDay = new Date(`${estParts.year}-${estParts.month}-${estParts.day}T00:00:00${offset}`);
    const endOfDay = new Date(`${estParts.year}-${estParts.month}-${estParts.day}T23:59:59.999${offset}`);

    // Scope daily counts to the linked session so repurchases reset today's limit
    let countFrom = startOfDay;
    if (conversation.session_id) {
      const session = await getCoachingSession(conversation.session_id);
      if (session?.created_at) {
        countFrom = new Date(
          Math.max(startOfDay.getTime(), new Date(session.created_at).getTime())
        );
      }
    }
    
    // Count text messages sent by the player today (since session start if repurchased today)
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .eq('sender_id', conversation.player_id)
      .eq('sender_type', 'player')
      .eq('message_type', 'text')
      .gte('created_at', countFrom.toISOString())
      .lte('created_at', endOfDay.toISOString());

    if (error) {
      console.error('Error getting daily message count:', error);
      // On error, return default values (assume no messages sent today)
      return { remaining: DAILY_MESSAGE_LIMIT, used: 0, total: DAILY_MESSAGE_LIMIT };
    }

    const used = messages ? messages.length : 0;
    const remaining = Math.max(0, DAILY_MESSAGE_LIMIT - used);

    return {
      remaining,
      used,
      total: DAILY_MESSAGE_LIMIT
    };
  } catch (err) {
    console.error('Database error in getRemainingDailyMessagesForConversation:', err);
    // On error, return default values (assume no messages sent today)
    return { remaining: 5, used: 0, total: 5 };
  }
}

/**
 * Check if player can send a text message today (hasn't reached daily limit)
 * Returns { canSend: boolean, remaining: number, used: number }
 */
async function canPlayerSendMessageToday(conversationId) {
  try {
    const messageInfo = await getRemainingDailyMessagesForConversation(conversationId);
    return {
      canSend: messageInfo.remaining > 0,
      remaining: messageInfo.remaining,
      used: messageInfo.used,
      total: messageInfo.total
    };
  } catch (err) {
    console.error('Database error in canPlayerSendMessageToday:', err);
    // On error, allow sending (fail open)
    return { canSend: true, remaining: 5, used: 0, total: 5 };
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
  console.log(`[stripe-connect-lookup] getCoachConnectAccountId called with coachId=${JSON.stringify(coachId)} (typeof=${typeof coachId}, length=${coachId?.length})`);
  
  try {
    // First try to get from database
    const account = await getCoachConnectAccount(coachId);
    console.log(`[stripe-connect-lookup] getCoachConnectAccountId DB account result:`, account ?? null);
    
    if (account?.stripe_account_id) {
      console.log(`[stripe-connect-lookup] Found Stripe account ID: ${account.stripe_account_id} for coach: ${coachId}`);
      return account.stripe_account_id;
    }

    if (account && !account.stripe_account_id) {
      console.log(`[stripe-connect-lookup] DB row exists but stripe_account_id is empty — falling through to hardcoded mapping for coachId=${JSON.stringify(coachId)}`);
    } else {
      console.log(`[stripe-connect-lookup] No DB row — falling through to hardcoded mapping for coachId=${JSON.stringify(coachId)}`);
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
      console.log(`[stripe-connect-lookup] Using hardcoded mapping: coachId=${JSON.stringify(coachId)} -> stripeAccountId=${stripeAccountId}`);
      return stripeAccountId;
    }

    console.log(`[stripe-connect-lookup] No hardcoded mapping for coachId=${JSON.stringify(coachId)}`);
    
    // No account found - coach needs to set up Stripe Connect
    console.error(`[stripe-connect-lookup] No Stripe Connect account found for coach: ${coachId}`);
    console.error(`[stripe-connect-lookup] Coach ${coachId} needs to complete Stripe Connect setup before receiving payments`);
    return null;
    
  } catch (err) {
    console.error('[stripe-connect-lookup] Error getting coach connect account ID:', err);
    
    // Fallback to mapping if database fails
    const coachStripeAccountMapping = {
      'e9f47d75-cd92-4a0f-810c-7258ea03d47f': 'acct_1SGRN1PYPuQf9f7C', // Enokski's Stripe account
      'test_coach': 'acct_1SGPzsAxPT8ZZc4c', // Test Coach's Stripe account
      'daniel': 'acct_1SGRN1PYPuQf9f7C', // Daniel temporarily using Enokski's account (until Daniel's account is fixed)
    };
    
    const stripeAccountId = coachStripeAccountMapping[coachId];
    if (stripeAccountId) {
      console.log(`[stripe-connect-lookup] Fallback (after DB error): Using hardcoded mapping coachId=${JSON.stringify(coachId)} -> stripeAccountId=${stripeAccountId}`);
      return stripeAccountId;
    }
    
    console.error(`[stripe-connect-lookup] No Stripe Connect account available for coach: ${coachId}`);
    return null;
  }
}

/**
 * Conversations and Messages Management
 */

function isPlaceholderPlayerId(playerId) {
  if (!playerId) return true;
  if (['temp_user', 'temp_user_session', 'temp_player'].includes(playerId)) return true;
  if (playerId.startsWith('player_')) return true;
  return false;
}

async function expireCoachingSession(sessionId) {
  if (!sessionId || !isSupabaseConfigured || !supabase) return;

  try {
    await supabase
      .from('coaching_sessions')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', sessionId);
    console.log(`✅ Expired prior coaching session: ${sessionId}`);
  } catch (err) {
    console.error(`Error expiring coaching session ${sessionId}:`, err);
  }
}

/**
 * True if either user has blocked the other (A→B or B→A).
 */
async function isPairBlocked(userA, userB) {
  if (!userA || !userB || !isSupabaseConfigured || !supabase) {
    return false;
  }

  const a = String(userA);
  const b = String(userB);

  // blocks.blocker_id / blocked_id are UUID; skip query for legacy non-UUID pair ids
  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(a) || !UUID_REGEX.test(b)) {
    console.warn(
      `[isPairBlocked] Skipping block check — non-UUID id(s): userA=${a}, userB=${b}`
    );
    return false;
  }

  const { data, error } = await supabase
    .from('blocks')
    .select('id')
    .or(
      `and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`
    )
    .limit(1);

  if (error) {
    console.error('Error checking isPairBlocked:', error);
    throw error;
  }

  return Array.isArray(data) && data.length > 0;
}

/**
 * Conversations for this user pair only (player↔coach either way).
 */
async function findConversationsForUserPair(userA, userB) {
  if (!userA || !userB || !isSupabaseConfigured || !supabase) {
    return [];
  }

  const a = String(userA);
  const b = String(userB);

  const { data, error } = await supabase
    .from('conversations')
    .select('id, player_id, coach_id, session_id')
    .or(
      `and(player_id.eq.${a},coach_id.eq.${b}),and(player_id.eq.${b},coach_id.eq.${a})`
    );

  if (error) {
    console.error('Error finding conversations for user pair:', error);
    throw error;
  }

  return data || [];
}

/**
 * Archive conversations for the pair. Does not expire or otherwise mutate paid sessions —
 * natural session expiry continues to count down while blocked.
 */
async function applyBlockSideEffects(blockerId, blockedId) {
  const pairConversations = await findConversationsForUserPair(blockerId, blockedId);
  const archivedConversationIds = [];
  const nowIso = new Date().toISOString();

  for (const conv of pairConversations) {
    const { error } = await supabase
      .from('conversations')
      .update({ archived_at: nowIso, updated_at: nowIso })
      .eq('id', conv.id);

    if (error) {
      console.error(`Error archiving conversation ${conv.id}:`, error);
      throw error;
    }
    archivedConversationIds.push(conv.id);
  }

  // Response shape kept for API compatibility; sessions are no longer force-expired on block.
  return { archivedConversationIds, expiredSessionIds: [] };
}

/**
 * Insert a block row, then archive the pair's conversation(s).
 * On unique (blocker_id, blocked_id) conflict, throws ALREADY_BLOCKED (no raw Postgres error).
 */
async function createBlockWithSideEffects(blockerId, blockedId) {
  if (!blockerId || !blockedId) {
    const err = new Error('blockerId and blockedId are required');
    err.code = 'INVALID_BLOCK';
    throw err;
  }

  if (String(blockerId) === String(blockedId)) {
    const err = new Error('Cannot block yourself');
    err.code = 'SELF_BLOCK';
    throw err;
  }

  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase is not configured');
    err.code = 'SUPABASE_NOT_CONFIGURED';
    throw err;
  }

  const { data: block, error: insertError } = await supabase
    .from('blocks')
    .insert({
      blocker_id: blockerId,
      blocked_id: blockedId,
    })
    .select()
    .single();

  if (insertError) {
    if (isUniqueViolationError(insertError) || insertError.code === '23505') {
      const already = new Error('You have already blocked this user');
      already.code = 'ALREADY_BLOCKED';
      throw already;
    }
    console.error('Error inserting block:', insertError);
    throw insertError;
  }

  const sideEffects = await applyBlockSideEffects(blockerId, blockedId);

  return {
    block,
    archivedConversationIds: sideEffects.archivedConversationIds,
    expiredSessionIds: sideEffects.expiredSessionIds,
  };
}

/**
 * List blocks created by the given user (blocker_id).
 */
async function listBlocksForUser(blockerId) {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase is not configured');
    err.code = 'SUPABASE_NOT_CONFIGURED';
    throw err;
  }

  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('blocker_id', blockerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error listing blocks:', error);
    throw error;
  }

  return data || [];
}

/**
 * Delete a block row owned by blockerId. Idempotent: missing / not-owned rows
 * are a no-op (caller returns 200).
 * After delete, clears archived_at on pair conversations only when the pair is
 * no longer blocked in either direction (mutual-block safe).
 */
async function deleteBlockForUser(blockId, blockerId) {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase is not configured');
    err.code = 'SUPABASE_NOT_CONFIGURED';
    throw err;
  }

  const { data: existingBlock, error: lookupError } = await supabase
    .from('blocks')
    .select('id, blocker_id, blocked_id')
    .eq('id', blockId)
    .eq('blocker_id', blockerId)
    .maybeSingle();

  if (lookupError) {
    console.error('Error looking up block before delete:', lookupError);
    throw lookupError;
  }

  if (!existingBlock) {
    return;
  }

  const blockedId = existingBlock.blocked_id;

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('id', blockId)
    .eq('blocker_id', blockerId);

  if (error) {
    console.error('Error deleting block:', error);
    throw error;
  }

  const stillBlocked = await isPairBlocked(blockerId, blockedId);
  if (stillBlocked) {
    return;
  }

  const pairConversations = await findConversationsForUserPair(blockerId, blockedId);
  const nowIso = new Date().toISOString();

  for (const conv of pairConversations) {
    const { error: clearError } = await supabase
      .from('conversations')
      .update({ archived_at: null, updated_at: nowIso })
      .eq('id', conv.id);

    if (clearError) {
      console.error(`Error clearing archived_at for conversation ${conv.id}:`, clearError);
      throw clearError;
    }
  }
}

/**
 * Create a user report. reporterId must come from the auth token.
 * Assumes reportedUserId format and reason allowlist were validated by the route.
 */
async function createReport({
  reporterId,
  reportedUserId,
  conversationId,
  messageId,
  reason,
  details,
}) {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase is not configured');
    err.code = 'SUPABASE_NOT_CONFIGURED';
    throw err;
  }

  if (!reporterId || !reportedUserId) {
    const err = new Error('reporterId and reportedUserId are required');
    err.code = 'INVALID_REPORT';
    throw err;
  }

  if (String(reporterId) === String(reportedUserId)) {
    const err = new Error('Cannot report yourself');
    err.code = 'SELF_REPORT';
    throw err;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', reportedUserId)
    .maybeSingle();

  if (profileError) {
    console.error('Error checking reported user profile:', profileError);
    throw profileError;
  }

  if (!profile) {
    const err = new Error('reported_user_id must reference an existing user');
    err.code = 'REPORTED_USER_NOT_FOUND';
    throw err;
  }

  const insertPayload = {
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    reason,
  };

  if (conversationId != null && conversationId !== '') {
    insertPayload.conversation_id = conversationId;
  }
  if (messageId != null && messageId !== '') {
    insertPayload.message_id = messageId;
  }
  if (details != null && details !== '') {
    insertPayload.details = details;
  }

  const { data: report, error: insertError } = await supabase
    .from('reports')
    .insert(insertPayload)
    .select()
    .single();

  if (insertError) {
    console.error('Error inserting report:', insertError);
    throw insertError;
  }

  return report;
}

async function findExistingConversationForPlayerCoach(conversationData) {
  const { playerId, coachId, existingConversationId } = conversationData;

  if (!isSupabaseConfigured || !supabase) {
    if (existingConversationId) {
      const explicitConv = conversations.find((conv) => conv.id === existingConversationId);
      if (
        explicitConv &&
        explicitConv.player_id === playerId &&
        explicitConv.coach_id === coachId
      ) {
        return explicitConv;
      }
    }

    const matches = conversations.filter(
      (conv) => conv.player_id === playerId && conv.coach_id === coachId
    );
    if (matches.length === 0) return null;
    return matches.sort(
      (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)
    )[0];
  }

  if (existingConversationId) {
    const explicitConv = await getConversation(existingConversationId);
    if (
      explicitConv &&
      explicitConv.player_id === playerId &&
      explicitConv.coach_id === coachId
    ) {
      return explicitConv;
    }
  }

  const { data: existingConversations, error: findError } = await supabase
    .from('conversations')
    .select('*')
    .eq('player_id', playerId)
    .eq('coach_id', coachId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (findError) {
    console.error('Error finding existing conversation:', findError);
    return null;
  }

  return existingConversations?.[0] || null;
}

function isUniqueViolationError(error) {
  return error?.code === '23505';
}

async function isReactivationScenario(existingConv, conversationData) {
  const { existingConversationId, sessionId } = conversationData;

  if (existingConversationId && existingConv.id === existingConversationId) {
    return true;
  }

  if (sessionId && sessionId !== existingConv.session_id) {
    const chatExpiry = await checkChatExpiry(existingConv.id);
    if (chatExpiry?.isExpired) {
      return true;
    }
  }

  if (existingConv.session_id) {
    const linkedSession = await getCoachingSession(existingConv.session_id);
    if (linkedSession && (linkedSession.status || '').toLowerCase() !== 'active') {
      return true;
    }
  }

  return false;
}

async function updateConversationRow(conversationId, updatePayload) {
  if (!isSupabaseConfigured || !supabase) {
    const inMemoryConv = conversations.find((conv) => conv.id === conversationId);
    if (!inMemoryConv) {
      throw new Error(`Conversation not found in memory: ${conversationId}`);
    }
    Object.assign(inMemoryConv, updatePayload);
    return { ...inMemoryConv };
  }

  const { data, error } = await supabase
    .from('conversations')
    .update(updatePayload)
    .eq('id', conversationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function resolveReactivationUniqueViolation(existingConv, conversationData, updatePayload) {
  const newSessionId = conversationData.sessionId;

  if (isSupabaseConfigured && supabase) {
    const { data: conflicts, error: conflictError } = await supabase
      .from('conversations')
      .select('id')
      .eq('player_id', conversationData.playerId)
      .eq('coach_id', conversationData.coachId)
      .eq('session_id', newSessionId)
      .neq('id', existingConv.id);

    if (conflictError) {
      console.error('Error finding conflicting conversation rows:', conflictError);
    } else if (conflicts?.length) {
      const conflictIds = conflicts.map((row) => row.id);
      await supabase.from('conversations').delete().in('id', conflictIds);
      console.log(`Removed ${conflictIds.length} duplicate conversation row(s) blocking reactivation`);
    }
  }

  let targetConv = existingConv;
  if (conversationData.existingConversationId) {
    const explicitConv = await getConversation(conversationData.existingConversationId);
    if (
      explicitConv &&
      explicitConv.player_id === conversationData.playerId &&
      explicitConv.coach_id === conversationData.coachId
    ) {
      targetConv = explicitConv;
    }
  }

  return updateConversationRow(targetConv.id, updatePayload);
}

async function reactivateConversationRow(existingConv, conversationData) {
  const newSessionId = conversationData.sessionId;

  let convToUpdate = existingConv;
  if (conversationData.existingConversationId) {
    const explicitConv = await getConversation(conversationData.existingConversationId);
    if (
      explicitConv &&
      explicitConv.player_id === conversationData.playerId &&
      explicitConv.coach_id === conversationData.coachId
    ) {
      convToUpdate = explicitConv;
    }
  }

  const oldSessionId =
    convToUpdate.session_id && convToUpdate.session_id !== newSessionId
      ? convToUpdate.session_id
      : null;

  const updatePayload = {
    session_id: newSessionId,
    status: 'active',
    updated_at: new Date().toISOString(),
  };

  let updatedConv;
  try {
    updatedConv = await updateConversationRow(convToUpdate.id, updatePayload);
  } catch (updateError) {
    if (!isUniqueViolationError(updateError)) {
      throw updateError;
    }

    console.warn(
      `Unique violation reactivating conversation ${convToUpdate.id}, resolving and retrying`
    );
    updatedConv = await resolveReactivationUniqueViolation(
      convToUpdate,
      conversationData,
      updatePayload
    );
  }

  if (oldSessionId) {
    await expireCoachingSession(oldSessionId);
  }

  console.log(`✅ Reactivated conversation ${updatedConv.id} with new session ${newSessionId}`);
  return { ...updatedConv, reactivated: true };
}

async function lightweightUpdateConversationRow(existingConv, conversationData) {
  const updatePayload = {
    session_id: conversationData.sessionId,
    updated_at: new Date().toISOString(),
  };

  const updatedConv = await updateConversationRow(existingConv.id, updatePayload);
  console.log(
    `✅ Updated existing conversation ${existingConv.id} with new session ${conversationData.sessionId}`
  );
  console.log('   This will reset the chat expiration countdown');
  return { ...updatedConv, reactivated: false };
}

/**
 * Find or create/update a conversation between player and coach
 * If a conversation already exists, update its session_id to the new session
 * This allows players to purchase new packages and reactivate expired chats
 */
async function findOrUpdateConversation(conversationData) {
  try {
    const { playerId, coachId } = conversationData;
    if (playerId && coachId && (await isPairBlocked(playerId, coachId))) {
      const err = new Error(
        'Cannot start or reactivate a conversation with a blocked user'
      );
      err.code = 'PAIR_BLOCKED';
      throw err;
    }

    const existingConv = await findExistingConversationForPlayerCoach(conversationData);

    if (existingConv && conversationData.sessionId) {
      const isReactivation = await isReactivationScenario(existingConv, conversationData);
      if (isReactivation) {
        return await reactivateConversationRow(existingConv, conversationData);
      }
      return await lightweightUpdateConversationRow(existingConv, conversationData);
    }

    if (existingConv) {
      return existingConv;
    }

    // Safety net: if lookup missed an expired row, reactivate instead of inserting a duplicate
    if (conversationData.sessionId) {
      const expiredRow = await findExistingConversationForPlayerCoach(conversationData);
      if (expiredRow) {
        const chatExpiry = await checkChatExpiry(expiredRow.id);
        if (chatExpiry?.isExpired) {
          return await reactivateConversationRow(expiredRow, conversationData);
        }
      }
    }

    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      console.log('Using in-memory storage for conversation (Supabase not configured)');

      // Create new conversation
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
        updated_at: new Date().toISOString(),
      };
      conversations.push(conversation);
      console.log(`Conversation created in memory: ${conversationData.id}`);
      return conversation;
    }

    // No existing conversation found, create a new one
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

    const { data, error } = await supabase
      .from('conversations')
      .insert(conversation)
      .select()
      .single();

    if (error) {
      console.error('Supabase error in findOrUpdateConversation:', error);
      throw error;
    }

    console.log(`✅ Created new conversation: ${conversationData.id}`);
    return data;
  } catch (err) {
    console.error('Database error in findOrUpdateConversation:', err);
    throw err;
  }
}

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
      const userConversations = conversations.filter(conv => {
        if (conv[column] !== userId || conv.status !== 'active') return false;
        if (userType === 'coach' && conv.coach_deleted === true) return false;
        return true;
      });
      
      console.log(`Retrieved ${userConversations.length} conversations from memory for ${userType}: ${userId}`);
      return userConversations;
    }

    const column = userType === 'player' ? 'player_id' : 'coach_id';
    
    let query = supabase
      .from('conversations')
      .select('*')
      .eq(column, userId)
      .eq('status', 'active');

    if (userType === 'coach') {
      query = query.eq('coach_deleted', false);
    }

    const { data, error } = await query
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
    const userConversations = conversations.filter(conv => {
      if (conv[column] !== userId || conv.status !== 'active') return false;
      if (userType === 'coach' && conv.coach_deleted === true) return false;
      return true;
    });
    
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
            conversations[conversationIndex].coach_deleted = false;
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
          updateData.coach_deleted = false;
        } else {
          updateData.player_unread_count = (currentConv.player_unread_count || 0) + 1;
        }
      }
    } else if (messageData.senderType === 'player') {
      updateData.coach_deleted = false;
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
 * Soft-delete a conversation from the coach's list (coach_deleted = true)
 */
async function markConversationDeletedByCoach(conversationId) {
  try {
    if (!isSupabaseConfigured) {
      console.log('Using in-memory storage for coach-delete (Supabase not configured)');

      const conversationIndex = conversations.findIndex(conv => conv.id === conversationId);
      if (conversationIndex !== -1) {
        conversations[conversationIndex].coach_deleted = true;
        conversations[conversationIndex].updated_at = new Date().toISOString();
      }

      console.log(`Conversation hidden for coach in memory: ${conversationId}`);
      return conversations[conversationIndex] || null;
    }

    const { data, error } = await supabase
      .from('conversations')
      .update({
        coach_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
      .select()
      .single();

    if (error) {
      console.error('Error marking conversation deleted by coach:', error);
      throw error;
    }

    console.log(`Conversation hidden for coach: ${conversationId}`);
    return data;
  } catch (err) {
    console.error('Database error in markConversationDeletedByCoach:', err);
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

const AVATARS_BUCKET = 'avatars';
const CHAT_MEDIA_BUCKET = 'chat-media';

/**
 * Extract bucket-relative object path from a Supabase public storage URL.
 * Returns null for non-Supabase or legacy file:// URLs.
 */
function parseStoragePathFromPublicUrl(url, bucket) {
  if (!url || typeof url !== 'string' || url.startsWith('file://')) {
    return null;
  }

  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) {
    return null;
  }

  try {
    return decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
  } catch {
    return url.slice(idx + marker.length).split('?')[0];
  }
}

async function listStorageObjectPaths(bucket, prefix) {
  if (!supabase || !prefix) {
    return [];
  }

  const paths = [];
  const queue = [prefix.replace(/\/$/, '')];

  while (queue.length > 0) {
    const currentPrefix = queue.shift();
    const { data, error } = await supabase.storage.from(bucket).list(currentPrefix, { limit: 1000 });

    if (error) {
      console.warn(`Storage list failed for ${bucket}/${currentPrefix}:`, error.message);
      continue;
    }

    for (const item of data || []) {
      const itemPath = currentPrefix ? `${currentPrefix}/${item.name}` : item.name;
      if (item.id) {
        paths.push(itemPath);
      } else {
        queue.push(itemPath);
      }
    }
  }

  return paths;
}

async function removeStoragePaths(bucket, paths) {
  if (!supabase || !paths || paths.length === 0) {
    return;
  }

  const uniquePaths = [...new Set(paths.filter(Boolean))];
  const { error } = await supabase.storage.from(bucket).remove(uniquePaths);

  if (error) {
    console.warn(`Storage remove failed for ${bucket}:`, error.message);
  }
}

async function cleanupStorageAfterAccountDelete(storagePaths) {
  if (!storagePaths || !supabase) {
    return;
  }

  const avatarPaths = new Set();
  const chatMediaPaths = new Set();

  for (const url of storagePaths.avatars || []) {
    const path = parseStoragePathFromPublicUrl(url, AVATARS_BUCKET);
    if (path) {
      avatarPaths.add(path);
    }
  }

  if (storagePaths.avatarPrefix) {
    const prefixPaths = await listStorageObjectPaths(AVATARS_BUCKET, storagePaths.avatarPrefix);
    prefixPaths.forEach((path) => avatarPaths.add(path));
  }

  for (const url of storagePaths.chatMedia || []) {
    const path = parseStoragePathFromPublicUrl(url, CHAT_MEDIA_BUCKET);
    if (path) {
      chatMediaPaths.add(path);
    }
  }

  await removeStoragePaths(AVATARS_BUCKET, [...avatarPaths]);
  await removeStoragePaths(CHAT_MEDIA_BUCKET, [...chatMediaPaths]);
}

/**
 * Permanently delete a user account and all related data in a single DB transaction.
 * Storage cleanup runs best-effort after the transaction commits.
 */
async function deleteUserAccount(userId, userType) {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase is not configured');
    err.code = 'SUPABASE_NOT_CONFIGURED';
    throw err;
  }

  const { data, error } = await supabase.rpc('delete_user_account', {
    p_user_id: userId,
    p_user_type: userType
  });

  if (error) {
    if (error.message && error.message.includes('USER_NOT_FOUND')) {
      const notFound = new Error('User not found');
      notFound.code = 'USER_NOT_FOUND';
      throw notFound;
    }
    if (error.message && error.message.includes('USER_TYPE_MISMATCH')) {
      const mismatch = new Error('User type mismatch');
      mismatch.code = 'USER_TYPE_MISMATCH';
      throw mismatch;
    }
    throw error;
  }

  const result = typeof data === 'string' ? JSON.parse(data) : data;

  try {
    await cleanupStorageAfterAccountDelete(result?.storagePaths);
  } catch (storageErr) {
    console.warn('Post-delete storage cleanup failed (account already deleted):', storageErr.message);
  }

  return result;
}

/**
 * Resolve the authenticated Supabase user from a Bearer access token.
 */
async function getUserFromAccessToken(accessToken) {
  if (!isSupabaseConfigured || !supabase) {
    const err = new Error('Supabase is not configured');
    err.code = 'SUPABASE_NOT_CONFIGURED';
    throw err;
  }

  const authClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await authClient.auth.getUser(accessToken);

  if (error || !data?.user) {
    const authErr = new Error(error?.message || 'Invalid or expired token');
    authErr.code = 'INVALID_TOKEN';
    throw authErr;
  }

  return data.user;
}

function resolveUserTypeFromMetadata(user) {
  const meta = user?.user_metadata || {};
  const raw = (meta.user_type || meta.role || 'player').toString().toLowerCase();
  return raw === 'coach' ? 'coach' : 'player';
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  saveCoachConnectAccount,
  getCoachConnectAccount,
  updateCoachAccountStatus,
  updateCoachConnectAccountByStripeId,
  saveCoachingSession,
  getCoachingSession,
  updateCoachingSession,
  getRemainingClipsForConversation,
  decrementClipsForConversation,
  checkChatExpiry,
  checkSessionActive,
  getRemainingDailyMessagesForConversation,
  canPlayerSendMessageToday,
  saveTransfer,
  updateTransferStatus,
  getCoachTransfers,
  getCoachConnectAccountId,
  isPlaceholderPlayerId,
  createConversation,
  findOrUpdateConversation,
  getConversations,
  getConversation,
  addMessageToConversation,
  getConversationMessages,
  markConversationAsRead,
  markConversationDeletedByCoach,
  updateConversationLastMessage,
  clearAllConversations,
  initializeDatabase,
  deleteUserAccount,
  getUserFromAccessToken,
  resolveUserTypeFromMetadata,
  isPairBlocked,
  createBlockWithSideEffects,
  listBlocksForUser,
  deleteBlockForUser,
  createReport,
};
