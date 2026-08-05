import type { AttendanceEventDoc, EventType } from "../db/models/AttendanceEvent.js";
import type { WorkerDoc } from "../db/models/Worker.js";
import { config } from "../config.js";
import { eachDateKey, formatDateVn, formatMonthVn } from "../utils/date.js";
import { listEventsForWorkers, eventTypeLabel } from "./attendanceService.js";
import { listActiveMachines } from "./machineService.js";
import { getDefaultHours, type ShiftCode } from "./shiftCalendar.js";
import { listActiveWorkers } from "./workerService.js";

export type DayBreakdown = {
  date: string;
  hours: number;
  defaultHours: number;
  events: AttendanceEventDoc[];
};

export type WorkerStats = {
  worker: WorkerDoc;
  machineName: string;
  workDays: number;
  totalHours: number;
  days: DayBreakdown[];
};

function roundHours(h: number): number {
  return Math.round(h * 100) / 100;
}

export function computeDayHours(
  shift: ShiftCode,
  dateKey: string,
  events: AttendanceEventDoc[],
  epoch = config.shiftEpoch,
): number {
  const byType = new Map<EventType, AttendanceEventDoc>();
  for (const e of events) byType.set(e.type, e);

  if (byType.has("leave")) {
    const ot = byType.get("overtime");
    return roundHours(ot ? ot.minutes / 60 : 0);
  }

  let hours = getDefaultHours(shift, dateKey, epoch);

  const late = byType.get("late");
  if (late) hours -= late.minutes / 60;

  const early = byType.get("early_leave");
  if (early) hours -= early.minutes / 60;

  const ot = byType.get("overtime");
  if (ot) hours += ot.minutes / 60;

  return roundHours(Math.max(0, hours));
}

export async function buildStats(
  ownerTelegramId: number,
  startDate: string,
  endDate: string,
): Promise<WorkerStats[]> {
  const [workers, machines] = await Promise.all([
    listActiveWorkers(ownerTelegramId),
    listActiveMachines(ownerTelegramId),
  ]);
  const machineNameById = new Map(
    machines.map((m) => [String(m._id), m.name]),
  );

  const events = await listEventsForWorkers(
    ownerTelegramId,
    workers.map((w) => String(w._id)),
    startDate,
    endDate,
  );

  const eventMap = new Map<string, AttendanceEventDoc[]>();
  for (const e of events) {
    const key = `${String(e.workerId)}|${e.date}`;
    const list = eventMap.get(key) ?? [];
    list.push(e);
    eventMap.set(key, list);
  }

  const dates = eachDateKey(startDate, endDate);
  const result: WorkerStats[] = [];

  for (const worker of workers) {
    const days: DayBreakdown[] = [];
    let totalHours = 0;
    let workDays = 0;

    for (const date of dates) {
      const dayEvents = eventMap.get(`${String(worker._id)}|${date}`) ?? [];
      const defaultHours = getDefaultHours(
        worker.shift as ShiftCode,
        date,
        config.shiftEpoch,
      );
      const hours = computeDayHours(
        worker.shift as ShiftCode,
        date,
        dayEvents,
      );
      if (hours > 0) workDays += 1;
      totalHours += hours;
      if (hours !== defaultHours || dayEvents.length > 0) {
        days.push({ date, hours, defaultHours, events: dayEvents });
      }
    }

    result.push({
      worker,
      machineName: machineNameById.get(String(worker.machineId)) ?? "?",
      workDays,
      totalHours: roundHours(totalHours),
      days,
    });
  }

  return result;
}

export function formatStatsMessage(
  title: string,
  stats: WorkerStats[],
): string {
  if (stats.length === 0) {
    return `${title}\n\nChưa có công nhân nào trong tổ.`;
  }

  const lines: string[] = [title, ""];
  let teamTotal = 0;

  stats.forEach((s, i) => {
    teamTotal += s.totalHours;
    lines.push(
      `${i + 1}. ${s.worker.name} (Ca ${s.worker.shift} · Máy ${s.machineName}): ${s.workDays} ngày · ${s.totalHours}h`,
    );
    for (const day of s.days) {
      if (day.events.length === 0) continue;
      const parts = day.events.map((e) => {
        if (e.type === "leave") return eventTypeLabel(e.type);
        const dur =
          e.minutes % 60 === 0 ? `${e.minutes / 60}h` : `${e.minutes}p`;
        return `${eventTypeLabel(e.type)} ${dur}`;
      });
      lines.push(`   - ${formatDateVn(day.date).slice(0, 5)} ${parts.join(", ")}`);
    }
  });

  lines.push("");
  lines.push(`Tổng tổ: ${roundHours(teamTotal)} giờ`);
  return lines.join("\n");
}

export function monthTitle(year: number, month: number): string {
  return `Bảng công ${formatMonthVn(year, month)}`;
}
