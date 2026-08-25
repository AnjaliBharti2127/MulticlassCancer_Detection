# Patho — AI-Assisted Histopathology Frontend

Patho is a frontend for a pathology copilot tool. A lab user can register
patients, submit histopathology slide images as "cases," run them through an
AI classification model, review the model's prediction alongside a Grad-CAM
style explainability view, and browse finalized diagnostic reports.

This repository is the **frontend**. Patients, cases, reports, and dashboard data are now
fetched from the real Node/Express backend in `../backend` (see
[Backend integration](#backend-integration)). Prediction and explainability are still
simulated — see the note below.

> This is a student portfolio / capstone-style project. The architecture is
> deliberately simple — plain React state and fetch-style service functions,
> no heavy state management library, no server framework — so it stays easy
> to explain end-to-end in an interview.

## Features

- **Dashboard** — case counts, average model confidence, active model
  version, and a table of recent cases.
- **Patients** — searchable, sortable, paginated patient list with an "Add
  patient" form (validated, with a discard-changes confirmation).
- **Cases** — searchable/filterable/sortable case list; a "Create case" flow
  that attaches a slide upload to a patient and hands off to diagnosis.
- **Diagnose** — upload a slide (or continue one from a case), submit it to
  an async prediction job, and poll for status until a result is ready.
- **Explainability viewer** — side-by-side original slide vs. AI attention
  heatmap, plus a blend slider to compare them directly.
- **Reports** — list and detail views for finalized, printable diagnostic
  reports.
- **Toast notifications** for success/error/info feedback on key actions.
- **Confirmation dialogs** before discarding unsaved patient/case data or an
  in-progress analysis result.
- **Responsive layout** with a collapsible mobile sidebar, down to small
  phone widths.
- Loading, empty, and error states on every data-driven page.

## Tech stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/) as the build tool / dev server
- [React Router](https://reactrouter.com/) for client-side routing
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [lucide-react](https://lucide.dev/) for icons
- [oxlint](https://oxc.rs/) for linting

Talks to a Node/Express + MongoDB backend — see [Backend integration](#backend-integration)
and `../backend/README.md`.

## Installation

```bash
cp .env.example .env   # set VITE_API_BASE_URL if the backend isn't on localhost:5000
npm install
npm run dev
```

The app runs at `http://localhost:5173` by default. Start the backend first (see
`../backend/README.md`) so patients/cases/reports/dashboard data can load.

## Available scripts

| Script            | What it does                                      |
| ----------------- | -------------------------------------------------- |
| `npm run dev`      | Starts the Vite dev server with hot reload         |
| `npm run build`    | Type-checks (`tsc -b`) and builds for production   |
| `npm run lint`     | Runs oxlint across the project                     |
| `npm run preview`  | Serves the production build locally                |

## Folder structure

```
src/
  components/   Reusable UI pieces (forms, cards, dialogs, tables, viewers)
  config/       Frontend configuration (API base URL, upload limits, etc.)
  context/      React context providers (currently: toast notifications)
  data/         Original mock data (no longer imported by services; kept for reference)
  layouts/      Page shell (sidebar + header + routed content)
  pages/        One component per route (Dashboard, CasesList, Diagnose, ...)
  services/     Data-access functions the pages call, incl. apiClient.ts (fetch wrapper)
  types/        Shared TypeScript types
  utils/        Small helpers (date formatting, fake delay for simulated prediction)
```

### Why a `services/` layer?

Every page talks to data through a function in `src/services/`
(`getPatients`, `createCase`, `getPredictionJobStatus`, ...) instead of
calling `fetch` directly. That's the one place backend response shapes get
mapped to frontend types, so pages/components never need to know about the
backend's field names.

## Backend integration

The frontend now calls the real backend in `../backend` for patients, cases, reports, and
the dashboard summary.

1. `src/config/api.ts` reads `VITE_API_BASE_URL` (default `http://localhost:5000/api`).
2. `src/services/apiClient.ts` is a small `fetch` wrapper (GET / POST JSON / POST multipart,
   timeout, and unwraps the backend's `{ success, data, message }` envelope into `ApiClientError`
   on failure).
3. Each service file (`patientService.ts`, `caseService.ts`, `reportService.ts`,
   `dashboardService.ts`) calls the matching REST endpoint and maps the response into the
   frontend's existing types — no page or component needed to change.

Two flows are worth knowing about:

- **Prediction is job-based and still simulated**: `createPredictionJob` → poll
  `getPredictionJobStatus` → `getPredictionResult` → (optionally) `getExplainability`, all in
  `predictionService.ts`, unchanged. There's no backend endpoint yet to save a prediction result,
  so `attachPredictionToCase` / `attachExplainabilityToCase` (in `caseService.ts`) keep the
  result in an in-memory overlay for the current browser session only — refreshing the page
  loses it. This will be replaced once the ML service exists.
- **Reports are joined by the backend now**, not the frontend — `reportService.ts` just fetches
  `GET /api/reports` / `GET /api/reports/:id`, which already return the joined `ReportDetail`
  shape.

## Known limitations

- Prediction and explainability are simulated, not a real model, and are not persisted to the
  backend (see above) — they reset on page refresh.
- There is no authentication or user accounts yet.
- Patients, cases, and reports are persisted in MongoDB via the backend, but require a running
  backend + MongoDB instance — see `../backend/README.md`.
- No automated tests yet (manual verification only).

## Disclaimer

This project is for educational/demo purposes. It is not a certified
medical device and should not be used for real clinical decisions.
