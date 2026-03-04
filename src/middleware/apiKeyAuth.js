const db = require('../config/db');

/**
 * Middleware – validates the x-api-key header against the api_keys table.
 * Updates last_used_at on successful auth.
 */
async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];

  if (!key) {
    return res.status(401).json({ error: 'Missing x-api-key header' });
  }

  try {
    const record = await db('api_keys').where({ key, is_active: true }).first();

    if (!record) {
      return res.status(403).json({ error: 'Invalid or revoked API key' });
    }

    // Update last used timestamp (fire-and-forget)
    db('api_keys').where({ id: record.id }).update({ last_used_at: new Date() }).catch(() => {});

    req.apiKeyRecord = record;
    next();
  } catch (err) {
    console.error('API key auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = apiKeyAuth;
