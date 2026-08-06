import type { Context } from "grammy";
import type { EventType } from "../../db/models/AttendanceEvent.js";
import {
  deleteEventsForWorkerOnDate,
  eventTypeLabel,
  formatEventLine,
  listEventsForWorkerOnDate,
  upsertEvent,
} from "../../services/attendanceService.js";
import { getWorkerById, listActiveWorkers } from "../../services/workerService.js";
import { formatDateVn, parseDateKey, todayKey } from "../../utils/date.js";
import { getOwnerId } from "../owner.js";
import {
  BTN,
  cancelKeyboard,
  dateChoiceKeyboard,
  eventTypeInlineKeyboard,
  itemsInlineKeyboard,
  mainKeyboard,
  noteKeyboard,
} from "../menus.js";
import { clearSession, getSession, setSession } from "../session.js";

export async function startAddEvent(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const workers = await listActiveWorkers(ownerId);
  if (workers.length === 0) {
    await ctx.reply(
      `Chưa có công nhân. Hãy thêm bằng nút «${BTN.addWorker}» trước.`,
      { reply_markup: mainKeyboard() },
    );
    return;
  }
  setSession(ownerId, { kind: "attendance_pick_worker" });
  await ctx.reply("Chọn công nhân để ghi phát sinh:", {
    reply_markup: itemsInlineKeyboard(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift})`,
      })),
      "attw",
    ),
  });
  await ctx.reply("Hoặc bấm Hủy để thoát.", { reply_markup: cancelKeyboard() });
}

export async function startDeleteEvent(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const workers = await listActiveWorkers(ownerId);
  if (workers.length === 0) {
    await ctx.reply("Chưa có công nhân.", { reply_markup: mainKeyboard() });
    return;
  }
  setSession(ownerId, { kind: "delete_pick_worker" });
  await ctx.reply("Chọn công nhân để xóa phát sinh:", {
    reply_markup: itemsInlineKeyboard(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift})`,
      })),
      "delw",
    ),
  });
  await ctx.reply("Hoặc bấm Hủy để thoát.", { reply_markup: cancelKeyboard() });
}

export async function handleAttendanceCallback(ctx: Context): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data) return false;
  const ownerId = getOwnerId(ctx);

  if (data.startsWith("attw:")) {
    const workerId = data.slice("attw:".length);
    const worker = await getWorkerById(ownerId, workerId);
    if (!worker) {
      await ctx.answerCallbackQuery({ text: "Không tìm thấy" });
      return true;
    }
    setSession(ownerId, {
      kind: "attendance_pick_date",
      workerId,
      workerName: worker.name,
    });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Công nhân: ${worker.name}`);
    await ctx.reply("Chọn «Hôm nay» hoặc nhập ngày (DD/MM/YYYY):", {
      reply_markup: dateChoiceKeyboard(),
    });
    return true;
  }

  if (data.startsWith("delw:")) {
    const workerId = data.slice("delw:".length);
    const worker = await getWorkerById(ownerId, workerId);
    if (!worker) {
      await ctx.answerCallbackQuery({ text: "Không tìm thấy" });
      return true;
    }
    setSession(ownerId, {
      kind: "delete_pick_date",
      workerId,
      workerName: worker.name,
    });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Xóa phát sinh — ${worker.name}`);
    await ctx.reply("Chọn «Hôm nay» hoặc nhập ngày cần xóa (DD/MM/YYYY):", {
      reply_markup: dateChoiceKeyboard(),
    });
    return true;
  }

  if (data.startsWith("etype:")) {
    const type = data.slice("etype:".length) as EventType;
    const session = getSession(ownerId);
    if (session.kind !== "attendance_pick_type") {
      await ctx.answerCallbackQuery({ text: "Phiên đã hết hạn" });
      return true;
    }
    if (!["leave", "overtime", "early_leave", "late"].includes(type)) {
      await ctx.answerCallbackQuery({ text: "Loại không hợp lệ" });
      return true;
    }

    await ctx.answerCallbackQuery();

    if (type === "leave") {
      setSession(ownerId, {
        kind: "attendance_note",
        workerId: session.workerId,
        workerName: session.workerName,
        date: session.date,
        type,
        minutes: 0,
      });
      await ctx.editMessageText(`Loại: ${eventTypeLabel(type)}`);
      await ctx.reply("Nhập ghi chú (hoặc «Bỏ qua ghi chú»):", {
        reply_markup: noteKeyboard(),
      });
      return true;
    }

    setSession(ownerId, {
      kind: "attendance_minutes",
      workerId: session.workerId,
      workerName: session.workerName,
      date: session.date,
      type,
    });
    await ctx.editMessageText(`Loại: ${eventTypeLabel(type)}`);
    await ctx.reply(
      "Nhập số phút (ví dụ 15, 30, 120). Có thể nhập dạng 1.5h hoặc 2h:",
      { reply_markup: cancelKeyboard() },
    );
    return true;
  }

  return false;
}

function parseMinutes(text: string): number | null {
  const raw = text.trim().toLowerCase().replace(",", ".");
  const hourMatch = /^(\d+(?:\.\d+)?)\s*h$/.exec(raw);
  if (hourMatch) {
    return Math.round(Number(hourMatch[1]) * 60);
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

async function finishEvent(
  ctx: Context,
  payload: {
    workerId: string;
    workerName: string;
    date: string;
    type: EventType;
    minutes: number;
    note?: string;
  },
): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const event = await upsertEvent({
    ownerKey: ownerId,
    workerId: payload.workerId,
    date: payload.date,
    type: payload.type,
    minutes: payload.minutes,
    note: payload.note,
  });
  clearSession(ownerId);
  await ctx.reply(
    [
      "Đã lưu phát sinh",
      `• ${payload.workerName}`,
      `• Ngày ${formatDateVn(payload.date)}`,
      `• ${formatEventLine(event)}`,
    ].join("\n"),
    { reply_markup: mainKeyboard() },
  );
}

export async function handleAttendanceText(
  ctx: Context,
  text: string,
): Promise<boolean> {
  const ownerId = getOwnerId(ctx);
  const session = getSession(ownerId);

  if (session.kind === "attendance_pick_date") {
    let date: string | null = null;
    if (text === BTN.today) date = todayKey();
    else date = parseDateKey(text);

    if (!date) {
      await ctx.reply("Ngày không hợp lệ. Nhập lại DD/MM/YYYY hoặc «Hôm nay»:");
      return true;
    }

    setSession(ownerId, {
      kind: "attendance_pick_type",
      workerId: session.workerId,
      workerName: session.workerName,
      date,
    });
    await ctx.reply(
      `${session.workerName} — ${formatDateVn(date)}\nChọn loại phát sinh:`,
      { reply_markup: eventTypeInlineKeyboard() },
    );
    return true;
  }

  if (session.kind === "attendance_minutes") {
    const minutes = parseMinutes(text);
    if (minutes === null) {
      await ctx.reply("Số phút không hợp lệ. Ví dụ: 15 hoặc 1.5h");
      return true;
    }
    setSession(ownerId, {
      kind: "attendance_note",
      workerId: session.workerId,
      workerName: session.workerName,
      date: session.date,
      type: session.type,
      minutes,
    });
    await ctx.reply("Nhập ghi chú (hoặc «Bỏ qua ghi chú»):", {
      reply_markup: noteKeyboard(),
    });
    return true;
  }

  if (session.kind === "attendance_note") {
    const note = text === BTN.skipNote ? "" : text.trim();
    await finishEvent(ctx, {
      workerId: session.workerId,
      workerName: session.workerName,
      date: session.date,
      type: session.type,
      minutes: session.minutes,
      note,
    });
    return true;
  }

  if (session.kind === "delete_pick_date") {
    let date: string | null = null;
    if (text === BTN.today) date = todayKey();
    else date = parseDateKey(text);

    if (!date) {
      await ctx.reply("Ngày không hợp lệ. Nhập lại DD/MM/YYYY hoặc «Hôm nay»:");
      return true;
    }

    const existing = await listEventsForWorkerOnDate(
      ownerId,
      session.workerId,
      date,
    );
    if (existing.length === 0) {
      clearSession(ownerId);
      await ctx.reply(
        `Không có phát sinh nào của ${session.workerName} ngày ${formatDateVn(date)}.`,
        { reply_markup: mainKeyboard() },
      );
      return true;
    }

    const deleted = await deleteEventsForWorkerOnDate(
      ownerId,
      session.workerId,
      date,
    );
    clearSession(ownerId);
    const detail = existing.map((e) => `• ${formatEventLine(e)}`).join("\n");
    await ctx.reply(
      `Đã xóa ${deleted} phát sinh của ${session.workerName} ngày ${formatDateVn(date)}:\n${detail}`,
      { reply_markup: mainKeyboard() },
    );
    return true;
  }

  return false;
}
