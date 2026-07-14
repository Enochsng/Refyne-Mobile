const express = require('express');
const {
  createBlockWithSideEffects,
  listBlocksForUser,
  deleteBlockForUser,
  getUserFromAccessToken,
  isSupabaseConfigured,
} = require('../services/database');

const router = express.Router();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(str) {
  return typeof str === 'string' && UUID_REGEX.test(str);
}

function extractBearerToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

/**
 * GET /api/blocks
 * List blocks created by the authenticated user. Identity from Bearer token only.
 */
router.get('/', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Blocking requires Supabase to be configured.',
      });
    }

    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization Bearer token is required.',
      });
    }

    const user = await getUserFromAccessToken(accessToken);
    const blocks = await listBlocksForUser(user.id);

    res.json({
      success: true,
      blocks,
    });
  } catch (err) {
    if (err.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Service unavailable',
        message: err.message,
      });
    }

    if (err.code === 'INVALID_TOKEN') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message,
      });
    }

    console.error('Error listing blocks:', err);
    res.status(500).json({
      error: 'Failed to list blocks',
      message: err.message,
    });
  }
});

/**
 * POST /api/blocks
 * Block a user. blocker_id is taken from the Authorization Bearer token only.
 * Body: { blockedId } (UUID)
 *
 * Side effects: archives conversations for that pair; expires active paid sessions
 * via expireCoachingSession (no refund).
 */
router.post('/', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Blocking requires Supabase to be configured.',
      });
    }

    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization Bearer token is required.',
      });
    }

    const user = await getUserFromAccessToken(accessToken);
    const blockerId = user.id;
    const blockedId = req.body?.blockedId;

    if (!isUuid(blockedId)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'blockedId must be a valid UUID (Supabase auth user id).',
      });
    }

    if (blockerId === blockedId) {
      return res.status(400).json({
        error: 'Self block',
        message: 'Cannot block yourself.',
      });
    }

    const result = await createBlockWithSideEffects(blockerId, blockedId);

    res.json({
      success: true,
      block: result.block,
      archivedConversationIds: result.archivedConversationIds,
      expiredSessionIds: result.expiredSessionIds,
    });
  } catch (err) {
    if (err.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Service unavailable',
        message: err.message,
      });
    }

    if (err.code === 'INVALID_TOKEN') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message,
      });
    }

    if (err.code === 'SELF_BLOCK' || err.code === 'INVALID_BLOCK') {
      return res.status(400).json({
        error: 'Bad request',
        message: err.message,
      });
    }

    if (err.code === 'ALREADY_BLOCKED') {
      return res.status(409).json({
        error: 'Already blocked',
        message: err.message,
      });
    }

    console.error('Error creating block:', err);
    res.status(500).json({
      error: 'Failed to block user',
      message: err.message,
    });
  }
});

/**
 * DELETE /api/blocks/:id
 * Unblock by block record id. Only removes the row owned by the token user.
 * Idempotent: missing / not-owned / already deleted all return 200.
 * Does not un-archive conversations or restore forfeited sessions.
 */
router.delete('/:id', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Blocking requires Supabase to be configured.',
      });
    }

    const blockId = req.params.id;
    if (!isUuid(blockId)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'id must be a valid UUID (block record id).',
      });
    }

    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization Bearer token is required.',
      });
    }

    const user = await getUserFromAccessToken(accessToken);
    await deleteBlockForUser(blockId, user.id);

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Service unavailable',
        message: err.message,
      });
    }

    if (err.code === 'INVALID_TOKEN') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message,
      });
    }

    console.error('Error deleting block:', err);
    res.status(500).json({
      error: 'Failed to unblock user',
      message: err.message,
    });
  }
});

module.exports = router;
