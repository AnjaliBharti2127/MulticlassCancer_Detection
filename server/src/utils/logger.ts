import pino from "pino";
import { env, isProduction } from "../config/env";

/**
 * Structured JSON logger (pretty-printed in development).
 * Never log request bodies, files, tokens, or passwords — call sites pass
 * only small, explicit fields (ids, durations, status codes).
 */
export const logger = pino({
  level: env.logLevel,
  transport: isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
});
