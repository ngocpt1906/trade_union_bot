import type { Context } from "grammy";

/** Telegram user id of the current operator (each user owns an isolated team). */
export function getOwnerId(ctx: Context): number {
  const id = ctx.from?.id;
  if (id === undefined) {
    throw new Error("Không xác định được Telegram user");
  }
  return id;
}
