# Patho ML Service (Block 5)

FastAPI application skeleton for the future Stage-2 histopathology
inference service. Separate from the Node/Express backend; no real
model architecture or checkpoint exists yet.

## Status: skeleton only — no model loaded

This block wires up the FastAPI app, config, logging, error handling,
health checks, and a safe prediction placeholder. It deliberately does
**not**:

- define or import a real model architecture
- load any checkpoint
- return fake or placeholder predictions

`app/services/model_service.py` is the integration point for a future
block: `ModelService.load_model()` and `ModelService.predict()` are both
no-ops / raise by design. `POST /predict` always returns HTTP 503 with a
`MODEL_NOT_LOADED` error until a later block implements real loading.

## Setup

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Test

```bash
python -m pytest
python -c "from app.main import app; print(app.title)"
```

## Endpoints

- `GET /health` and `GET /api/v1/health` — service status and `modelLoaded`
- `POST /predict` and `POST /api/v1/predict` — always `503 MODEL_NOT_LOADED`
  in this block. Both paths exist and behave identically: `/predict`
  matches the current Node service's call site
  (`server/src/services/mlPredictionService.ts`, which posts to
  `${ML_SERVICE_URL}/predict`); `/api/v1/predict` is the versioned path
  this block was asked to add. See "Known compatibility note" below.
- Any unknown route — consistent `404` in the same error envelope as every
  other error response.

## Error envelope

Every non-2xx response (including framework-level 404s and validation
errors) uses the same shape:

```json
{
  "success": false,
  "error": {
    "code": "MODEL_NOT_LOADED",
    "message": "The prediction model is not loaded."
  }
}
```

## Environment variables

See `.env.example`: `HOST`, `PORT`, `LOG_LEVEL`, `MODEL_PATH`,
`ALLOWED_IMAGE_SIZE_MB`, `MODEL_INPUT_SIZE`, `REQUEST_TIMEOUT_SECONDS`.
None of these point at a real checkpoint yet.

## Known compatibility note (not changed in this block)

The existing Node service (`server/src/services/mlPredictionService.ts`)
already calls `${ML_SERVICE_URL}/predict` (no `/api/v1` prefix), while this
block's instructions specified `POST /api/v1/predict`. Rather than edit the
Node/TypeScript project, this block registers the prediction (and health)
routes at **both** the bare path and the `/api/v1` path, so nothing already
built breaks. Worth a conscious decision in a later block: standardize on
one path and update the Node caller if `/api/v1` is preferred long-term.

## Next block

Block 6 will add the real Stage-2 architecture and checkpoint loading
behind `ModelService.load_model()` / `ModelService.predict()`.
