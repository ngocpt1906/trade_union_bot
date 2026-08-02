import { daysBetween } from "../utils/date.js";

export type ShiftCode = "A" | "B" | "C";
export type ShiftStatus = "night" | "morning" | "off";

/** Cycle: N1(0) → N2(1) → Rest(2) → M1(3) → M2(4) → Rest(5) */
const BASE_PHASE: Record<ShiftCode, number> = {
  A: 1, // Night 2 on epoch
  B: 5, // Rest after morning on epoch
  C: 3, // Morning 1 on epoch
};

export function getPhase(shift: ShiftCode, dateKey: string, epoch: string): number {
  const offset = daysBetween(epoch, dateKey);
  if (offset < 0) {
    // Allow dates before epoch by wrapping
    const mod = ((offset % 6) + 6) % 6;
    return (BASE_PHASE[shift] + mod) % 6;
  }
  return (BASE_PHASE[shift] + offset) % 6;
}

export function getShiftStatus(
  shift: ShiftCode,
  dateKey: string,
  epoch: string,
): ShiftStatus {
  const phase = getPhase(shift, dateKey, epoch);
  if (phase === 0 || phase === 1) return "night";
  if (phase === 3 || phase === 4) return "morning";
  return "off";
}

export function getDefaultHours(
  shift: ShiftCode,
  dateKey: string,
  epoch: string,
): number {
  return getShiftStatus(shift, dateKey, epoch) === "off" ? 0 : 12;
}

export function statusLabel(status: ShiftStatus): string {
  switch (status) {
    case "night":
      return "ca đêm";
    case "morning":
      return "ca sáng";
    case "off":
      return "nghỉ";
  }
}
