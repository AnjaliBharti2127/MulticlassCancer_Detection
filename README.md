# Patho

Full-stack histopathology case-management and multiclass cancer-prediction application.

## Services

- `client`: React + TypeScript + Vite + Tailwind
- `server`: Express + TypeScript + MongoDB
- `ml-service`: FastAPI + PyTorch model-service contract

## Local setup

1. Copy each `.env.example` to `.env` in its service directory.
2. Start MongoDB.
3. Run the ML service: `cd ml-service && pip install -r requirements.txt && uvicorn app.main:app --reload`.
4. Run the backend: `cd server && npm ci && npm run dev`.
5. Run the frontend: `cd client && npm ci && npm run dev`.

Frontend: `http://localhost:5173`  
Backend: `http://localhost:5000/api/v1`  
ML service: `http://localhost:8000`

## Docker

Run `docker compose up --build` from the repository root. The application starts without a checkpoint; prediction requests then return `MODEL_NOT_LOADED` rather than generating fake results.

## Verification

- Client: `npm run lint && npm run build`
- Server: `npm run lint && npm run build && npm test`
- ML service: `python -m pytest`

## Real-model integration

To enable genuine prediction, add the exact trained architecture, best Stage-2 checkpoint, class-index mapping, validation preprocessing, confidence threshold and model version. Do not use this student project for clinical diagnosis.
