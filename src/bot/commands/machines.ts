import type { Context } from "grammy";
import {
  createMachine,
  deactivateMachine,
  formatMachineLine,
  getMachineById,
  listActiveMachines,
  renameMachine,
} from "../../services/machineService.js";
import { getOwnerId } from "../owner.js";
import {
  BTN,
  cancelKeyboard,
  itemsInlineKeyboard,
  mainKeyboard,
} from "../menus.js";
import { clearSession, getSession, setSession } from "../session.js";

export async function startAddMachine(ctx: Context): Promise<void> {
  setSession(getOwnerId(ctx), { kind: "add_machine_name" });
  await ctx.reply("Nhập tên máy (ví dụ: Máy 1, CNC-02):", {
    reply_markup: cancelKeyboard(),
  });
}

export async function handleListMachines(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const machines = await listActiveMachines(ownerId);
  if (machines.length === 0) {
    await ctx.reply(
      `Chưa có máy nào. Dùng nút «${BTN.addMachine}» để thêm máy trước khi thêm người.`,
      { reply_markup: mainKeyboard() },
    );
    return;
  }

  const lines = [
    `Danh sách máy (${machines.length}):`,
    ...machines.map((m, i) => formatMachineLine(m, i + 1)),
  ];
  await ctx.reply(lines.join("\n"), { reply_markup: mainKeyboard() });
}

export async function startEditMachine(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const machines = await listActiveMachines(ownerId);
  if (machines.length === 0) {
    await ctx.reply("Chưa có máy nào.", { reply_markup: mainKeyboard() });
    return;
  }
  setSession(ownerId, { kind: "edit_machine_pick" });
  await ctx.reply("Chọn máy cần đổi tên:", {
    reply_markup: itemsInlineKeyboard(
      machines.map((m) => ({ id: String(m._id), label: m.name })),
      "medit",
    ),
  });
  await ctx.reply("Hoặc bấm Hủy để thoát.", { reply_markup: cancelKeyboard() });
}

export async function startDeleteMachine(ctx: Context): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const machines = await listActiveMachines(ownerId);
  if (machines.length === 0) {
    await ctx.reply("Chưa có máy nào.", { reply_markup: mainKeyboard() });
    return;
  }
  setSession(ownerId, { kind: "delete_machine_pick" });
  await ctx.reply("Chọn máy cần xóa:", {
    reply_markup: itemsInlineKeyboard(
      machines.map((m) => ({ id: String(m._id), label: m.name })),
      "mdel",
    ),
  });
  await ctx.reply("Hoặc bấm Hủy để thoát.", { reply_markup: cancelKeyboard() });
}

export async function handleMachineText(
  ctx: Context,
  text: string,
): Promise<boolean> {
  const ownerId = getOwnerId(ctx);
  const session = getSession(ownerId);

  if (session.kind === "add_machine_name") {
    try {
      const machine = await createMachine(ownerId, text);
      clearSession(ownerId);
      await ctx.reply(`Đã thêm máy: ${machine.name}`, {
        reply_markup: mainKeyboard(),
      });
    } catch (err) {
      await ctx.reply(
        err instanceof Error ? err.message : "Không thêm được máy. Nhập lại:",
      );
    }
    return true;
  }

  if (session.kind === "edit_machine_name") {
    try {
      const machine = await renameMachine(ownerId, session.machineId, text);
      clearSession(ownerId);
      if (!machine) {
        await ctx.reply("Không tìm thấy máy.", { reply_markup: mainKeyboard() });
      } else {
        await ctx.reply(
          `Đã đổi tên: ${session.machineName} → ${machine.name}`,
          { reply_markup: mainKeyboard() },
        );
      }
    } catch (err) {
      await ctx.reply(
        err instanceof Error ? err.message : "Không đổi tên được. Nhập lại:",
      );
    }
    return true;
  }

  return false;
}

export async function handleMachineCallback(ctx: Context): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data) return false;
  const ownerId = getOwnerId(ctx);

  if (data.startsWith("medit:")) {
    const machineId = data.slice("medit:".length);
    const machine = await getMachineById(ownerId, machineId);
    if (!machine) {
      await ctx.answerCallbackQuery({ text: "Không tìm thấy" });
      return true;
    }
    setSession(ownerId, {
      kind: "edit_machine_name",
      machineId,
      machineName: machine.name,
    });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(`Đổi tên máy «${machine.name}»`);
    await ctx.reply("Nhập tên máy mới:", { reply_markup: cancelKeyboard() });
    return true;
  }

  if (data.startsWith("mdel:")) {
    const machineId = data.slice("mdel:".length);
    const machine = await getMachineById(ownerId, machineId);
    if (!machine) {
      await ctx.answerCallbackQuery({ text: "Không tìm thấy" });
      return true;
    }
    const result = await deactivateMachine(ownerId, machineId);
    clearSession(ownerId);
    if (result.blockedByWorkers > 0) {
      await ctx.answerCallbackQuery({ text: "Còn người đang gán máy này" });
      await ctx.editMessageText(
        `Không xóa được «${machine.name}»: còn ${result.blockedByWorkers} công nhân đang gán máy này. Hãy chuyển họ sang máy khác trước.`,
      );
      return true;
    }
    await ctx.answerCallbackQuery({ text: "Đã xóa" });
    await ctx.editMessageText(`Đã xóa máy: ${machine.name}`);
    return true;
  }

  return false;
}

export function isMachineMenuButton(text: string): boolean {
  return (
    text === BTN.addMachine ||
    text === BTN.listMachines ||
    text === BTN.editMachine ||
    text === BTN.deleteMachine
  );
}
