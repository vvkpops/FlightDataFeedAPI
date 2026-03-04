# Flight Data API — Documentation

## Base URL

```
https://your-host/api/v1
```

## Authentication

All API endpoints require a valid API key passed via the `x-api-key` header.

```
x-api-key: fda_your_api_key_here
```

API keys can be created and managed from the admin panel at `/admin/api-keys.html`.

---

## Endpoints

### GET /api/v1/flights

Retrieve paginated flight data with optional filters.

**Query Parameters:**

| Parameter      | Type   | Default | Description                              |
|---------------|--------|---------|------------------------------------------|
| `date`        | string | —       | Filter by generation date (`YYYY-MM-DD`) |
| `from_date`   | string | —       | Start of date range (inclusive)           |
| `to_date`     | string | —       | End of date range (inclusive)             |
| `callsign`    | string | —       | Exact callsign match (e.g. `PVL910`)     |
| `departure`   | string | —       | Departure ICAO code (e.g. `CYUL`)        |
| `arrival`     | string | —       | Arrival ICAO code                        |
| `registration`| string | —       | Aircraft registration (e.g. `C-GMXE`)    |
| `page`        | number | 1       | Page number                              |
| `limit`       | number | 50      | Results per page (max 200)               |

**Example Request:**

```bash
curl -H "x-api-key: YOUR_KEY" \
  "https://your-host/api/v1/flights?date=2026-03-04&departure=CYUL&limit=10"
```

**Example Response:**

```json
{
  "data": [
    {
      "id": 1,
      "callsign": "PVL910",
      "actype": "B77E",
      "acregistration": "C-GMXE",
      "departureicao": "CYUL",
      "arrivalicao": "CYQB",
      "alternateicao": "CYMX",
      "departuretime": "2026-03-04T08:15:00.000Z",
      "arrivaltime": "2026-03-04T09:45:00.000Z",
      "eta": "2026-03-04T09:52:00.000Z",
      "alteta": "2026-03-04T09:55:00.000Z",
      "generation_date": "2026-03-04",
      "created_at": "2026-03-04T00:05:00.000Z",
      "updated_at": "2026-03-04T00:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 36,
    "pages": 4
  }
}
```

---

### GET /api/v1/flights/:id

Retrieve a single flight by ID.

```bash
curl -H "x-api-key: YOUR_KEY" "https://your-host/api/v1/flights/42"
```

```json
{
  "data": {
    "id": 42,
    "callsign": "PVL847",
    "actype": "DH8D",
    "acregistration": "C-FHUM",
    "departureicao": "CYOW",
    "arrivalicao": "CYUL",
    "alternateicao": "CYMX",
    "departuretime": "2026-03-04T07:00:00.000Z",
    "arrivaltime": "2026-03-04T08:35:00.000Z",
    "eta": "2026-03-04T08:42:00.000Z",
    "alteta": "2026-03-04T08:50:00.000Z",
    "generation_date": "2026-03-04",
    "created_at": "2026-03-04T00:05:00.000Z",
    "updated_at": "2026-03-04T00:05:00.000Z"
  }
}
```

---

### GET /api/v1/dates

List all dates for which flight data has been generated.

```bash
curl -H "x-api-key: YOUR_KEY" "https://your-host/api/v1/dates"
```

```json
{
  "data": [
    { "generation_date": "2026-03-05", "flights_count": 36, "created_at": "2026-03-05T00:05:00.000Z" },
    { "generation_date": "2026-03-04", "flights_count": 36, "created_at": "2026-03-04T00:05:00.000Z" }
  ]
}
```

---

### GET /api/v1/stats

Get summary statistics.

```bash
curl -H "x-api-key: YOUR_KEY" "https://your-host/api/v1/stats"
```

```json
{
  "data": {
    "total_flights": 252,
    "total_days": 7,
    "latest_generation_date": "2026-03-05"
  }
}
```

---

## Error Responses

| Status | Meaning                             |
|--------|-------------------------------------|
| `401`  | Missing `x-api-key` header          |
| `403`  | Invalid or revoked API key          |
| `404`  | Resource not found                  |
| `500`  | Internal server error               |

All errors return JSON:

```json
{
  "error": "Description of the error"
}
```

---

## Data Schema

| Field            | Type      | Description                           |
|-----------------|-----------|---------------------------------------|
| `id`            | integer   | Auto-increment primary key            |
| `callsign`      | string    | Flight callsign (e.g. PVL910)        |
| `actype`        | string    | ICAO aircraft type designator         |
| `acregistration`| string    | Aircraft registration (e.g. C-GMXE)  |
| `departureicao` | string    | Departure airport ICAO code           |
| `arrivalicao`   | string    | Arrival airport ICAO code             |
| `alternateicao` | string    | Alternate/diversion airport ICAO code |
| `departuretime` | ISO 8601  | Scheduled departure time (UTC)        |
| `arrivaltime`   | ISO 8601  | Scheduled arrival time (UTC)          |
| `eta`           | ISO 8601  | Estimated time of arrival (UTC)       |
| `alteta`        | ISO 8601  | ETA to alternate airport (UTC)        |
| `generation_date`| date     | The date this record was generated for|
| `created_at`    | ISO 8601  | Record creation timestamp             |
| `updated_at`    | ISO 8601  | Record last-update timestamp          |

---

## Rate Limits

No rate limits are enforced by default. For production deployments, consider adding
`express-rate-limit` or a reverse proxy rate limiter.

---

## Notes

- Flight data is generated daily at 00:05 UTC by default (configurable via `GENERATE_HOUR` / `GENERATE_MINUTE` env vars).
- Historical data is retained indefinitely.
- The data generator creates ~36 flights/day across Canadian domestic routes.
- ETAs include realistic jitter of +/- a few minutes from the scheduled arrival time.
- Alternate ETAs factor in the extra distance to the alternate airport.
