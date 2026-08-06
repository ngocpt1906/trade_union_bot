import mongoose from "mongoose";
import { config } from "../config.js";
import { migrateOwnerKey } from "./migrateOwnerKey.js";
import "./models/Machine.js";
import "./models/Worker.js";
import "./models/AttendanceEvent.js";

export async function connectDb(): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongodbUri, {
    // Prefer IPv4 — avoids some Windows DNS / dual-stack failures with Atlas
    family: 4,
    serverSelectionTimeoutMS: 15_000,
  });
  await migrateOwnerKey();
  await Promise.all([
    mongoose.model("Machine").syncIndexes(),
    mongoose.model("Worker").syncIndexes(),
    mongoose.model("AttendanceEvent").syncIndexes(),
  ]);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
