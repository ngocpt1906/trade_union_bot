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
  startStatsRange,
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

/** Commands synced to Telegram via setMyCommands. */
export const BOT_COMMANDS = [
  { command: "addmember", description: "Thêm người vào tổ" },
  { command: "listmember", description: "Hiện danh sách tổ" },
  { command: "editmember", description: "Sửa người trong tổ" },
  { command: "newcase", description: "Thêm phát sinh" },
  { command: "removecase", description: "Xóa phát sinh" },
  { command: "monthreport", description: "Thống kê tháng" },
  { command: "reportrange", description: "Thống kê khoảng" },
  { command: "addmachine", description: "Thêm máy" },
  { command: "listmachine", description: "Danh sách máy" },
  { command: "editmachine", description: "Sửa máy" },
  { command: "deletemachine", description: "Xóa máy" },
] as const;

export function createBot(): Bot {
  const bot = new Bot(config.telegramBotToken);

  bot.use(async (ctx, next) => {
    if (!ctx.from) {
      return;
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    const userId = ctx.from!.id;
    clearSession(userId);
    await ctx.reply(
      [
        "Chào bạn.",
        "Mỗi tài khoản Telegram quản lý tổ riêng (dữ liệu không dùng chung).",
        "",
        "Gợi ý bắt đầu:",
        "1. /addmachine — thêm máy",
        "2. /addmember — thêm người (chọn ca + máy)",
        "3. /newcase — ghi phát sinh khi có",
        "4. /monthreport — xem bảng công",
        "",
        "Dùng lệnh / hoặc nút menu bên dưới.",
      ].join("\n"),
      { reply_markup: mainKeyboard() },
    );
  });

  bot.command("addmember", (ctx) => startAddWorker(ctx));
  bot.command("listmember", (ctx) => handleListWorkers(ctx));
  bot.command("editmember", (ctx) => startEditWorker(ctx));
  bot.command("newcase", (ctx) => startAddEvent(ctx));
  bot.command("removecase", (ctx) => startDeleteEvent(ctx));
  bot.command("monthreport", (ctx) => startStatsMonth(ctx));
  bot.command("reportrange", (ctx) => startStatsRange(ctx));
  bot.command("addmachine", (ctx) => startAddMachine(ctx));
  bot.command("listmachine", (ctx) => handleListMachines(ctx));
  bot.command("editmachine", (ctx) => startEditMachine(ctx));
  bot.command("deletemachine", (ctx) => startDeleteMachine(ctx));

  bot.command("huy", async (ctx) => {
    clearSession(ctx.from!.id);
    await ctx.reply("Đã hủy thao tác.", { reply_markup: mainKeyboard() });
  });

  bot.on("callback_query:data", async (ctx) => {
    if (await handleMachineCallback(ctx)) return;
    if (await handleWorkerCallback(ctx)) return;
    if (await handleAttendanceCallback(ctx)) return;
    await ctx.answerCallbackQuery();
  });

  bot.on("message:text", async (ctx) => {
    const text = ctx.message.text.trim();

    if (text === BTN.cancel || text === "/cancel") {
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
      case BTN.statsRange:
        await startStatsRange(ctx);
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
          "Dùng lệnh / (ví dụ /addmember) hoặc chọn nút menu. Gõ /start để xem hướng dẫn.",
          { reply_markup: mainKeyboard() },
        );
    }
  });

  bot.catch((err) => {
    console.error("Bot error:", err.error);
  });

  return bot;
}
