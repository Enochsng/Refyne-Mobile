import { supabase } from '../supabaseClient';
import apiService from './apiService';

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const error = new Error('You are not signed in. Please sign in again.');
    error.code = 'NOT_SIGNED_IN';
    throw error;
  }
  return session.access_token;
}

/**
 * Block a user. Archives pair conversations (does not expire paid sessions).
 * @param {string} blockedId - Supabase auth user id of the user to block
 * @returns {Promise<{ success: boolean, block: object, archivedConversationIds: string[], expiredSessionIds: string[] }>}
 */
export async function blockUser(blockedId) {
  const accessToken = await getAccessToken();
  return apiService.post(
    '/api/blocks',
    { blockedId },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

/**
 * List blocks created by the authenticated user.
 * @returns {Promise<{ success: boolean, blocks: Array<{ id: string, blocker_id: string, blocked_id: string, created_at: string }> }>}
 */
export async function listBlocks() {
  const accessToken = await getAccessToken();
  return apiService.get('/api/blocks', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Unblock a user by block record id. Clears archived_at when the pair is fully unblocked.
 * @param {string} blockId - UUID of the blocks row
 * @returns {Promise<{ success: boolean }>}
 */
export async function unblockUser(blockId) {
  const accessToken = await getAccessToken();
  return apiService.delete(`/api/blocks/${blockId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Report a user.
 * @param {{ reportedUserId: string, reason: string, conversationId?: string, messageId?: string, details?: string }} params
 * @returns {Promise<{ success: boolean, report: object }>}
 */
export async function reportUser({
  reportedUserId,
  reason,
  conversationId,
  messageId,
  details,
} = {}) {
  const accessToken = await getAccessToken();
  const body = {
    reported_user_id: reportedUserId,
    reason,
  };
  if (conversationId) {
    body.conversation_id = conversationId;
  }
  if (messageId) {
    body.message_id = messageId;
  }
  if (details) {
    body.details = details;
  }
  return apiService.post('/api/reports', body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
