import type { Message, MessageComponentInteraction } from "discord.js";
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
import { clearSession, getSession, setSession } from "../../shared/session.js";
import { BTN, mainMenuRows, monthCancelRows } from "../menus.js";
import {
  ackComponent,
  replyFollowUp,
  type DiscordTarget,
} from "../reply.js";

export async function startStatsMonth(
  target: DiscordTarget,
  ownerKey: string,
): Promise<void> {
  const { year, month } = currentMonthYear();
  setSession(ownerKey, { kind: "stats_month" });
  await replyFollowUp(
    target,
    `Chọn «Tháng này» hoặc nhập tháng (MM/YYYY), ví dụ ${String(month).padStart(2, "0")}/${year}:`,
    monthCancelRows(),
  );
}

async function showMonthStats(
  target: DiscordTarget,
  ownerKey: string,
  year: number,
  month: number,
): Promise<void> {
  const range = monthRange(year, month);
  const current = currentMonthYear();
  const end =
    year === current.year && month === current.month ? todayKey() : range.end;
  const stats = await buildStats(ownerKey, range.start, end);
  clearSession(ownerKey);
  await replyFollowUp(
    target,
    formatStatsMessage(monthTitle(year, month), stats),
    mainMenuRows(),
  );
}

export async function handleStatsText(
  message: Message,
  ownerKey: string,
  text: string,
): Promise<boolean> {
  const session = getSession(ownerKey);
  if (session.kind !== "stats_month") return false;

  if (text === BTN.thisMonth) {
    const current = currentMonthYear();
    await showMonthStats(message, ownerKey, current.year, current.month);
    return true;
  }
  const parsed = parseMonthYear(text);
  if (!parsed) {
    await replyFollowUp(
      message,
      "Định dạng không đúng. Ví dụ: 08/2026",
      monthCancelRows(),
    );
    return true;
  }
  await showMonthStats(message, ownerKey, parsed.year, parsed.month);
  return true;
}

export async function handleStatsComponent(
  interaction: MessageComponentInteraction,
  ownerKey: string,
  data: string,
): Promise<boolean> {
  if (data !== "month:this") return false;
  const session = getSession(ownerKey);
  if (session.kind !== "stats_month") {
    await ackComponent(interaction);
    await replyFollowUp(interaction, "Phiên đã hết hạn.", mainMenuRows());
    return true;
  }
  const current = currentMonthYear();
  await ackComponent(interaction);
  await showMonthStats(interaction, ownerKey, current.year, current.month);
  return true;
}
