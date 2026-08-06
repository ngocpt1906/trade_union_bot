import type { Context } from "grammy";
import { listActiveMachines, getMachineById } from "../../services/machineService.js";
import type { ShiftCode } from "../../services/shiftCalendar.js";
import {
  createWorker,
  deactivateWorker,
  formatWorkerLine,
  getWorkerById,
  listActiveWorkers,
  updateWorker,
} from "../../services/workerService.js";
import { getOwnerId } from "../owner.js";
import {
  BTN,
  cancelKeyboard,
  editWorkerFieldKeyboard,
  itemsInlineKeyboard,
  mainKeyboard,
  shiftInlineKeyboard,
} from "../menus.js";
import { clearSession, getSession, setSession } from "../session.js";

async function machineNameMap(
  ownerId: number,
): Promise<Map<string, string>> {
  const machines = await listActiveMachines(ownerId);
  return new Map(machines.map((m) => [String(m._id), m.name]));
}

export async function handleListWorkers(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const workers = await listActiveWorkers(ownerId);
  if (workers.length === 0) {
    await ctx.reply(
      `Chưa có công nhân nào. Dùng nút «${BTN.addWorker}» để thêm (cần có máy trước).`,
      { reply_markup: mainKeyboard() },
    );
    return;
  }

  const names = await machineNameMap(ownerId);
  const byShift: Record<string, string[]> = { A: [], B: [], C: [] };
  for (const w of workers) {
    const mName = names.get(String(w.machineId)) ?? "?";
    byShift[w.shift]?.push(`• ${w.name} (${w.birthYear}) — Máy ${mName}`);
  }

  const lines = [
    `Danh sách tổ (${workers.length} người)`,
    "",
    "Ca A:",
    ...(byShift.A.length ? byShift.A : ["• (trống)"]),
    "",
    "Ca B:",
    ...(byShift.B.length ? byShift.B : ["• (trống)"]),
    "",
    "Ca C:",
    ...(byShift.C.length ? byShift.C : ["• (trống)"]),
  ];

  await ctx.reply(lines.join("\n"), { reply_markup: mainKeyboard() });
}

export async function startAddWorker(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const machines = await listActiveMachines(ownerId);
  if (machines.length === 0) {
    await ctx.reply(
      `Chưa có máy nào. Hãy thêm máy trước bằng nút «${BTN.addMachine}».`,
      { reply_markup: mainKeyboard() },
    );
    return;
  }
  setSession(ownerId, { kind: "add_worker_name" });
  await ctx.reply("Nhập tên công nhân:", { reply_markup: cancelKeyboard() });
}

export async function startEditWorker(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const workers = await listActiveWorkers(ownerId);
  if (workers.length === 0) {
    await ctx.reply("Chưa có công nhân nào.", { reply_markup: mainKeyboard() });
    return;
  }
  const names = await machineNameMap(ownerId);
  setSession(ownerId, { kind: "edit_worker_pick" });
  await ctx.reply("Chọn công nhân cần sửa:", {
    reply_markup: itemsInlineKeyboard(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift}/${names.get(String(w.machineId)) ?? "?"})`,
      })),
      "ewpick",
    ),
  });
  await ctx.reply("Hoặc bấm Hủy để thoát.", { reply_markup: cancelKeyboard() });
}

export async function startDeactivateWorker(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const workers = await listActiveWorkers(ownerId);
  if (workers.length === 0) {
    await ctx.reply("Chưa có công nhân nào.", { reply_markup: mainKeyboard() });
    return;
  }
  setSession(ownerId, { kind: "deactivate_pick_worker" });
  await ctx.reply("Chọn công nhân cần ngưng:", {
    reply_markup: itemsInlineKeyboard(
      workers.map((w) => ({
        id: String(w._id),
        label: `${w.name} (${w.shift})`,
      })),
      "deact",
    ),
  });
  await ctx.reply("Hoặc bấm Hủy để thoát.", { reply_markup: cancelKeyboard() });
}

export async function handleWorkerText(
  ctx: Context,
  text: string,
): Promise<boolean> {
  const ownerId = getOwnerId(ctx);
  const session = getSession(ownerId);

  if (session.kind === "add_worker_name") {
    const name = text.trim();
    if (name.length < 2) {
      await ctx.reply("Tên quá ngắn. Nhập lại tên:");
      return true;
    }
    setSession(ownerId, { kind: "add_worker_birth", name });
    await ctx.reply(`Tên: ${name}\nNhập năm sinh (ví dụ 1995):`, {
      reply_markup: cancelKeyboard(),
    });
    return true;
  }

  if (session.kind === "add_worker_birth") {
    const year = Number(text.trim());
    if (!Number.isInteger(year) || year < 1950 || year > 2015) {
      await ctx.reply("Năm sinh không hợp lệ (1950–2015). Nhập lại:");
      return true;
    }
    setSession(ownerId, {
      kind: "add_worker_shift",
      name: session.name,
      birthYear: year,
    });
    await ctx.reply(`Chọn ca cho ${session.name}:`, {
      reply_markup: shiftInlineKeyboard("shift"),
    });
    return true;
  }

  if (session.kind === "edit_worker_name") {
    const name = text.trim();
    if (name.length < 2) {
      await ctx.reply("Tên quá ngắn. Nhập lại:");
      return true;
    }
    const worker = await updateWorker(ownerId, session.workerId, { name });
    clearSession(ownerId);
    await ctx.reply(
      worker ? `Đã cập nhật tên: ${worker.name}` : "Không tìm thấy công nhân.",
      { reply_markup: mainKeyboard() },
    );
    return true;
  }

  if (session.kind === "edit_worker_birth") {
    const year = Number(text.trim());
    if (!Number.isInteger(year) || year < 1950 || year > 2015) {
      await ctx.reply("Năm sinh không hợp lệ (1950–2015). Nhập lại:");
      return true;
    }
    const worker = await updateWorker(ownerId, session.workerId, {
      birthYear: year,
    });
    clearSession(ownerId);
    await ctx.reply(
      worker
        ? `Đã cập nhật năm sinh: ${worker.name} (${worker.birthYear})`
        : "Không tìm thấy công nhân.",
      { reply_markup: mainKeyboard() },
    );
    return true;
  }

  return false;
}

export async function handleWorkerCallback(ctx: Context): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data) return false;
  const ownerId = getOwnerId(ctx);
  const session = getSession(ownerId);

  // Add worker: choose shift then machine
  if (data.startsWith("shift:")) {
    if (session.kind !== "add_worker_shift") {
      await ctx.answerCallbackQuery({ text: "Phiên đã hết hạn" });
      return true;
    }
    const shift = data.slice("shift:".length) as ShiftCode;
    if (!["A", "B", "C"].includes(shift)) {
      await ctx.answerCallbackQuery({ text: "Ca không hợp lệ" });
      return true;
    }
    const machines = await listActiveMachines(ownerId);
    if (machines.length === 0) {
      await ctx.answerCallbackQuery({ text: "Chưa có máy" });
      clearSession(ownerId);
      await ctx.reply(
        `Chưa có máy. Thêm máy bằng nút «${BTN.addMachine}» trước.`,
        { reply_markup: mainKeyboard() },
      );
      return true;
    }
    setSession(ownerId, {
      kind: "add_worker_machine",
      name: session.name,
      birthYear: session.birthYear,
      shift,
    });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Ca ${shift} — chọn máy:`);
    await ctx.reply("Chọn máy phân công:", {
      reply_markup: itemsInlineKeyboard(
        machines.map((m) => ({ id: String(m._id), label: m.name })),
        "wmach",
      ),
    });
    return true;
  }

  if (data.startsWith("wmach:")) {
    if (session.kind !== "add_worker_machine") {
      await ctx.answerCallbackQuery({ text: "Phiên đã hết hạn" });
      return true;
    }
    const machineId = data.slice("wmach:".length);
    const machine = await getMachineById(ownerId, machineId);
    if (!machine) {
      await ctx.answerCallbackQuery({ text: "Máy không hợp lệ" });
      return true;
    }
    try {
      const worker = await createWorker({
        ownerTelegramId: ownerId,
        name: session.name,
        birthYear: session.birthYear,
        shift: session.shift,
        machineId,
      });
      clearSession(ownerId);
      await ctx.answerCallbackQuery({ text: "Đã thêm" });
      await ctx.editMessageText(
        `Đã thêm: ${formatWorkerLine(worker, machine.name)}`,
      );
    } catch (err) {
      await ctx.answerCallbackQuery({ text: "Lỗi" });
      await ctx.reply(err instanceof Error ? err.message : "Không thêm được.");
    }
    return true;
  }

  // Edit worker pick
  if (data.startsWith("ewpick:")) {
    const workerId = data.slice("ewpick:".length);
    const worker = await getWorkerById(ownerId, workerId);
    if (!worker) {
      await ctx.answerCallbackQuery({ text: "Không tìm thấy" });
      return true;
    }
    const machine = await getMachineById(ownerId, String(worker.machineId));
    setSession(ownerId, {
      kind: "edit_worker_field",
      workerId,
      workerName: worker.name,
    });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      [
        `Sửa: ${worker.name}`,
        `• Năm sinh: ${worker.birthYear}`,
        `• Ca: ${worker.shift}`,
        `• Máy: ${machine?.name ?? "?"}`,
        "",
        "Chọn thông tin cần sửa:",
      ].join("\n"),
      { reply_markup: editWorkerFieldKeyboard() },
    );
    return true;
  }

  if (data.startsWith("efield:")) {
    if (session.kind !== "edit_worker_field") {
      await ctx.answerCallbackQuery({ text: "Phiên đã hết hạn" });
      return true;
    }
    const field = data.slice("efield:".length);
    await ctx.answerCallbackQuery();

    if (field === "name") {
      setSession(ownerId, {
        kind: "edit_worker_name",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await ctx.reply(`Nhập tên mới cho ${session.workerName}:`, {
        reply_markup: cancelKeyboard(),
      });
      return true;
    }
    if (field === "birth") {
      setSession(ownerId, {
        kind: "edit_worker_birth",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await ctx.reply(`Nhập năm sinh mới cho ${session.workerName}:`, {
        reply_markup: cancelKeyboard(),
      });
      return true;
    }
    if (field === "shift") {
      setSession(ownerId, {
        kind: "edit_worker_shift",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await ctx.reply(`Chọn ca mới cho ${session.workerName}:`, {
        reply_markup: shiftInlineKeyboard("eshift"),
      });
      return true;
    }
    if (field === "machine") {
      const machines = await listActiveMachines(ownerId);
      if (machines.length === 0) {
        await ctx.reply("Chưa có máy nào.", { reply_markup: mainKeyboard() });
        return true;
      }
      setSession(ownerId, {
        kind: "edit_worker_machine",
        workerId: session.workerId,
        workerName: session.workerName,
      });
      await ctx.reply(`Chọn máy mới cho ${session.workerName}:`, {
        reply_markup: itemsInlineKeyboard(
          machines.map((m) => ({ id: String(m._id), label: m.name })),
          "emach",
        ),
      });
      return true;
    }
    return true;
  }

  if (data.startsWith("eshift:")) {
    if (session.kind !== "edit_worker_shift") {
      await ctx.answerCallbackQuery({ text: "Phiên đã hết hạn" });
      return true;
    }
    const shift = data.slice("eshift:".length) as ShiftCode;
    if (!["A", "B", "C"].includes(shift)) {
      await ctx.answerCallbackQuery({ text: "Ca không hợp lệ" });
      return true;
    }
    const worker = await updateWorker(ownerId, session.workerId, { shift });
    clearSession(ownerId);
    await ctx.answerCallbackQuery({ text: "Đã cập nhật" });
    await ctx.editMessageText(
      worker
        ? `Đã cập nhật ca: ${worker.name} → Ca ${worker.shift}`
        : "Không tìm thấy công nhân.",
    );
    return true;
  }

  if (data.startsWith("emach:")) {
    if (session.kind !== "edit_worker_machine") {
      await ctx.answerCallbackQuery({ text: "Phiên đã hết hạn" });
      return true;
    }
    const machineId = data.slice("emach:".length);
    const machine = await getMachineById(ownerId, machineId);
    if (!machine) {
      await ctx.answerCallbackQuery({ text: "Máy không hợp lệ" });
      return true;
    }
    try {
      const worker = await updateWorker(ownerId, session.workerId, {
        machineId,
      });
      clearSession(ownerId);
      await ctx.answerCallbackQuery({ text: "Đã cập nhật" });
      await ctx.editMessageText(
        worker
          ? `Đã cập nhật máy: ${worker.name} → ${machine.name}`
          : "Không tìm thấy công nhân.",
      );
    } catch (err) {
      await ctx.answerCallbackQuery({ text: "Lỗi" });
      await ctx.reply(err instanceof Error ? err.message : "Không cập nhật được.");
    }
    return true;
  }

  if (data.startsWith("deact:")) {
    const id = data.slice("deact:".length);
    const worker = await getWorkerById(ownerId, id);
    if (!worker) {
      await ctx.answerCallbackQuery({ text: "Không tìm thấy" });
      return true;
    }
    await deactivateWorker(ownerId, id);
    clearSession(ownerId);
    await ctx.answerCallbackQuery({ text: "Đã ngưng" });
    await ctx.editMessageText(`Đã ngưng: ${worker.name} (Ca ${worker.shift})`);
    return true;
  }

  return false;
}

export function isWorkerMenuButton(text: string): boolean {
  return (
    text === BTN.addWorker ||
    text === BTN.listWorkers ||
    text === BTN.editWorker ||
    text === BTN.deactivate
  );
}
