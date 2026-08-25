# Patho Backend

Backend API for **Patho**, a multiclass cancer detection web app (student portfolio project).
This is the basic backend foundation checkpoint — patients, cases, reports, and dashboard data,
backed by MongoDB. No ML inference yet.

## Tech stack

- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Multer (file upload)
- Zod (request validation)
- CORS, dotenv

## Folder structure

```text
backend/
├── src/
│   ├── config/        env parsing, MongoDB connection
│   ├── controllers/   request handlers
│   ├── middleware/    error handling, 404, upload, validation
│   ├── models/         Mongoose schemas (Patient, Case, Report)
│   ├── routes/         Express routers
│   ├── services/       business logic / DB queries
│   ├── validation/     Zod schemas
│   ├── types/           shared type declarations
│   ├── utils/           ApiError, asyncHandler, pagination helper
│   ├── seed/             seed script
│   ├── app.ts            Express app setup
│   └── server.ts         entry point
├── uploads/              uploaded slide images (served statically)
├── .env.example
└── package.json
```

## Requirements

- Node.js 18+
- A running MongoDB instance (local or Atlas)

## MongoDB setup

Any of these work:

- Install MongoDB Community Server locally and run `mongod`.
- Use Docker: `docker run -d -p 27017:27017 mongo`.
- Use a free MongoDB Atlas cluster and put its connection string in `MONGODB_URI`.

## Environment setup

```bash
cp .env.example .env
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend port | `5000` |
| `NODE_ENV` | `development` or `production` | `development` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/patho` |
| `FRONTEND_URL` | Allowed CORS origin | `http://localhost:5173` |
| `MAX_FILE_SIZE_MB` | Max slide image upload size | `5` |

The app throws a readable startup error if `MONGODB_URI` is missing.

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts the server with `tsx watch` (auto-restarts on file changes) at `http://localhost:5000`.
If MongoDB isn't reachable, the server still starts (so `/api/health` works), but any route
that touches the database will return a 500 error until MongoDB is available.

## Build

```bash
npm run build   # compiles TypeScript to dist/
npm start       # runs the compiled server
```

## Seed data

```bash
npm run seed
```

Clears and re-inserts a small set of fictional patients, cases, and reports (matching the
frontend's original mock data) so the app has something to look at immediately.

## API endpoints

Base path: `/api`

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check + DB connection status |
| GET | `/api/patients` | List patients (search, page, limit, sortBy, sortOrder) |
| GET | `/api/patients/:id` | Get one patient |
| POST | `/api/patients` | Create a patient |
| GET | `/api/cases` | List cases (search, status, page, limit, sortBy, sortOrder) |
| GET | `/api/cases/:id` | Get one case (by case number, e.g. `CASE-2026-0001`) |
| POST | `/api/cases` | Create a case (multipart: `patientId`, `specimenType`, `notes`, `slideImage`) |
| GET | `/api/reports` | List reports (search, status, page, limit, sortBy, sortOrder) |
| GET | `/api/reports/:id` | Get one report (by report number) |
| GET | `/api/dashboard/summary` | Dashboard summary stats |

All responses use the shape `{ success, message?, data? }` on success and
`{ success: false, message, errors: [] }` on error.

## Upload behavior

- Field name: `slideImage`
- Accepted types: JPG, JPEG, PNG only
- Max size: 5 MB (configurable via `MAX_FILE_SIZE_MB`)
- Files are saved to `backend/uploads/` with a unique generated filename
- Served statically at `http://localhost:5000/uploads/<filename>`

## Example requests

```bash
# Health check
curl http://localhost:5000/api/health

# Create a patient
curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Patient","age":30,"gender":"male","contactNumber":"9999999999"}'

# Create a case with a slide image
curl -X POST http://localhost:5000/api/cases \
  -F "patientId=<patient id from above>" \
  -F "specimenType=Lung needle biopsy" \
  -F "slideImage=@/path/to/slide.png"
```

## Current limitations

- No authentication/authorization yet.
- No ML inference — `predictedClass`, `confidence`, `topPredictions`, and `explainability`
  stay empty/default until a case is processed by a future prediction service. The frontend's
  Diagnose flow is still simulated and does not persist its result here (no update endpoint
  exists yet for that).
- No update/delete APIs for patients or cases (out of scope for this checkpoint).
- Reports are read-only (created only via the seed script).
- This development sandbox has no way to run MongoDB (not available via apt, and downloading a
  MongoDB binary is blocked by network restrictions), so end-to-end database reads/writes could
  not be exercised here. Routing, CORS, validation, file upload rules, and error handling were
  all verified directly against a running (DB-less) server. Test locally with a real MongoDB
  instance before relying on this.

## Future ML integration plan

A separate Python service will later handle image preprocessing, multiclass classification,
and Grad-CAM explainability. The `Case` model already has `prediction`-shaped fields
(`predictedClass`, `confidence`, `topPredictions`) and an `explainability` object ready to be
filled in once that service exists — no schema changes should be needed, just a new route/service
that calls the ML service and updates the case.

## Secure slide uploads (Block 5)

`POST /api/v1/cases` accepts one multipart field named `slideImage` plus `patientId`, `specimenType`, and optional `notes`.

The upload pipeline uses Multer memory storage, validates request fields before persistence, checks MIME type and real JPG/PNG/TIFF magic bytes, validates dimensions, derives the extension from detected bytes, and stores through a `StorageAdapter`. A saved image is deleted if case creation later fails.

Environment controls:

- `MAX_FILE_SIZE_MB`
- `MIN_IMAGE_DIMENSION_PX`
- `MAX_IMAGE_DIMENSION_PX`
- `MAX_IMAGE_PIXELS`
