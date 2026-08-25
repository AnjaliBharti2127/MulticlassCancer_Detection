import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

/**
 * Validates all environment variables once, at startup, using Zod.
 * The rest of the app imports `env` and never touches `process.env` directly.
 * An invalid or missing required value fails fast with a readable message.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required (see .env.example)"),
  // Comma-separated list of allowed origins, e.g. "http://localhost:5173,https://app.example.com"
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(5),
  JSON_BODY_LIMIT: z.string().default("1mb"),
  MIN_IMAGE_DIMENSION_PX: z.coerce.number().int().positive().default(64),
  MAX_IMAGE_DIMENSION_PX: z.coerce.number().int().positive().default(20000),
  MAX_IMAGE_PIXELS: z.coerce.number().int().positive().default(100_000_000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  ML_SERVICE_URL: z.string().default("http://localhost:8000"),
  ML_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  console.error("Check your .env file against .env.example.");
  process.exit(1);
}

const parsedEnv = parsed.data;

export const env = {
  nodeEnv: parsedEnv.NODE_ENV,
  port: parsedEnv.PORT,
  mongodbUri: parsedEnv.MONGODB_URI,
  corsOrigins: parsedEnv.CORS_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean),
  maxFileSizeMb: parsedEnv.MAX_FILE_SIZE_MB,
  jsonBodyLimit: parsedEnv.JSON_BODY_LIMIT,
  minImageDimensionPx: parsedEnv.MIN_IMAGE_DIMENSION_PX,
  maxImageDimensionPx: parsedEnv.MAX_IMAGE_DIMENSION_PX,
  maxImagePixels: parsedEnv.MAX_IMAGE_PIXELS,
  rateLimitWindowMs: parsedEnv.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: parsedEnv.RATE_LIMIT_MAX,
  logLevel: parsedEnv.LOG_LEVEL,
  mlServiceUrl: parsedEnv.ML_SERVICE_URL,
  mlServiceTimeoutMs: parsedEnv.ML_SERVICE_TIMEOUT_MS,
};

export const isProduction = env.nodeEnv === "production";
