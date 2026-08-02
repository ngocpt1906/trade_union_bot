import { Schema, model, type InferSchemaType, type Types } from "mongoose";

export const EVENT_TYPES = ["leave", "overtime", "early_leave", "late"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const attendanceEventSchema = new Schema(
  {
    ownerTelegramId: { type: Number, required: true, index: true },
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    type: { type: String, required: true, enum: EVENT_TYPES },
    minutes: { type: Number, required: true, min: 0, default: 0 },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

attendanceEventSchema.index(
  { ownerTelegramId: 1, workerId: 1, date: 1, type: 1 },
  { unique: true },
);
attendanceEventSchema.index({ ownerTelegramId: 1, date: 1 });

export type AttendanceEventDoc = InferSchemaType<typeof attendanceEventSchema> & {
  _id: Types.ObjectId;
};

export const AttendanceEvent = model("AttendanceEvent", attendanceEventSchema);
