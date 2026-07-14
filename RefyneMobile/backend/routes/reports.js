const express = require('express');
const {
  createReport,
  getUserFromAccessToken,
  isSupabaseConfigured,
} = require('../services/database');

const router = express.Router();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_REASONS = new Set([
  'harassment_bullying',
  'impersonation',
  'inappropriate_sexual_content',
  'hate_speech',
  'spam_scam',
  'threats_of_violence',
  'other',
]);

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
 * POST /api/reports
 * Create a report. reporter_id is taken from the Authorization Bearer token only.
 * Body: {
 *   reported_user_id (required UUID),
 *   reason (required, allowlisted),
 *   conversation_id (optional),
 *   message_id (optional),
 *   details (optional)
 * }
 */
router.post('/', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Reporting requires Supabase to be configured.',
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
    const reporterId = user.id;

    const reportedUserId = req.body?.reported_user_id;
    const reason = req.body?.reason;
    const conversationId = req.body?.conversation_id;
    const messageId = req.body?.message_id;
    const details = req.body?.details;

    if (!isUuid(reportedUserId)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'reported_user_id must be a valid UUID (Supabase auth user id).',
      });
    }

    if (typeof reason !== 'string' || !ALLOWED_REASONS.has(reason)) {
      return res.status(400).json({
        error: 'Validation error',
        message:
          'reason must be one of: harassment_bullying, impersonation, inappropriate_sexual_content, hate_speech, spam_scam, threats_of_violence, other.',
      });
    }

    if (reporterId === reportedUserId) {
      return res.status(400).json({
        error: 'Self report',
        message: 'Cannot report yourself.',
      });
    }

    const report = await createReport({
      reporterId,
      reportedUserId,
      conversationId,
      messageId,
      reason,
      details,
    });

    res.json({
      success: true,
      report,
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

    if (err.code === 'SELF_REPORT' || err.code === 'INVALID_REPORT') {
      return res.status(400).json({
        error: 'Bad request',
        message: err.message,
      });
    }

    if (err.code === 'REPORTED_USER_NOT_FOUND') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'reported_user_id must reference an existing user',
      });
    }

    console.error('Error creating report:', err);
    res.status(500).json({
      error: 'Failed to create report',
      message: err.message,
    });
  }
});

module.exports = router;
