const express = require('express');
const db = require('../config/db');
const apiKeyAuth = require('../middleware/apiKeyAuth');

const router = express.Router();

// All public API routes require a valid API key
router.use(apiKeyAuth);

// -------------------------------------------------------
// GET /api/v1/flights
// Query params: date, callsign, departure, arrival, page, limit
// -------------------------------------------------------
router.get('/flights', async (req, res) => {
  try {
    const {
      date,
      from_date,
      to_date,
      callsign,
      departure,
      arrival,
      registration,
      page = 1,
      limit = 50,
    } = req.query;

    const pg = Math.max(1, parseInt(page, 10));
    const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));

    let query = db('flights').select('*');

    if (date) query = query.where('generation_date', date);
    if (from_date) query = query.where('generation_date', '>=', from_date);
    if (to_date) query = query.where('generation_date', '<=', to_date);
    if (callsign) query = query.where('callsign', callsign.toUpperCase());
    if (departure) query = query.where('departureicao', departure.toUpperCase());
    if (arrival) query = query.where('arrivalicao', arrival.toUpperCase());
    if (registration) query = query.where('acregistration', registration.toUpperCase());

    // Count total
    const [{ count }] = await query.clone().count('id as count');
    const total = parseInt(count, 10);

    // Fetch page
    const flights = await query
      .orderBy('departuretime', 'asc')
      .limit(lim)
      .offset((pg - 1) * lim);

    res.json({
      data: flights,
      pagination: {
        page: pg,
        limit: lim,
        total,
        pages: Math.ceil(total / lim),
      },
    });
  } catch (err) {
    console.error('GET /flights error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------
// GET /api/v1/flights/:id
// -------------------------------------------------------
router.get('/flights/:id', async (req, res) => {
  try {
    const flight = await db('flights').where({ id: req.params.id }).first();
    if (!flight) return res.status(404).json({ error: 'Flight not found' });
    res.json({ data: flight });
  } catch (err) {
    console.error('GET /flights/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------
// GET /api/v1/flights/dates
// Returns list of available generation dates
// -------------------------------------------------------
router.get('/dates', async (req, res) => {
  try {
    const dates = await db('generation_log')
      .select('generation_date', 'flights_count', 'created_at')
      .orderBy('generation_date', 'desc');
    res.json({ data: dates });
  } catch (err) {
    console.error('GET /dates error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// -------------------------------------------------------
// GET /api/v1/stats
// Summary statistics
// -------------------------------------------------------
router.get('/stats', async (req, res) => {
  try {
    const [{ total_flights }] = await db('flights').count('id as total_flights');
    const [{ total_days }] = await db('generation_log').count('id as total_days');
    const latestDate = await db('generation_log')
      .select('generation_date')
      .orderBy('generation_date', 'desc')
      .first();

    res.json({
      data: {
        total_flights: parseInt(total_flights, 10),
        total_days: parseInt(total_days, 10),
        latest_generation_date: latestDate ? latestDate.generation_date : null,
      },
    });
  } catch (err) {
    console.error('GET /stats error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
