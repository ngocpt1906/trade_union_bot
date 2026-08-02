import "dotenv/config";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

export const config = {
  telegramBotToken: required("TELEGRAM_BOT_TOKEN"),
  mongodbUri: required("MONGODB_URI"),
  shiftEpoch: process.env.SHIFT_EPOCH?.trim() || "2026-08-01",
  timezone: process.env.TZ?.trim() || "Asia/Ho_Chi_Minh",
};
