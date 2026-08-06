import { createBot } from "./bot/bot.js";
import { config } from "./config.js";
import { connectDb } from "./db/connection.js";
import { startDiscordBot } from "./discord/client.js";

async function main(): Promise<void> {
  console.log("Connecting to MongoDB...");
  await connectDb();
  console.log("MongoDB connected.");
  console.log(`Shift epoch: ${config.shiftEpoch}`);

  if (config.discordBotToken) {
    await startDiscordBot(config.discordBotToken);
  } else {
    console.log("DISCORD_BOT_TOKEN not set — Discord bot skipped.");
  }

  if (!config.telegramBotToken) {
    throw new Error("Missing required env: TELEGRAM_BOT_TOKEN");
  }

  const bot = createBot();
  await bot.api.deleteMyCommands();
  console.log("Telegram bot commands cleared.");

  await bot.start({
    onStart: (info) => {
      console.log(`Telegram bot @${info.username} is running (long polling).`);
    },
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
