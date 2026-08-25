import mongoose from "mongoose";
import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { logger } from "./utils/logger";

async function start(): Promise<void> {
  await connectDB();

  const server = app.listen(env.port, () => {
    logger.info({ port: env.port, env: env.nodeEnv }, "Patho backend listening");
  });

  // Graceful shutdown: stop accepting new connections, close the DB, then exit.
  // Force-exit after a timeout in case something hangs (e.g. an in-flight request).
  const shutdown = (signal: string) => {
    logger.info({ signal }, "shutting down");
    const forceExit = setTimeout(() => {
      logger.error("forced shutdown after timeout");
      process.exit(1);
    }, 10_000);

    server.close(async () => {
      clearTimeout(forceExit);
      await mongoose.connection.close();
      logger.info("shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start().catch((error) => {
  logger.error({ err: error instanceof Error ? error.message : error }, "failed to start server");
  process.exit(1);
});
