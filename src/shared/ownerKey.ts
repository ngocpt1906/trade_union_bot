export type Platform = "telegram" | "discord";

export function telegramOwnerKey(telegramUserId: number | string): string {
  return `tg:${telegramUserId}`;
}

export function discordOwnerKey(discordUserId: string): string {
  return `dc:${discordUserId}`;
}
