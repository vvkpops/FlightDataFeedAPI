require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    migrations: { directory: './src/migrations' },
    seeds: { directory: './src/seeds' },
  },
  production: {
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
    },
    migrations: { directory: './src/migrations' },
    seeds: { directory: './src/seeds' },
    pool: { min: 2, max: 10 },
  },
};
