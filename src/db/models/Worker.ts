import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const workerSchema = new Schema(
  {
    ownerKey: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    birthYear: { type: Number, required: true, min: 1950, max: 2015 },
    shift: { type: String, required: true, enum: ["A", "B", "C"] },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
      index: true,
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

workerSchema.index({ ownerKey: 1, active: 1, shift: 1, name: 1 });

export type WorkerDoc = InferSchemaType<typeof workerSchema> & {
  _id: Types.ObjectId;
};

export const Worker = model("Worker", workerSchema);
