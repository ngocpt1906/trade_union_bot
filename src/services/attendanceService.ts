import {
  AttendanceEvent,
  type AttendanceEventDoc,
  type EventType,
} from "../db/models/AttendanceEvent.js";
import { getWorkerById } from "./workerService.js";

export type UpsertEventInput = {
  ownerKey: string;
  workerId: string;
  date: string;
  type: EventType;
  minutes?: number;
  note?: string;
};

export async function upsertEvent(
  input: UpsertEventInput,
): Promise<AttendanceEventDoc> {
  const worker = await getWorkerById(input.ownerKey, input.workerId);
  if (!worker) throw new Error("Công nhân không hợp lệ");

  const minutes =
    input.type === "leave" ? 0 : Math.max(0, Math.round(input.minutes ?? 0));

  if (input.type !== "leave" && minutes <= 0) {
    throw new Error("Cần nhập số phút > 0");
  }

  const event = await AttendanceEvent.findOneAndUpdate(
    {
      ownerKey: input.ownerKey,
      workerId: input.workerId,
      date: input.date,
      type: input.type,
    },
    {
      ownerKey: input.ownerKey,
      workerId: input.workerId,
      date: input.date,
      type: input.type,
      minutes,
      note: input.note?.trim() ?? "",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).exec();

  if (!event) throw new Error("Không lưu được sự kiện");
  return event;
}

export async function listEventsForWorkers(
  ownerKey: string,
  workerIds: string[],
  startDate: string,
  endDate: string,
): Promise<AttendanceEventDoc[]> {
  if (workerIds.length === 0) return [];
  return AttendanceEvent.find({
    ownerKey,
    workerId: { $in: workerIds },
    date: { $gte: startDate, $lte: endDate },
  })
    .sort({ date: 1, type: 1 })
    .exec();
}

export async function listEventsForWorkerOnDate(
  ownerKey: string,
  workerId: string,
  date: string,
): Promise<AttendanceEventDoc[]> {
  return AttendanceEvent.find({ ownerKey, workerId, date })
    .sort({ type: 1 })
    .exec();
}

export async function deleteEventsForWorkerOnDate(
  ownerKey: string,
  workerId: string,
  date: string,
): Promise<number> {
  const result = await AttendanceEvent.deleteMany({
    ownerKey,
    workerId,
    date,
  }).exec();
  return result.deletedCount ?? 0;
}

export async function deleteEvent(
  ownerKey: string,
  workerId: string,
  date: string,
  type: EventType,
): Promise<boolean> {
  const result = await AttendanceEvent.deleteOne({
    ownerKey,
    workerId,
    date,
    type,
  }).exec();
  return (result.deletedCount ?? 0) > 0;
}

export function eventTypeLabel(type: EventType): string {
  switch (type) {
    case "leave":
      return "nghỉ";
    case "overtime":
      return "tăng ca";
    case "early_leave":
      return "về sớm";
    case "late":
      return "muộn";
  }
}

export function formatEventLine(event: AttendanceEventDoc): string {
  const label = eventTypeLabel(event.type);
  if (event.type === "leave") {
    return `${label}${event.note ? ` (${event.note})` : ""}`;
  }
  const hours = event.minutes / 60;
  const duration =
    event.minutes % 60 === 0 ? `${hours}h` : `${event.minutes}p`;
  return `${label} ${duration}${event.note ? ` (${event.note})` : ""}`;
}
