import mongoose from "mongoose";
import { config } from "../config.js";

export async function connectDb(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongodbUri, {
    // Prefer IPv4 — avoids some Windows DNS / dual-stack failures with Atlas
    family: 4,
    serverSelectionTimeoutMS: 15_000,
  });
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
