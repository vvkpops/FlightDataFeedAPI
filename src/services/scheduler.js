const cron = require('node-cron');
const { generateAndStore } = require('./dataGenerator');

/**
 * Start the daily data generation scheduler.
 * Runs at the configured hour/minute (default: 00:05 UTC).
 */
function startScheduler() {
  const hour = process.env.GENERATE_HOUR || '0';
  const minute = process.env.GENERATE_MINUTE || '5';
  const cronExpr = `${minute} ${hour} * * *`;

  console.log(`[Scheduler] Daily generation cron: "${cronExpr}" (UTC)`);

  cron.schedule(cronExpr, async () => {
    const today = new Date().toISOString().slice(0, 10);
    console.log(`[Scheduler] Generating flights for ${today}...`);
    try {
      const result = await generateAndStore(today);
      if (result.skipped) {
        console.log(`[Scheduler] Skipped — data already exists for ${today}`);
      } else {
        console.log(`[Scheduler] Inserted ${result.inserted} flights for ${today}`);
      }
    } catch (err) {
      console.error(`[Scheduler] Error generating flights:`, err);
    }
  }, { timezone: 'UTC' });
}

module.exports = { startScheduler };
