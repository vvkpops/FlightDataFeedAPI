/**
 * Flight Data Generator
 *
 * Generates realistic daily flight data based on the reference patterns.
 * - Callsigns, registrations, airports, and aircraft types mirror the sample.
 * - ETAs are derived from scheduled arrival +/- realistic jitter.
 * - Alternate ETAs account for extra distance to the alternate airport.
 * - Old data is kept; each day adds new rows.
 */

const db = require('../config/db');

// ---------------------------------------------------------------------------
// Reference pools (extracted from the sample CSV)
// ---------------------------------------------------------------------------

const CALLSIGNS = [
  'PVL910', 'PVL847', 'PVL649', 'PVL723', 'PVL939', 'PVL820',
  'PVL862', 'PVL424', 'PVL340', 'PVL486', 'PVL754', 'PVL632',
  'PVL296', 'PVL479', 'PVL471', 'PVL691', 'PVL122', 'PVL163',
  'PVL941', 'PVL232', 'PVL716', 'PVL710', 'PVL585', 'PVL987',
  'PVL884', 'PVL262', 'PVL824', 'PVL886',
];

const REGISTRATIONS = [
  'C-GMXE', 'C-GPOH', 'C-FHUM', 'C-GWEN',
  'C-FXXL', 'C-GPOI', 'C-GMAR',
];

const AIRCRAFT_TYPES = [
  'B77E', 'DH8D', 'B737', 'B738', 'B739',
  'CRJ9', 'AT76', 'E190', 'A320', 'B763',
];

// Canadian airports used in the sample — { icao: [lat, lon] }
const AIRPORTS = {
  CYUL: [45.47, -73.74],  // Montreal Trudeau
  CYQB: [46.79, -71.39],  // Quebec City
  CYMX: [45.68, -74.04],  // Mirabel
  CYOW: [45.32, -75.67],  // Ottawa
  CYHU: [45.52, -73.42],  // St-Hubert
  CYHZ: [44.88, -63.51],  // Halifax
  CYFC: [45.87, -66.54],  // Fredericton
  CYSJ: [45.32, -65.89],  // Saint John
  CYYT: [47.62, -52.75],  // St. John's
  CYBC: [49.13, -68.20],  // Baie-Comeau
  CYQX: [48.94, -54.57],  // Gander
  CYQM: [46.11, -64.68],  // Moncton
  CYYZ: [43.68, -79.63],  // Toronto Pearson
  CYZV: [50.22, -66.27],  // Sept-Iles
  CYWK: [52.92, -66.87],  // Wabush
  CYND: [51.10, -71.00],  // Gatineau (Ndb stand-in)
  CYRQ: [46.35, -72.68],  // Trois-Rivieres
  CYYR: [53.32, -60.43],  // Goose Bay
  CYAY: [51.39, -56.08],  // St. Anthony
  CYBX: [51.44, -57.19],  // Lourdes-de-Blanc-Sablon
  CYDF: [49.21, -57.39],  // Deer Lake
  CZUM: [53.56, -64.11],  // Churchill Falls
};

const AIRPORT_CODES = Object.keys(AIRPORTS);

// Major hubs — departures originate from these more often
const HUBS = ['CYUL', 'CYQB', 'CYOW', 'CYHZ', 'CYYT', 'CYYZ'];

// ---------------------------------------------------------------------------
// Route definitions – pairs of (departure, arrival, [alternates])
// ---------------------------------------------------------------------------
const ROUTES = [
  { dep: 'CYUL', arr: 'CYQB', alts: ['CYMX', 'CYHU'] },
  { dep: 'CYUL', arr: 'CYOW', alts: ['CYMX', 'CYHU'] },
  { dep: 'CYUL', arr: 'CYBC', alts: ['CYMX', 'CYHU', 'CYQB'] },
  { dep: 'CYOW', arr: 'CYUL', alts: ['CYMX'] },
  { dep: 'CYQB', arr: 'CYOW', alts: ['CYUL'] },
  { dep: 'CYQB', arr: 'CYBC', alts: ['CYUL'] },
  { dep: 'CYQB', arr: 'CYQM', alts: ['CYUL'] },
  { dep: 'CYHZ', arr: 'CYFC', alts: ['CYSJ'] },
  { dep: 'CYHZ', arr: 'CYYT', alts: ['CYQX'] },
  { dep: 'CYHZ', arr: 'CYQX', alts: ['CYFC'] },
  { dep: 'CYHZ', arr: 'CYQM', alts: ['CYFC'] },
  { dep: 'CYYT', arr: 'CYQX', alts: ['CYDF', 'CYBC'] },
  { dep: 'CYYT', arr: 'CYBC', alts: ['CYQX'] },
  { dep: 'CYYT', arr: 'CYHZ', alts: ['CYQX'] },
  { dep: 'CYBC', arr: 'CYQB', alts: ['CYUL'] },
  { dep: 'CYFC', arr: 'CYHZ', alts: ['CYSJ'] },
  { dep: 'CYYZ', arr: 'CYUL', alts: ['CYQB'] },
  { dep: 'CYQX', arr: 'CYBC', alts: ['CYYT'] },
  { dep: 'CYUL', arr: 'CYZV', alts: ['CYWK'] },
  { dep: 'CYUL', arr: 'CYND', alts: ['CYOW'] },
  { dep: 'CYUL', arr: 'CYRQ', alts: ['CYQB'] },
  { dep: 'CYYR', arr: 'CYAY', alts: ['CYBX'] },
  { dep: 'CYYT', arr: 'CZUM', alts: ['CYYR'] },
  { dep: 'CYYT', arr: 'CYDF', alts: ['CYQX'] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Haversine distance in km between two [lat, lon] points */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/** Estimate flight duration in minutes for a given km distance */
function flightMinutes(km) {
  const cruiseSpeedKmH = 450; // regional turboprop / narrow-body average
  const taxiAndClimb = 20;    // minutes overhead
  return Math.round(km / (cruiseSpeedKmH / 60) + taxiAndClimb);
}

/** Random integer between min (incl) and max (incl) */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Add minutes to a Date and return a new Date */
function addMinutes(date, mins) {
  return new Date(date.getTime() + mins * 60_000);
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

/**
 * Generate an array of flight objects for a given date.
 * @param {string} dateStr – ISO date string e.g. '2026-03-04'
 * @param {number} count – number of flights to generate
 * @returns {object[]}
 */
function generateFlightsForDate(dateStr, count = 36) {
  const flights = [];
  const usedCallsigns = new Set();

  for (let i = 0; i < count; i++) {
    // Pick route
    const route = pick(ROUTES);
    const dep = route.dep;
    const arr = route.arr;
    const alt = pick(route.alts);

    // Callsign — reuse is fine across flights, but try to spread
    let callsign;
    if (usedCallsigns.size < CALLSIGNS.length && Math.random() > 0.3) {
      // pick an unused one
      const available = CALLSIGNS.filter((c) => !usedCallsigns.has(c));
      callsign = pick(available.length ? available : CALLSIGNS);
    } else {
      callsign = pick(CALLSIGNS);
    }
    usedCallsigns.add(callsign);

    // Aircraft
    const actype = pick(AIRCRAFT_TYPES);
    const acregistration = pick(REGISTRATIONS);

    // Times
    const depHour = randInt(6, 19);
    const depMin = pick([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]);
    const depDate = new Date(`${dateStr}T${String(depHour).padStart(2, '0')}:${String(depMin).padStart(2, '0')}:00Z`);

    // Flight duration based on haversine distance
    const km = haversineKm(AIRPORTS[dep], AIRPORTS[arr]);
    const duration = flightMinutes(km);
    const arrDate = addMinutes(depDate, duration);

    // ETA: arrival +/- 0-8 minutes (positive = late, negative = early)
    const etaJitter = randInt(-5, 8);
    const etaDate = addMinutes(arrDate, etaJitter);

    // Alternate ETA: compute as if diverting from arrival area to alternate
    // Clamp extra time to 30-90 minutes so alteta is always meaningfully later than eta
    const altKm = haversineKm(AIRPORTS[arr], AIRPORTS[alt]);
    const altExtraMinRaw = Math.round(altKm / (450 / 60));
    const altExtraMin = Math.max(30, Math.min(90, altExtraMinRaw + randInt(0, 15)));
    const altEtaDate = addMinutes(etaDate, altExtraMin);

    flights.push({
      callsign,
      actype,
      acregistration,
      departureicao: dep,
      arrivalicao: arr,
      alternateicao: alt,
      departuretime: depDate.toISOString(),
      arrivaltime: arrDate.toISOString(),
      eta: etaDate.toISOString(),
      alteta: altEtaDate.toISOString(),
      generation_date: dateStr,
    });
  }

  // Sort by departure time
  flights.sort((a, b) => new Date(a.departuretime) - new Date(b.departuretime));
  return flights;
}

/**
 * Generate flights for a date and insert into DB.
 * Skips if data already exists for that date.
 * @param {string} dateStr – ISO date e.g. '2026-03-06'
 * @param {number} count
 * @returns {{ inserted: number, skipped: boolean }}
 */
async function generateAndStore(dateStr, count) {
  const flightsPerDay = count || parseInt(process.env.FLIGHTS_PER_DAY, 10) || 36;

  // Check if already generated
  const existing = await db('generation_log').where({ generation_date: dateStr }).first();
  if (existing) {
    return { inserted: 0, skipped: true };
  }

  const flights = generateFlightsForDate(dateStr, flightsPerDay);

  await db.transaction(async (trx) => {
    await trx('flights').insert(flights);
    await trx('generation_log').insert({
      generation_date: dateStr,
      flights_count: flights.length,
    });
  });

  return { inserted: flights.length, skipped: false };
}

module.exports = { generateFlightsForDate, generateAndStore, AIRPORTS, CALLSIGNS, REGISTRATIONS, AIRCRAFT_TYPES, ROUTES };
