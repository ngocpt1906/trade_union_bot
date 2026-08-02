import type { Context } from "grammy";
import {
  buildStats,
  formatStatsMessage,
  monthTitle,
  rangeTitle,
} from "../../services/statsService.js";
import {
  currentMonthYear,
  monthRange,
  parseDateKey,
  parseMonthYear,
} from "../../utils/date.js";
import { getOwnerId } from "../owner.js";
import { BTN, cancelKeyboard, mainKeyboard, monthChoiceKeyboard } from "../menus.js";
import { clearSession, getSession, setSession } from "../session.js";

const TELEGRAM_MAX = 4000;

async function replyLong(ctx: Context, text: string): Promise<void> {
  if (text.length <= TELEGRAM_MAX) {
    await ctx.reply(text, { reply_markup: mainKeyboard() });
    return;
  }

  const chunks: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    if ((current + "\n" + line).length > TELEGRAM_MAX) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);

  for (let i = 0; i < chunks.length; i++) {
    const isLast = i === chunks.length - 1;
    await ctx.reply(chunks[i], {
      reply_markup: isLast ? mainKeyboard() : undefined,
    });
  }
}

export async function startStatsMonth(ctx: Context): Promise<void> {
  const { year, month } = currentMonthYear();
  setSession(getOwnerId(ctx), { kind: "stats_month" });
  await ctx.reply(
    `Chọn «Tháng này» hoặc nhập tháng (MM/YYYY), ví dụ ${String(month).padStart(2, "0")}/${year}:`,
    { reply_markup: monthChoiceKeyboard() },
  );
}

export async function startStatsRange(ctx: Context): Promise<void> {
  setSession(getOwnerId(ctx), { kind: "stats_range_start" });
  await ctx.reply("Nhập ngày bắt đầu (DD/MM/YYYY):", {
    reply_markup: cancelKeyboard(),
  });
}

async function showMonthStats(
  ctx: Context,
  year: number,
  month: number,
): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const { start, end } = monthRange(year, month);
  const stats = await buildStats(ownerId, start, end);
  clearSession(ownerId);
  await replyLong(ctx, formatStatsMessage(monthTitle(year, month), stats));
}

export async function handleStatsText(
  ctx: Context,
  text: string,
): Promise<boolean> {
  const ownerId = getOwnerId(ctx);
  const session = getSession(ownerId);

  if (session.kind === "stats_month") {
    if (text === BTN.thisMonth) {
      const current = currentMonthYear();
      await showMonthStats(ctx, current.year, current.month);
      return true;
    }
    const parsed = parseMonthYear(text);
    if (!parsed) {
      await ctx.reply("Định dạng không đúng. Ví dụ: 08/2026");
      return true;
    }
    await showMonthStats(ctx, parsed.year, parsed.month);
    return true;
  }

  if (session.kind === "stats_range_start") {
    const start = parseDateKey(text);
    if (!start) {
      await ctx.reply("Ngày không hợp lệ. Nhập DD/MM/YYYY:");
      return true;
    }
    setSession(ownerId, { kind: "stats_range_end", start });
    await ctx.reply("Nhập ngày kết thúc (DD/MM/YYYY):", {
      reply_markup: cancelKeyboard(),
    });
    return true;
  }

  if (session.kind === "stats_range_end") {
    const end = parseDateKey(text);
    if (!end) {
      await ctx.reply("Ngày không hợp lệ. Nhập DD/MM/YYYY:");
      return true;
    }
    if (end < session.start) {
      await ctx.reply("Ngày kết thúc phải ≥ ngày bắt đầu. Nhập lại:");
      return true;
    }
    const stats = await buildStats(ownerId, session.start, end);
    clearSession(ownerId);
    await replyLong(
      ctx,
      formatStatsMessage(rangeTitle(session.start, end), stats),
    );
    return true;
  }

  return false;
}
