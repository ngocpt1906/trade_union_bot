import type { Context } from "grammy";
import { telegramOwnerKey } from "../shared/ownerKey.js";

/** Owner key of the current Telegram operator (each user owns an isolated team). */
export function getOwnerId(ctx: Context): string {
  const id = ctx.from?.id;
  if (id === undefined) {
    throw new Error("Không xác định được Telegram user");
  }
  return telegramOwnerKey(id);
}
