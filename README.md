# Flight Data API Feed

A Node.js application that generates daily flight data, stores it in PostgreSQL, and serves it via a REST API. Includes an admin panel for viewing/editing flight data and managing API keys.

## Features

- **Daily data generation** — Automatically generates ~36 realistic Canadian domestic flights per day via cron
- **REST API** — Query flights by date, callsign, departure/arrival airport, registration, with pagination
- **API key authentication** — Create, revoke, and manage API keys from the admin panel
- **Admin panel** — Dashboard, flight data table with edit/delete, API key management, built-in API docs
- **PostgreSQL storage** — All historical data is retained
- **Docker ready** — Full Docker Compose setup for local dev; Railway-compatible for production

## Quick Start (Docker Compose)

```bash
# Clone and enter the project
git clone <your-repo-url>
cd flight-data-api-feed

# Start PostgreSQL + app
docker-compose up -d

# App is running at http://localhost:3001
# Admin panel: http://localhost:3001/admin/
# Login: admin / admin123
```

## Local Development (without Docker)

### Prerequisites

- Node.js >= 18
- PostgreSQL running locally

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set your DATABASE_URL, admin credentials, etc.

# Run database migrations
npm run migrate

# Seed with sample CSV data + create default API key
npm run seed

# Start the server
npm run dev
```

The app starts at `http://localhost:3000`.

### Default credentials

- **Admin panel**: `admin` / `admin123` (change via `ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`)
- **Default API key**: printed to console on first seed run

## Deploy to Railway

1. Push to a GitHub repo
2. Create a new Railway project, add a **PostgreSQL** plugin
3. Add a **service** from your GitHub repo
4. Set environment variables:
   - `DATABASE_URL` — automatically set by Railway PostgreSQL plugin
   - `DB_SSL=true`
   - `TRUST_PROXY=true`
   - `NODE_ENV=production`
   - `ADMIN_USERNAME=<your-username>`
   - `ADMIN_PASSWORD=<strong-password>`
   - `SESSION_SECRET=<random-string>`
5. Set the **start command**: `npx knex migrate:latest --knexfile knexfile.js && npx knex seed:run --knexfile knexfile.js && node src/index.js`

## NPM Scripts

| Script              | Description                                 |
|---------------------|---------------------------------------------|
| `npm start`         | Start the production server                 |
| `npm run dev`       | Start with nodemon (auto-restart)           |
| `npm run migrate`   | Run database migrations                     |
| `npm run seed`      | Seed sample data + default API key          |
| `npm run generate`  | Manually generate today's flight data       |
| `npm run docker:up` | Start Docker Compose                        |
| `npm run docker:down`| Stop Docker Compose                        |

## Project Structure

```
├── docker-compose.yml          # Docker Compose (PostgreSQL + app)
├── Dockerfile                  # Container image
├── knexfile.js                 # Knex database config
├── package.json
├── API_DOCS.md                 # Full API documentation
├── ref/                        # Sample CSV data
└── src/
    ├── index.js                # Express app entry point
    ├── config/
    │   └── db.js               # Knex database connection
    ├── migrations/
    │   └── 001_initial_schema.js
    ├── seeds/
    │   └── 001_seed_sample_data.js
    ├── middleware/
    │   ├── apiKeyAuth.js       # API key validation
    │   └── adminAuth.js        # Admin session check
    ├── routes/
    │   ├── flights.js          # Public API (GET /api/v1/flights, etc.)
    │   └── admin.js            # Admin API (CRUD, keys, generation)
    ├── services/
    │   ├── dataGenerator.js    # Flight data generation logic
    │   └── scheduler.js        # node-cron daily scheduler
    ├── scripts/
    │   └── generateToday.js    # CLI: generate for a specific date
    └── public/                 # Admin UI (static HTML + JS)
        ├── index.html          # Dashboard
        ├── flights.html        # Flight data management
        ├── api-keys.html       # API key management
        ├── docs.html           # Interactive API docs
        ├── login.html          # Login page
        ├── css/admin.css
        └── js/common.js
```

## API Usage

See [API_DOCS.md](API_DOCS.md) or the built-in docs at `/admin/docs.html`.

```bash
# List today's flights
curl -H "x-api-key: YOUR_KEY" http://localhost:3001/api/v1/flights?date=2026-03-04

# Get flight by ID
curl -H "x-api-key: YOUR_KEY" http://localhost:3001/api/v1/flights/1

# Get available dates
curl -H "x-api-key: YOUR_KEY" http://localhost:3001/api/v1/dates

# Get stats
curl -H "x-api-key: YOUR_KEY" http://localhost:3001/api/v1/stats
```

## Environment Variables

| Variable          | Default                                          | Description                    |
|-------------------|--------------------------------------------------|--------------------------------|
| `PORT`            | `3001`                                           | Server port                    |
| `DATABASE_URL`    | `postgresql://flightdata:flightdata@localhost:5432/flightdata` | PostgreSQL connection string |
| `DB_SSL`          | `false`                                          | Enable SSL for DB connection   |
| `TRUST_PROXY`     | `false`                                          | Trust reverse proxy headers    |
| `ADMIN_USERNAME`  | `admin`                                          | Admin login username           |
| `ADMIN_PASSWORD`  | `admin123`                                       | Admin login password           |
| `SESSION_SECRET`  | (required)                                       | Express session secret         |
| `FLIGHTS_PER_DAY` | `36`                                             | Flights to generate each day   |
| `GENERATE_HOUR`   | `0`                                              | UTC hour for daily generation  |
| `GENERATE_MINUTE` | `5`                                              | UTC minute for daily generation|

## License

MIT
