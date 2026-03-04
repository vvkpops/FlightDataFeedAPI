/**
 * Standalone script – generate flights for today (or a given date).
 * Usage:  node src/scripts/generateToday.js [YYYY-MM-DD]
 */

require('dotenv').config();
const { generateAndStore } = require('../services/dataGenerator');

async function main() {
  const dateStr = process.argv[2] || new Date().toISOString().slice(0, 10);
  console.log(`Generating flight data for ${dateStr}...`);

  const result = await generateAndStore(dateStr);

  if (result.skipped) {
    console.log(`Skipped — data already exists for ${dateStr}`);
  } else {
    console.log(`Inserted ${result.inserted} flights for ${dateStr}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
