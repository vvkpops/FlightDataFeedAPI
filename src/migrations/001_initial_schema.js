/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // --- flights table ---
  await knex.schema.createTable('flights', (t) => {
    t.increments('id').primary();
    t.string('callsign', 20).notNullable();
    t.string('actype', 10).notNullable();
    t.string('acregistration', 12).notNullable();
    t.string('departureicao', 4).notNullable();
    t.string('arrivalicao', 4).notNullable();
    t.string('alternateicao', 4);
    t.timestamp('departuretime', { useTz: true }).notNullable();
    t.timestamp('arrivaltime', { useTz: true }).notNullable();
    t.timestamp('eta', { useTz: true });
    t.timestamp('alteta', { useTz: true });
    t.date('generation_date').notNullable();
    t.timestamps(true, true);

    t.index('callsign');
    t.index('generation_date');
    t.index('departureicao');
    t.index('arrivalicao');
    t.index('departuretime');
  });

  // --- api_keys table ---
  await knex.schema.createTable('api_keys', (t) => {
    t.increments('id').primary();
    t.string('name', 100).notNullable();
    t.string('key', 64).notNullable().unique();
    t.boolean('is_active').defaultTo(true);
    t.timestamp('last_used_at', { useTz: true });
    t.timestamps(true, true);
  });

  // --- generation_log table ---
  await knex.schema.createTable('generation_log', (t) => {
    t.increments('id').primary();
    t.date('generation_date').notNullable().unique();
    t.integer('flights_count').notNullable();
    t.timestamps(true, true);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('generation_log');
  await knex.schema.dropTableIfExists('api_keys');
  await knex.schema.dropTableIfExists('flights');
};
