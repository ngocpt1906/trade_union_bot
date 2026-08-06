import type { EventType } from "../db/models/AttendanceEvent.js";
import type { ShiftCode } from "../services/shiftCalendar.js";

export type SessionState =
  | { kind: "idle" }
  // machines
  | { kind: "add_machine_name" }
  | { kind: "edit_machine_pick" }
  | { kind: "edit_machine_name"; machineId: string; machineName: string }
  | { kind: "delete_machine_pick" }
  // workers
  | { kind: "add_worker_name" }
  | { kind: "add_worker_birth"; name: string }
  | { kind: "add_worker_shift"; name: string; birthYear: number }
  | {
      kind: "add_worker_machine";
      name: string;
      birthYear: number;
      shift: ShiftCode;
    }
  | { kind: "edit_worker_pick" }
  | {
      kind: "edit_worker_field";
      workerId: string;
      workerName: string;
    }
  | {
      kind: "edit_worker_name";
      workerId: string;
      workerName: string;
    }
  | {
      kind: "edit_worker_birth";
      workerId: string;
      workerName: string;
    }
  | {
      kind: "edit_worker_shift";
      workerId: string;
      workerName: string;
    }
  | {
      kind: "edit_worker_machine";
      workerId: string;
      workerName: string;
    }
  | { kind: "deactivate_pick_worker" }
  // attendance
  | { kind: "attendance_pick_worker" }
  | { kind: "attendance_pick_date"; workerId: string; workerName: string }
  | {
      kind: "attendance_pick_type";
      workerId: string;
      workerName: string;
      date: string;
    }
  | {
      kind: "attendance_minutes";
      workerId: string;
      workerName: string;
      date: string;
      type: EventType;
    }
  | {
      kind: "attendance_note";
      workerId: string;
      workerName: string;
      date: string;
      type: EventType;
      minutes: number;
    }
  | { kind: "delete_pick_worker" }
  | { kind: "delete_pick_date"; workerId: string; workerName: string }
  // stats
  | { kind: "stats_month" };

type Entry = { state: SessionState; updatedAt: number };

const TIMEOUT_MS = 15 * 60 * 1000;
const sessions = new Map<string, Entry>();

export function getSession(ownerKey: string): SessionState {
  const entry = sessions.get(ownerKey);
  if (!entry) return { kind: "idle" };
  if (Date.now() - entry.updatedAt > TIMEOUT_MS) {
    sessions.delete(ownerKey);
    return { kind: "idle" };
  }
  return entry.state;
}

export function setSession(ownerKey: string, state: SessionState): void {
  sessions.set(ownerKey, { state, updatedAt: Date.now() });
}

export function clearSession(ownerKey: string): void {
  sessions.set(ownerKey, { state: { kind: "idle" }, updatedAt: Date.now() });
}
