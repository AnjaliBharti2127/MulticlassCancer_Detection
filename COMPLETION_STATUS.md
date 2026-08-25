# Patho completion status

All application work that does not require the trained model artifacts is implemented:

- Patient and case API flows
- Secure image upload validation and storage
- Dashboard and frontend API integration
- Draft/finalized report workflow
- Atomic duplicate-finalization guard
- Prediction proxy error handling
- Dockerfiles and Docker Compose
- Environment examples and documentation
- Backend route tests for patients, cases, uploads, reports, and prediction error contracts
- ML service placeholder tests

## Intentionally remaining

Real inference and Grad-CAM require the final Stage-2 model architecture, checkpoint, class-index mapping, validation preprocessing, and confidence threshold. The service safely reports `MODEL_NOT_LOADED` until those artifacts are provided.

## Verification performed

- ML service: `8 passed`
- Client/server npm verification could not run in the packaging environment because npm dependency installation did not complete; run `npm ci` followed by the documented lint/build/test commands locally or in CI.
