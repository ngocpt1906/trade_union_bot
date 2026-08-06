import { Types } from "mongoose";
import { Worker, type WorkerDoc } from "../db/models/Worker.js";
import { getMachineById } from "./machineService.js";
import type { ShiftCode } from "./shiftCalendar.js";

export type CreateWorkerInput = {
  ownerKey: string;
  name: string;
  birthYear: number;
  shift: ShiftCode;
  machineId: string;
};

export type UpdateWorkerInput = {
  name?: string;
  birthYear?: number;
  shift?: ShiftCode;
  machineId?: string;
};

export async function createWorker(input: CreateWorkerInput): Promise<WorkerDoc> {
  const machine = await getMachineById(input.ownerKey, input.machineId);
  if (!machine) throw new Error("Máy không hợp lệ");

  return Worker.create({
    ownerKey: input.ownerKey,
    name: input.name.trim(),
    birthYear: input.birthYear,
    shift: input.shift,
    machineId: input.machineId,
    active: true,
  });
}

export async function listActiveWorkers(ownerKey: string): Promise<WorkerDoc[]> {
  return Worker.find({ ownerKey, active: true }).sort({ shift: 1, name: 1 }).exec();
}

export async function getWorkerById(
  ownerKey: string,
  id: string,
): Promise<WorkerDoc | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return Worker.findOne({ _id: id, ownerKey, active: true }).exec();
}

export async function updateWorker(
  ownerKey: string,
  id: string,
  patch: UpdateWorkerInput,
): Promise<WorkerDoc | null> {
  if (!Types.ObjectId.isValid(id)) return null;

  if (patch.machineId) {
    const machine = await getMachineById(ownerKey, patch.machineId);
    if (!machine) throw new Error("Máy không hợp lệ");
  }

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) update.name = patch.name.trim();
  if (patch.birthYear !== undefined) update.birthYear = patch.birthYear;
  if (patch.shift !== undefined) update.shift = patch.shift;
  if (patch.machineId !== undefined) update.machineId = patch.machineId;

  return Worker.findOneAndUpdate(
    { _id: id, ownerKey, active: true },
    update,
    { new: true },
  ).exec();
}

export async function deactivateWorker(
  ownerKey: string,
  id: string,
): Promise<WorkerDoc | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return Worker.findOneAndUpdate(
    { _id: id, ownerKey, active: true },
    { active: false },
    { new: true },
  ).exec();
}

export function formatWorkerLine(
  w: WorkerDoc,
  machineName?: string,
  index?: number,
): string {
  const prefix = index !== undefined ? `${index}. ` : "";
  const machine = machineName ? ` · Máy ${machineName}` : "";
  return `${prefix}${w.name} (${w.birthYear}) — Ca ${w.shift}${machine}`;
}
