import type { Context } from "grammy";
import {
  buildStats,
  formatStatsMessage,
  monthTitle,
} from "../../services/statsService.js";
import {
  currentMonthYear,
  monthRange,
  parseMonthYear,
  todayKey,
} from "../../utils/date.js";
import { getOwnerId } from "../owner.js";
import { BTN, mainKeyboard, monthChoiceKeyboard } from "../menus.js";
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

async function showMonthStats(
  ctx: Context,
  year: number,
  month: number,
): Promise<void> {
  const ownerId = getOwnerId(ctx);
  const range = monthRange(year, month);
  const current = currentMonthYear();
  const end =
    year === current.year && month === current.month ? todayKey() : range.end;
  const { start } = range;
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

  return false;
}
