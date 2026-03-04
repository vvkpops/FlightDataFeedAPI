const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const adminAuth = require('../middleware/adminAuth');
const { generateAndStore } = require('../services/dataGenerator');

const router = express.Router();

// -------------------------------------------------------
// Auth routes (no adminAuth needed)
// -------------------------------------------------------

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

router.get('/me', (req, res) => {
  res.json({ authenticated: !!(req.session && req.session.isAdmin) });
});

// -------------------------------------------------------
// All routes below require admin session
// -------------------------------------------------------
router.use(adminAuth);

// ======================== DASHBOARD ========================

router.get('/dashboard', async (req, res) => {
  try {
    const [{ total_flights }] = await db('flights').count('id as total_flights');
    const [{ total_days }] = await db('generation_log').count('id as total_days');
    const [{ total_keys }] = await db('api_keys').count('id as total_keys');
    const [{ active_keys }] = await db('api_keys').where({ is_active: true }).count('id as active_keys');
    const latestGen = await db('generation_log').orderBy('generation_date', 'desc').first();
    const recentFlights = await db('flights').orderBy('created_at', 'desc').limit(10);

    res.json({
      total_flights: parseInt(total_flights, 10),
      total_days: parseInt(total_days, 10),
      total_keys: parseInt(total_keys, 10),
      active_keys: parseInt(active_keys, 10),
      latest_generation: latestGen || null,
      recent_flights: recentFlights,
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================== FLIGHTS CRUD ========================

router.get('/flights', async (req, res) => {
  try {
    const { date, callsign, departure, arrival, page = 1, limit = 50 } = req.query;
    const pg = Math.max(1, parseInt(page, 10));
    const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));

    let query = db('flights');
    if (date) query = query.where('generation_date', date);
    if (callsign) query = query.where('callsign', 'ilike', `%${callsign}%`);
    if (departure) query = query.where('departureicao', departure.toUpperCase());
    if (arrival) query = query.where('arrivalicao', arrival.toUpperCase());

    const [{ count }] = await query.clone().count('id as count');
    const total = parseInt(count, 10);
    const flights = await query.orderBy('departuretime', 'desc').limit(lim).offset((pg - 1) * lim);

    res.json({ data: flights, pagination: { page: pg, limit: lim, total, pages: Math.ceil(total / lim) } });
  } catch (err) {
    console.error('Admin GET flights:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/flights/:id', async (req, res) => {
  try {
    const flight = await db('flights').where({ id: req.params.id }).first();
    if (!flight) return res.status(404).json({ error: 'Not found' });
    res.json({ data: flight });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/flights/:id', async (req, res) => {
  try {
    const allowed = [
      'callsign', 'actype', 'acregistration', 'departureicao',
      'arrivalicao', 'alternateicao', 'departuretime', 'arrivaltime', 'eta', 'alteta',
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    updates.updated_at = new Date();

    const [updated] = await db('flights').where({ id: req.params.id }).update(updates).returning('*');
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json({ data: updated });
  } catch (err) {
    console.error('Admin PUT flight:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/flights/:id', async (req, res) => {
  try {
    const deleted = await db('flights').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================== GENERATION ========================

router.get('/generation-log', async (req, res) => {
  try {
    const logs = await db('generation_log').orderBy('generation_date', 'desc').limit(60);
    res.json({ data: logs });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const dateStr = req.body.date || new Date().toISOString().slice(0, 10);
    const count = parseInt(req.body.count, 10) || undefined;
    const result = await generateAndStore(dateStr, count);
    res.json(result);
  } catch (err) {
    console.error('Admin generate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ======================== API KEYS ========================

router.get('/api-keys', async (req, res) => {
  try {
    const keys = await db('api_keys')
      .select('id', 'name', 'key', 'is_active', 'last_used_at', 'created_at')
      .orderBy('created_at', 'desc');
    res.json({ data: keys });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/api-keys', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const key = `fda_${crypto.randomBytes(24).toString('hex')}`;
    const [record] = await db('api_keys').insert({ name, key }).returning('*');
    res.status(201).json({ data: record });
  } catch (err) {
    console.error('Admin create key:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/api-keys/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.is_active !== undefined) updates.is_active = req.body.is_active;
    updates.updated_at = new Date();

    const [record] = await db('api_keys').where({ id: req.params.id }).update(updates).returning('*');
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json({ data: record });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/api-keys/:id', async (req, res) => {
  try {
    const deleted = await db('api_keys').where({ id: req.params.id }).del();
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
