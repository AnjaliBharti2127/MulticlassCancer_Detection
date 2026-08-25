// Ensures a valid, isolated environment configuration exists before any test
// file imports `src/config/env`, which validates process.env eagerly at
// import time. Real .env files are intentionally not committed, so tests
// must not depend on one being present on disk.
process.env.NODE_ENV ??= "test";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/patho-test";
process.env.CORS_ORIGINS ??= "http://localhost:5173";
process.env.MAX_FILE_SIZE_MB ??= "5";
process.env.MIN_IMAGE_DIMENSION_PX ??= "64";
process.env.MAX_IMAGE_DIMENSION_PX ??= "20000";
process.env.MAX_IMAGE_PIXELS ??= "100000000";
process.env.LOG_LEVEL ??= "silent";
