import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import { env } from "./config/env";
import { logger } from "./utils/logger";
import { requestId } from "./middleware/requestId";
import { errorHandler } from "./middleware/errorHandler";
import { notFound } from "./middleware/notFound";

import healthRoutes from "./routes/healthRoutes";
import patientRoutes from "./routes/patientRoutes";
import caseRoutes from "./routes/caseRoutes";
import reportRoutes from "./routes/reportRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";

import predictionRoutes from "./routes/predictionRoutes";

const app = express();

app.set("trust proxy", 1);

app.use(requestId);
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin/non-browser requests (no Origin header) and any configured origin.
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);
app.use(express.json({ limit: env.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: env.jsonBodyLimit }));

app.use(
  rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on("finish", () => {
    logger.info(
      { requestId: req.id, method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - startedAt },
      "request completed"
    );
  });
  next();
});

// Serve uploaded slide images statically, e.g. http://localhost:5000/uploads/example.jpg
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const API_PREFIX = "/api/v1";
app.use(`${API_PREFIX}/health`, healthRoutes);
app.use(`${API_PREFIX}/patients`, patientRoutes);
app.use(`${API_PREFIX}/cases`, caseRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use("/api/v1/predictions", predictionRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
