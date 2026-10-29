# Internship API

A REST API for internship records, built with **Node.js**, **Express** and **SQLite** (`better-sqlite3`).
It supports list, detail, create, update and delete, with input validation, pagination, filtering and consistent JSON responses.

## Setup

Requires Node.js 18 or newer.

```bash
npm install
npm start
```

The server runs at `http://localhost:3000`. On first start it creates `internships.db` from `schema.sql` and loads the records from `seed.json`.

To reload the seed data manually: `npm run seed` (existing IDs are not duplicated).

Optional settings are listed in `.env.example` (`PORT`, `DB_FILE`). No secrets are needed.

## Schema

See `schema.sql`.

| Column   | Type    | Notes                                  |
|----------|---------|----------------------------------------|
| id       | TEXT    | Primary key, e.g. `INT-101`            |
| title    | TEXT    | Required                               |
| domain   | TEXT    | Required                               |
| mode     | TEXT    | `Remote`, `Hybrid` or `On-site`        |
| location | TEXT    | Required                               |
| skills   | TEXT    | JSON array stored as text              |
| openings | INTEGER | 0 or more                              |

## Response format

Success:

```json
{ "status": "success", "data": [ ... ], "pagination": { "page": 1, "limit": 5, "total": 5, "totalPages": 1 } }
```

Error:

```json
{ "status": "error", "error": { "message": "Validation failed", "details": ["mode must be one of: Remote, Hybrid, On-site"] } }
```

## Endpoints

| Method | Path               | Description                          | Success |
|--------|--------------------|--------------------------------------|---------|
| GET    | `/internships`     | List with pagination and filters     | 200     |
| GET    | `/internships/:id` | Get one record                       | 200     |
| POST   | `/internships`     | Create a record                      | 201     |
| PUT    | `/internships/:id` | Update (send only changed fields)    | 200     |
| DELETE | `/internships/:id` | Delete a record                      | 200     |

List query options: `page`, `limit` (1 to 50), `domain`, `mode`, `q` (search title or skills).

Status codes: `400` invalid input, `404` not found, `500` server error.

## Examples

```bash
# List, page 1, 2 per page
curl "http://localhost:3000/internships?page=1&limit=2"

# Filter by mode and domain
curl "http://localhost:3000/internships?mode=Remote&domain=UI/UX"

# One record
curl http://localhost:3000/internships/INT-101

# Create
curl -X POST http://localhost:3000/internships \
  -H "Content-Type: application/json" \
  -d '{"title":"QA Intern","domain":"Full Stack Development","mode":"Remote","location":"India","skills":["Testing","Cypress"],"openings":2}'

# Update
curl -X PUT http://localhost:3000/internships/INT-101 \
  -H "Content-Type: application/json" \
  -d '{"openings":5}'

# Delete
curl -X DELETE http://localhost:3000/internships/INT-105

# Invalid input returns 400
curl -X POST http://localhost:3000/internships \
  -H "Content-Type: application/json" \
  -d '{"title":"","mode":"Anywhere"}'
```

## Validation rules

- `title`, `domain` and `location` must be non-empty text.
- `mode` must be `Remote`, `Hybrid` or `On-site`.
- `skills` must be an array of non-empty strings.
- `openings` must be a whole number, 0 or more.
- Bad JSON, unknown IDs and bad query values return clear error messages.

## Logging

Logs record only the method, path and status code. Request bodies are never logged.

## Test results

Add your own results here after running the examples above (for example, a screenshot or the status codes you saw).
