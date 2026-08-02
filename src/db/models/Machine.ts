import { Schema, model, type InferSchemaType, type Types } from "mongoose";

const machineSchema = new Schema(
  {
    ownerTelegramId: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } },
);

machineSchema.index(
  { ownerTelegramId: 1, name: 1 },
  { unique: true, partialFilterExpression: { active: true } },
);
machineSchema.index({ ownerTelegramId: 1, active: 1 });

export type MachineDoc = InferSchemaType<typeof machineSchema> & {
  _id: Types.ObjectId;
};

export const Machine = model("Machine", machineSchema);
