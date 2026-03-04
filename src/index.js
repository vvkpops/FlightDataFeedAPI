require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const flightsRouter = require('./routes/flights');
const adminRouter = require('./routes/admin');
const { startScheduler } = require('./services/scheduler');
const { generateAndStore } = require('./services/dataGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('short'));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24h
      secure: process.env.NODE_ENV === 'production' && process.env.TRUST_PROXY === 'true',
    },
  })
);

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Public API (requires API key)
app.use('/api/v1', flightsRouter);

// Admin API
app.use('/admin/api', adminRouter);

// Admin static pages
app.use('/admin', express.static(path.join(__dirname, 'public')));

// Admin login page shortcut
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/admin/');
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const db = require('./config/db');

async function start() {
  // Run pending migrations automatically (safe for Railway deploys)
  try {
    const [batch, migrations] = await db.migrate.latest({
      directory: require('path').join(__dirname, 'migrations'),
    });
    if (migrations.length) {
      console.log(`[Migrate] Ran batch ${batch}: ${migrations.join(', ')}`);
    } else {
      console.log('[Migrate] Already up to date.');
    }
  } catch (err) {
    console.error('[Migrate] Migration failed:', err);
    process.exit(1);
  }

  app.listen(PORT, async () => {
    console.log(`Flight Data API running on port ${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin/`);
    console.log(`API base:    http://localhost:${PORT}/api/v1/`);

    // Start the daily generation scheduler
    startScheduler();

    // Generate today's data on startup if it doesn't exist
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await generateAndStore(today);
      if (!result.skipped) {
        console.log(`[Startup] Generated ${result.inserted} flights for ${today}`);
      }
    } catch (err) {
      console.error('[Startup] Error generating today\'s data:', err);
    }
  });
}

start();

module.exports = app;
