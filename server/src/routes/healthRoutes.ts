import { Router } from "express";
import { getDbStatus } from "../config/db";
import { sendSuccess } from "../utils/apiResponse";
import { ApiError } from "../utils/ApiError";

const router = Router();

// Liveness: the process is up and can respond. Never depends on the DB.
router.get("/", (_req, res) => {
  sendSuccess(res, { status: "ok", uptimeSeconds: process.uptime() });
});

// Readiness: the app can actually serve data requests right now.
router.get("/ready", (_req, res, next) => {
  const dbStatus = getDbStatus();
  if (dbStatus !== "connected") {
    next(ApiError.unavailable(`Not ready: database is ${dbStatus}`));
    return;
  }
  sendSuccess(res, { status: "ready", database: dbStatus });
});

export default router;
