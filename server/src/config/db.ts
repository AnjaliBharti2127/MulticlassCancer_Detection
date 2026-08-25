import mongoose from "mongoose";
import { env } from "./env";

/**
 * Connects to MongoDB using Mongoose.
 * The server can still boot without a DB connection (so /api/health is
 * reachable and reports status), but every data route will fail until
 * MongoDB is reachable.
 */
export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongodbUri, { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", (error as Error).message);
    console.error("The server will keep running, but data routes will not work until MongoDB is reachable.");
  }
}

export function getDbStatus(): "connected" | "disconnected" | "connecting" | "disconnecting" {
  const states: Record<number, "disconnected" | "connected" | "connecting" | "disconnecting"> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] ?? "disconnected";
}
