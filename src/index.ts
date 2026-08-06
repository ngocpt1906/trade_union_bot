import { createBot } from "./bot/bot.js";
import { config } from "./config.js";
import { connectDb } from "./db/connection.js";

async function main(): Promise<void> {
  console.log("Connecting to MongoDB...");
  await connectDb();
  console.log("MongoDB connected.");
  console.log(`Shift epoch: ${config.shiftEpoch}`);

  const bot = createBot();
  await bot.api.deleteMyCommands();
  console.log("Telegram bot commands cleared.");

  await bot.start({
    onStart: (info) => {
      console.log(`Bot @${info.username} is running (long polling).`);
    },
  });
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
