import { Bot } from "grammy";
import { config } from "../config.js";
import {
  handleAttendanceCallback,
  handleAttendanceText,
  startAddEvent,
  startDeleteEvent,
} from "./commands/attendance.js";
import {
  handleMachineCallback,
  handleMachineText,
  handleListMachines,
  startAddMachine,
  startDeleteMachine,
  startEditMachine,
} from "./commands/machines.js";
import {
  handleStatsText,
  startStatsMonth,
} from "./commands/stats.js";
import {
  handleListWorkers,
  handleWorkerCallback,
  handleWorkerText,
  startAddWorker,
  startDeactivateWorker,
  startEditWorker,
} from "./commands/workers.js";
import { BTN, mainKeyboard } from "./menus.js";
import { clearSession } from "./session.js";

export function createBot(): Bot {
  const bot = new Bot(config.telegramBotToken);

  bot.use(async (ctx, next) => {
    if (!ctx.from) {
      return;
    }
    await next();
  });

  // /start keeps the Telegram "Start" entry point so users can open the reply keyboard.
  bot.command("start", async (ctx) => {
    const userId = ctx.from!.id;
    clearSession(userId);
    await ctx.reply(
      [
        "Chào bạn.",
        "Mỗi tài khoản Telegram quản lý tổ riêng (dữ liệu không dùng chung).",
        "",
        "Gợi ý bắt đầu (dùng nút menu bên dưới):",
        `1. ${BTN.addMachine}`,
        `2. ${BTN.addWorker} (chọn ca + máy)`,
        `3. ${BTN.addEvent} khi có phát sinh`,
        `4. ${BTN.statsMonth} để xem bảng công`,
      ].join("\n"),
      { reply_markup: mainKeyboard() },
    );
  });

  bot.on("callback_query:data", async (ctx) => {
    if (await handleMachineCallback(ctx)) return;
    if (await handleWorkerCallback(ctx)) return;
    if (await handleAttendanceCallback(ctx)) return;
    await ctx.answerCallbackQuery();
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();

    if (text === BTN.cancel) {
      clearSession(ctx.from!.id);
      await ctx.reply("Đã hủy thao tác.", { reply_markup: mainKeyboard() });
      return;
    }

    if (await handleMachineText(ctx, text)) return;
    if (await handleWorkerText(ctx, text)) return;
    if (await handleAttendanceText(ctx, text)) return;
    if (await handleStatsText(ctx, text)) return;

    switch (text) {
      case BTN.addWorker:
        await startAddWorker(ctx);
        return;
      case BTN.listWorkers:
        await handleListWorkers(ctx);
        return;
      case BTN.editWorker:
        await startEditWorker(ctx);
        return;
      case BTN.addEvent:
        await startAddEvent(ctx);
        return;
      case BTN.deleteEvent:
        await startDeleteEvent(ctx);
        return;
      case BTN.statsMonth:
        await startStatsMonth(ctx);
        return;
      case BTN.addMachine:
        await startAddMachine(ctx);
        return;
      case BTN.listMachines:
        await handleListMachines(ctx);
        return;
      case BTN.editMachine:
        await startEditMachine(ctx);
        return;
      case BTN.deleteMachine:
        await startDeleteMachine(ctx);
        return;
      case BTN.deactivate:
        await startDeactivateWorker(ctx);
        return;
      default:
        await ctx.reply(
          "Chọn nút menu bên dưới. Gõ /start để xem hướng dẫn.",
          { reply_markup: mainKeyboard() },
        );
    }
  });

  bot.catch((err) => {
    console.error("Bot error:", err.error);
  });

  return bot;
}
