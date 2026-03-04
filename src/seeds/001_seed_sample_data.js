const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

/**
 * Seed: import sample CSV data and create a default API key.
 */
exports.seed = async function (knex) {
  // Only seed if flights table is empty
  const existing = await knex('flights').first();
  if (existing) {
    console.log('[Seed] Flights table already has data, skipping CSV import.');
  } else {
    // Find the CSV in /ref
    const refDir = path.join(__dirname, '..', '..', 'ref');
    const files = fs.readdirSync(refDir).filter((f) => f.endsWith('.csv'));
    if (!files.length) {
      console.log('[Seed] No CSV files found in ref/');
      return;
    }

    const csvPath = path.join(refDir, files[0]);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });

    // Build rows
    const flights = records.map((r) => {
      // Derive generation_date from departuretime
      const depDate = r.departuretime ? r.departuretime.slice(0, 10) : new Date().toISOString().slice(0, 10);
      return {
        callsign: r.callsign,
        actype: r.actype,
        acregistration: r.acregistration,
        departureicao: r.departureicao,
        arrivalicao: r.arrivalicao,
        alternateicao: r.alternateicao || null,
        departuretime: r.departuretime ? r.departuretime.replace('Z', ':00Z') : null,
        arrivaltime: r.arrivaltime ? r.arrivaltime.replace('Z', ':00Z') : null,
        eta: r.eta ? r.eta.replace('Z', ':00Z') : null,
        alteta: r.alteta ? r.alteta.replace('Z', ':00Z') : null,
        generation_date: depDate,
      };
    });

    // Insert in batches
    const batchSize = 50;
    for (let i = 0; i < flights.length; i += batchSize) {
      await knex('flights').insert(flights.slice(i, i + batchSize));
    }

    // Build generation_log entries
    const dateCounts = {};
    for (const f of flights) {
      dateCounts[f.generation_date] = (dateCounts[f.generation_date] || 0) + 1;
    }
    for (const [genDate, count] of Object.entries(dateCounts)) {
      const exists = await knex('generation_log').where({ generation_date: genDate }).first();
      if (!exists) {
        await knex('generation_log').insert({ generation_date: genDate, flights_count: count });
      }
    }

    console.log(`[Seed] Imported ${flights.length} flights from CSV.`);
  }

  // Ensure at least one API key exists
  const keyExists = await knex('api_keys').first();
  if (!keyExists) {
    const crypto = require('crypto');
    const key = `fda_${crypto.randomBytes(24).toString('hex')}`;
    await knex('api_keys').insert({ name: 'Default Key', key });
    console.log(`[Seed] Created default API key: ${key}`);
  }
};
