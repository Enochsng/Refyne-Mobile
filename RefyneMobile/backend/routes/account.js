const express = require('express');
const {
  deleteUserAccount,
  getUserFromAccessToken,
  resolveUserTypeFromMetadata,
  isSupabaseConfigured
} = require('../services/database');

const router = express.Router();

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
 * POST /api/account/delete
 * Permanently delete the authenticated user's account and all related data.
 * User identity is taken from the Authorization Bearer token only.
 */
router.post('/delete', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Account deletion requires Supabase to be configured.'
      });
    }

    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authorization Bearer token is required.'
      });
    }

    const user = await getUserFromAccessToken(accessToken);
    const userId = user.id;
    const userType = resolveUserTypeFromMetadata(user);

    await deleteUserAccount(userId, userType);

    res.json({ success: true });
  } catch (err) {
    if (err.code === 'SUPABASE_NOT_CONFIGURED') {
      return res.status(503).json({
        error: 'Service unavailable',
        message: err.message
      });
    }

    if (err.code === 'INVALID_TOKEN') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: err.message
      });
    }

    if (err.code === 'USER_NOT_FOUND') {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account exists for this token.'
      });
    }

    if (err.code === 'USER_TYPE_MISMATCH') {
      return res.status(400).json({
        error: 'User type mismatch',
        message: 'Account type could not be verified for deletion.'
      });
    }

    console.error('Error deleting account:', err);
    res.status(500).json({
      error: 'Failed to delete account',
      message: err.message
    });
  }
});

module.exports = router;
