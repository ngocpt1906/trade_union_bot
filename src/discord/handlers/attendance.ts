import type { Message, MessageComponentInteraction } from "discord.js";
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
import { clearSession, getSession, setSession } from "../../shared/session.js";
import {
  BTN,
  cancelRow,
  eventTypeRows,
  itemSelectRows,
  mainMenuRows,
  noteCancelRows,
  todayCancelRows,
} from "../menus.js";
import {
  ackComponent,
  replyFollowUp,
  type DiscordTarget,
} from "../reply.js";

function selectValue(
  interaction: MessageComponentInteraction,
  prefix: string,
  data: string,
): string | null {
  if (interaction.isStringSelectMenu() && data === prefix) {
    return interaction.values[0] ?? null;
  }
  if (data.startsWith(`${prefix}:`)) return data.slice(prefix.length + 1);
  return null;
}

export async function startAddEvent(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const workers = await listActiveWorkers(ownerKey);
  if (workers.length === 0) {
    await replyFollowUp(
      target,
      `Chưa có công nhân. Hãy thêm bằng nút «${BTN.addWorker}» trước.`,
      mainMenuRows(),
    );
    return;
  }
  setSession(ownerKey, { kind: "attendance_pick_worker" });
  await replyFollowUp(
    target,
    "Chọn công nhân để ghi phát sinh:",
    itemSelectRows(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift})`,
      })),
      "attw",
      "Chọn công nhân",
    ),
  );
}

export async function startDeleteEvent(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const workers = await listActiveWorkers(ownerKey);
  if (workers.length === 0) {
    await replyFollowUp(target, "Chưa có công nhân.", mainMenuRows());
    return;
  }
  setSession(ownerKey, { kind: "delete_pick_worker" });
  await replyFollowUp(
    target,
    "Chọn công nhân để xóa phát sinh:",
    itemSelectRows(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift})`,
      })),
      "delw",
      "Chọn công nhân",
    ),
  );
}

async function finishEvent(
  target: DiscordTarget,
  ownerKey: string,
  payload: {
    workerId: string;
    workerName: string;
    date: string;
    type: EventType;
    minutes: number;
    note?: string;
  },
): Promise<void> {
  const event = await upsertEvent({
    ownerKey,
    workerId: payload.workerId,
    date: payload.date,
    type: payload.type,
    minutes: payload.minutes,
    note: payload.note,
  });
  clearSession(ownerKey);
  await replyFollowUp(
    target,
    [
      "Đã lưu phát sinh",
      `• ${payload.workerName}`,
      `• Ngày ${formatDateVn(payload.date)}`,
      `• ${formatEventLine(event)}`,
    ].join("\n"),
    mainMenuRows(),
  );
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

export async function handleAttendanceText(
  message: Message,
  ownerKey: string,
  text: string,
): Promise<boolean> {
  const session = getSession(ownerKey);

  if (session.kind === "attendance_pick_date") {
    let date: string | null = null;
    if (text === BTN.today) date = todayKey();
    else date = parseDateKey(text);

    if (!date) {
      await replyFollowUp(
        message,
        "Ngày không hợp lệ. Nhập lại DD/MM/YYYY hoặc bấm «Hôm nay»:",
        todayCancelRows(),
      );
      return true;
    }

    setSession(ownerKey, {
      kind: "attendance_pick_type",
      workerId: session.workerId,
      workerName: session.workerName,
      date,
    });
    await replyFollowUp(
      message,
      `${session.workerName} — ${formatDateVn(date)}\nChọn loại phát sinh:`,
      eventTypeRows(),
    );
    return true;
  }

  if (session.kind === "attendance_minutes") {
    const minutes = parseMinutes(text);
    if (minutes === null) {
      await replyFollowUp(
        message,
        "Số phút không hợp lệ. Ví dụ: 15 hoặc 1.5h",
        cancelRow(),
      );
      return true;
    }
    setSession(ownerKey, {
      kind: "attendance_note",
      workerId: session.workerId,
      workerName: session.workerName,
      date: session.date,
      type: session.type,
      minutes,
    });
    await replyFollowUp(
      message,
      "Nhập ghi chú (hoặc bấm «Bỏ qua ghi chú»):",
      noteCancelRows(),
    );
    return true;
  }

  if (session.kind === "attendance_note") {
    const note = text === BTN.skipNote ? "" : text.trim();
    await finishEvent(message, ownerKey, {
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
      await replyFollowUp(
        message,
        "Ngày không hợp lệ. Nhập lại DD/MM/YYYY hoặc bấm «Hôm nay»:",
        todayCancelRows(),
      );
      return true;
    }

    const existing = await listEventsForWorkerOnDate(
      ownerKey,
      session.workerId,
      date,
    );
    if (existing.length === 0) {
      clearSession(ownerKey);
      await replyFollowUp(
        message,
        `Không có phát sinh nào của ${session.workerName} ngày ${formatDateVn(date)}.`,
        mainMenuRows(),
      );
      return true;
    }

    const deleted = await deleteEventsForWorkerOnDate(
      ownerKey,
      session.workerId,
      date,
    );
    clearSession(ownerKey);
    const detail = existing.map((e) => `• ${formatEventLine(e)}`).join("\n");
    await replyFollowUp(
      message,
      `Đã xóa ${deleted} phát sinh của ${session.workerName} ngày ${formatDateVn(date)}:\n${detail}`,
      mainMenuRows(),
    );
    return true;
  }

  return false;
}

export async function handleAttendanceComponent(
  interaction: MessageComponentInteraction,
  ownerKey: string,
  data: string,
): Promise<boolean> {
  const session = getSession(ownerKey);

  {
    const workerId = selectValue(interaction, "attw", data);
    if (workerId) {
      const worker = await getWorkerById(ownerKey, workerId);
      if (!worker) {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Không tìm thấy.", mainMenuRows());
        return true;
      }
      setSession(ownerKey, {
        kind: "attendance_pick_date",
        workerId,
        workerName: worker.name,
      });
      await ackComponent(interaction);
      await replyFollowUp(
        interaction,
        `Công nhân: ${worker.name}\nChọn «Hôm nay» hoặc nhập ngày (DD/MM/YYYY):`,
        todayCancelRows(),
      );
      return true;
    }
  }

  {
    const workerId = selectValue(interaction, "delw", data);
    if (workerId) {
      const worker = await getWorkerById(ownerKey, workerId);
      if (!worker) {
        await ackComponent(interaction);
        await replyFollowUp(interaction, "Không tìm thấy.", mainMenuRows());
        return true;
      }
      setSession(ownerKey, {
        kind: "delete_pick_date",
        workerId,
        workerName: worker.name,
      });
      await ackComponent(interaction);
      await replyFollowUp(
        interaction,
        `Xóa phát sinh — ${worker.name}\nChọn «Hôm nay» hoặc nhập ngày cần xóa (DD/MM/YYYY):`,
        todayCancelRows(),
      );
      return true;
    }
  }

  if (data === "date:today") {
    if (session.kind === "attendance_pick_date") {
      const date = todayKey();
      setSession(ownerKey, {
        kind: "attendance_pick_type",
        workerId: session.workerId,
        workerName: session.workerName,
        date,
      });
      await ackComponent(interaction);
      await replyFollowUp(
        interaction,
        `${session.workerName} — ${formatDateVn(date)}\nChọn loại phát sinh:`,
        eventTypeRows(),
      );
      return true;
    }
    if (session.kind === "delete_pick_date") {
      const date = todayKey();
      const existing = await listEventsForWorkerOnDate(
        ownerKey,
        session.workerId,
        date,
      );
      await ackComponent(interaction);
      if (existing.length === 0) {
        clearSession(ownerKey);
        await replyFollowUp(
          interaction,
          `Không có phát sinh nào của ${session.workerName} ngày ${formatDateVn(date)}.`,
          mainMenuRows(),
        );
        return true;
      }
      const deleted = await deleteEventsForWorkerOnDate(
        ownerKey,
        session.workerId,
        date,
      );
      clearSession(ownerKey);
      const detail = existing.map((e) => `• ${formatEventLine(e)}`).join("\n");
      await replyFollowUp(
        interaction,
        `Đã xóa ${deleted} phát sinh của ${session.workerName} ngày ${formatDateVn(date)}:\n${detail}`,
        mainMenuRows(),
      );
      return true;
    }
  }

  if (data.startsWith("etype:")) {
    const type = data.slice("etype:".length) as EventType;
    if (session.kind !== "attendance_pick_type") {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
      return true;
    }
    if (!["leave", "overtime", "early_leave", "late"].includes(type)) {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Loại không hợp lệ.", cancelRow());
      return true;
    }

    await ackComponent(interaction);

    if (type === "leave") {
      setSession(ownerKey, {
        kind: "attendance_note",
        workerId: session.workerId,
        workerName: session.workerName,
        date: session.date,
        type,
        minutes: 0,
      });
      await replyFollowUp(
        interaction,
        `Loại: ${eventTypeLabel(type)}\nNhập ghi chú (hoặc bấm «Bỏ qua ghi chú»):`,
        noteCancelRows(),
      );
      return true;
    }

    setSession(ownerKey, {
      kind: "attendance_minutes",
      workerId: session.workerId,
      workerName: session.workerName,
      date: session.date,
      type,
    });
    await replyFollowUp(
      interaction,
      `Loại: ${eventTypeLabel(type)}\nNhập số phút (ví dụ 15, 30, 120). Có thể nhập dạng 1.5h hoặc 2h:`,
      cancelRow(),
    );
    return true;
  }

  if (data === "note:skip") {
    if (session.kind !== "attendance_note") {
      await ackComponent(interaction);
      await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
      return true;
    }
    await ackComponent(interaction);
    await finishEvent(interaction, ownerKey, {
      workerId: session.workerId,
      workerName: session.workerName,
      date: session.date,
      type: session.type,
      minutes: session.minutes,
      note: "",
    });
    return true;
  }

  return false;
}
