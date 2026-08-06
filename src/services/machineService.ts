import { Types } from "mongoose";
import { Machine, type MachineDoc } from "../db/models/Machine.js";
import { Worker } from "../db/models/Worker.js";

export async function createMachine(
  ownerKey: string,
  name: string,
): Promise<MachineDoc> {
  const trimmed = name.trim();
  if (trimmed.length < 1) throw new Error("Tên máy không hợp lệ");

  const existing = await Machine.findOne({
    ownerKey,
    name: trimmed,
    active: true,
  }).exec();
  if (existing) throw new Error(`Máy «${trimmed}» đã tồn tại`);

  return Machine.create({
    ownerKey,
    name: trimmed,
    active: true,
  });
}

export async function listActiveMachines(
  ownerKey: string,
): Promise<MachineDoc[]> {
  return Machine.find({ ownerKey, active: true }).sort({ name: 1 }).exec();
}

export async function getMachineById(
  ownerKey: string,
  id: string,
): Promise<MachineDoc | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  return Machine.findOne({ _id: id, ownerKey, active: true }).exec();
}

export async function renameMachine(
  ownerKey: string,
  id: string,
  name: string,
): Promise<MachineDoc | null> {
  const trimmed = name.trim();
  if (trimmed.length < 1) throw new Error("Tên máy không hợp lệ");

  const clash = await Machine.findOne({
    ownerKey,
    name: trimmed,
    active: true,
    _id: { $ne: id },
  }).exec();
  if (clash) throw new Error(`Máy «${trimmed}» đã tồn tại`);

  return Machine.findOneAndUpdate(
    { _id: id, ownerKey, active: true },
    { name: trimmed },
    { new: true },
  ).exec();
}

export async function deactivateMachine(
  ownerKey: string,
  id: string,
): Promise<{ machine: MachineDoc | null; blockedByWorkers: number }> {
  const assigned = await Worker.countDocuments({
    ownerKey,
    machineId: id,
    active: true,
  }).exec();
  if (assigned > 0) {
    return { machine: null, blockedByWorkers: assigned };
  }

  const machine = await Machine.findOneAndUpdate(
    { _id: id, ownerKey, active: true },
    { active: false },
    { new: true },
  ).exec();
  return { machine, blockedByWorkers: 0 };
}

export function formatMachineLine(m: MachineDoc, index?: number): string {
  const prefix = index !== undefined ? `${index}. ` : "";
  return `${prefix}${m.name}`;
}
